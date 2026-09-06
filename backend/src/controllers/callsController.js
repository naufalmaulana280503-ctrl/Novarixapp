const { pool } = require('../models/db');

const getCallForParticipant = async (callId, userId) => {
  if (!Number.isInteger(callId) || callId <= 0) return null;
  const [rows] = await pool.query(
    `SELECT * FROM calls
     WHERE id = ? AND (caller_id = ? OR receiver_id = ? OR
       (group_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM group_members gm WHERE gm.group_id = calls.group_id AND gm.user_id = ?
       )))`,
    [callId, userId, userId, userId]
  );
  return rows[0] || null;
};

const initiateCall = async (req, res) => {
  try {
    const callerId = req.userId;
    const { receiverId, groupId, type } = req.body;

    if (!receiverId && !groupId) {
      return res.status(400).json({ message: 'Either receiverId or groupId is required' });
    }
    if (receiverId && (!Number.isInteger(Number(receiverId)) || Number(receiverId) === Number(callerId))) {
      return res.status(400).json({ message: 'Invalid call recipient' });
    }
    if (groupId) {
      const [members] = await pool.query(
        'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, callerId]
      );
      if (!members.length) return res.status(403).json({ message: 'Not a member of this group' });
    }
    if (receiverId) {
      const [users] = await pool.query('SELECT 1 FROM users WHERE id = ?', [receiverId]);
      if (!users.length) return res.status(404).json({ message: 'Call recipient not found' });
    }

    const validTypes = ['voice', 'video', 'screen'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid call type' });
    }

    const [result] = await pool.query(
      'INSERT INTO calls (caller_id, receiver_id, group_id, type, status) VALUES (?, ?, ?, ?, ?)',
      [callerId, receiverId || (groupId ? callerId : null), groupId || null, type, 'pending']
    );

    const [rows] = await pool.query('SELECT * FROM calls WHERE id = ?', [result.insertId]);
    const call = rows[0];

    res.status(201).json({
      id: call.id,
      callerId: call.caller_id,
      receiverId: call.receiver_id,
      groupId: call.group_id,
      type: call.type,
      status: call.status,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      durationSeconds: call.duration_seconds,
      screenRecordingUrl: call.screen_recording_url,
      createdAt: call.created_at
    });
  } catch (err) {
    console.error('Initiate call error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCallStatus = async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const { status } = req.body;

    const validStatuses = ['pending', 'ringing', 'accepted', 'rejected', 'ended', 'missed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const existing = await getCallForParticipant(callId, req.userId);
    if (!existing) return res.status(404).json({ message: 'Call not found' });
    if (status === 'accepted' && Number(existing.receiver_id) !== Number(req.userId)) {
      return res.status(403).json({ message: 'Only the recipient can accept this call' });
    }

    const updateFields = ['status = ?'];
    const params = [status];

    if (status === 'accepted') {
      updateFields.push('started_at = CURRENT_TIMESTAMP');
    }

    params.push(callId);
    await pool.query(`UPDATE calls SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query('SELECT * FROM calls WHERE id = ?', [callId]);
    const call = rows[0];

    res.json({
      id: call.id,
      callerId: call.caller_id,
      receiverId: call.receiver_id,
      groupId: call.group_id,
      type: call.type,
      status: call.status,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      durationSeconds: call.duration_seconds,
      screenRecordingUrl: call.screen_recording_url
    });
  } catch (err) {
    console.error('Update call status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const endCall = async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const { endedAt, durationSeconds, screenRecordingUrl } = req.body;

    const existing = await getCallForParticipant(callId, req.userId);
    if (!existing) return res.status(404).json({ message: 'Call not found' });
    const safeDuration = Number.isFinite(Number(durationSeconds))
      ? Math.max(0, Math.min(86400, Number(durationSeconds)))
      : null;
    const safeRecordingUrl = typeof screenRecordingUrl === 'string' &&
      screenRecordingUrl.length <= 2048 &&
      screenRecordingUrl.startsWith('/uploads/')
      ? screenRecordingUrl
      : null;
    await pool.query(
      'UPDATE calls SET status = ?, ended_at = ?, duration_seconds = ?, screen_recording_url = ? WHERE id = ?',
      ['ended', new Date(), safeDuration, safeRecordingUrl, callId]
    );

    const [rows] = await pool.query('SELECT * FROM calls WHERE id = ?', [callId]);
    const call = rows[0];

    res.json({
      id: call.id,
      callerId: call.caller_id,
      receiverId: call.receiver_id,
      groupId: call.group_id,
      type: call.type,
      status: call.status,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      durationSeconds: call.duration_seconds,
      screenRecordingUrl: call.screen_recording_url
    });
  } catch (err) {
    console.error('End call error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCallHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT c.*, u.username as caller_username, u2.username as receiver_username, g.name as group_name
       FROM calls c
       JOIN users u ON c.caller_id = u.id
       LEFT JOIN users u2 ON c.receiver_id = u2.id
       LEFT JOIN groups g ON c.group_id = g.id
       WHERE c.caller_id = ? OR c.receiver_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    res.json({
      calls: rows.map(c => ({
        id: c.id,
        callerId: c.caller_id,
        callerUsername: c.caller_username,
        receiverId: c.receiver_id,
        receiverUsername: c.receiver_username,
        groupName: c.group_name,
        groupId: c.group_id,
        type: c.type,
        status: c.status,
        startedAt: c.started_at,
        endedAt: c.ended_at,
        durationSeconds: c.duration_seconds,
        screenRecordingUrl: c.screen_recording_url,
        createdAt: c.created_at
      }))
    });
  } catch (err) {
    console.error('Get call history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { initiateCall, updateCallStatus, endCall, getCallHistory };
