const { pool } = require('../models/db');

const sendMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const {
      receiverId, groupId, text, voiceUrl, imageUrl, videoUrl, stickerId, replyToId,
      documentUrl, documentName, documentSize,
      locationName, latitude, longitude,
      pollId, voiceDuration,
    } = req.body;

    const hasContent = Boolean(
      text || voiceUrl || imageUrl || stickerId ||
      documentUrl || (locationName && latitude != null && longitude != null) || pollId
    );
    if (!hasContent) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!receiverId && !groupId) {
      return res.status(400).json({ message: 'Either receiverId or groupId is required' });
    }
    if (receiverId && groupId) {
      return res.status(400).json({ message: 'A message cannot target both a user and a group' });
    }
    if (receiverId) {
      const numericReceiverId = Number(receiverId);
      if (!Number.isInteger(numericReceiverId) || numericReceiverId <= 0 || numericReceiverId === Number(senderId)) {
        return res.status(400).json({ message: 'Invalid message recipient' });
      }
      const [recipients] = await pool.query('SELECT id FROM users WHERE id = ?', [numericReceiverId]);
      if (!recipients.length) return res.status(404).json({ message: 'Recipient not found' });
    }
    if (typeof text === 'string' && text.length > 10000) {
      return res.status(400).json({ message: 'Message is too long' });
    }

    if (groupId) {
      const [members] = await pool.query('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, senderId]);
      if (members.length === 0) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
    }

    if (replyToId) {
      const [replies] = await pool.query('SELECT sender_id, receiver_id, group_id FROM messages WHERE id = ?', [replyToId]);
      if (!replies.length) return res.status(400).json({ message: 'Pesan yang dibalas tidak ditemukan' });
      const reply = replies[0];
      const sameGroup = groupId && Number(reply.group_id) === Number(groupId);
      const sameDm = !groupId && !reply.group_id && ((Number(reply.sender_id) === senderId && Number(reply.receiver_id) === Number(receiverId)) || (Number(reply.sender_id) === Number(receiverId) && Number(reply.receiver_id) === senderId));
      if (!sameGroup && !sameDm) return res.status(400).json({ message: 'Pesan balasan berada di percakapan berbeda' });
    }

    const [result] = await pool.query(
      `INSERT INTO messages
      (sender_id, receiver_id, group_id, text, voice_url, image_url, video_url, sticker_id, reply_to_id,
        document_url, document_name, document_size,
        location_name, latitude, longitude,
        poll_id, voice_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        senderId, receiverId || null, groupId || null, text || null, voiceUrl || null, imageUrl || null, videoUrl || null, stickerId || null, replyToId || null,
        documentUrl || null, documentName || null, documentSize || null,
        locationName || null, latitude != null ? latitude : null, longitude != null ? longitude : null,
        pollId || null, voiceDuration || null,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    const message = rows[0];

    res.status(201).json({
      id: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      groupId: message.group_id,
      text: message.text,
      voiceUrl: message.voice_url,
      imageUrl: message.image_url,
      videoUrl: message.video_url,
      stickerId: message.sticker_id,
      replyToId: message.reply_to_id,
      documentUrl: message.document_url,
      documentName: message.document_name,
      documentSize: message.document_size,
      locationName: message.location_name,
      latitude: message.latitude,
      longitude: message.longitude,
      pollId: message.poll_id,
      voiceDuration: message.voice_duration,
      isPinned: !!message.is_pinned,
      createdAt: message.created_at,
      editedAt: message.edited_at,
      deletedAt: message.deleted_at,
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPrivateMessages = async (req, res) => {
  try {
    const userId1 = parseInt(req.params.userId1);
    const userId2 = parseInt(req.params.userId2);
    const currentUserId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (currentUserId !== userId1 && currentUserId !== userId2) {
      return res.status(403).json({ message: 'Not authorized to view these messages' });
    }

    const [rows] = await pool.query(
      `SELECT m.*, s.username as sender_username, s.display_name as sender_display_name, s.avatar_url as sender_avatar_url
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
       AND m.group_id IS NULL
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId1, userId2, userId2, userId1, limit, offset]
    );

    res.json({
      messages: rows.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderUsername: m.sender_username,
        senderDisplayName: m.sender_display_name,
        senderAvatarUrl: m.sender_avatar_url,
        receiverId: m.receiver_id,
        groupId: m.group_id,
        text: m.text,
        voiceUrl: m.voice_url,
        imageUrl: m.image_url,
        videoUrl: m.video_url,
        stickerId: m.sticker_id,
        replyToId: m.reply_to_id,
        documentUrl: m.document_url,
        documentName: m.document_name,
        documentSize: m.document_size,
        locationName: m.location_name,
        latitude: m.latitude,
        longitude: m.longitude,
        pollId: m.poll_id,
        voiceDuration: m.voice_duration,
        isPinned: !!m.is_pinned,
        createdAt: m.created_at,
        editedAt: m.edited_at,
        deletedAt: m.deleted_at,
      }))
    });
  } catch (err) {
    console.error('Get private messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const currentUserId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [members] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, currentUserId]);
    if (members.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const [rows] = await pool.query(
      `SELECT m.*, s.username as sender_username, s.display_name as sender_display_name, s.avatar_url as sender_avatar_url
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE m.group_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );

    res.json({
      messages: rows.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderUsername: m.sender_username,
        senderDisplayName: m.sender_display_name,
        senderAvatarUrl: m.sender_avatar_url,
        receiverId: m.receiver_id,
        groupId: m.group_id,
        text: m.text,
        voiceUrl: m.voice_url,
        imageUrl: m.image_url,
        videoUrl: m.video_url,
        stickerId: m.sticker_id,
        replyToId: m.reply_to_id,
        documentUrl: m.document_url,
        documentName: m.document_name,
        documentSize: m.document_size,
        locationName: m.location_name,
        latitude: m.latitude,
        longitude: m.longitude,
        pollId: m.poll_id,
        voiceDuration: m.voice_duration,
        isPinned: !!m.is_pinned,
        createdAt: m.created_at,
        editedAt: m.edited_at,
        deletedAt: m.deleted_at,
      }))
    });
  } catch (err) {
    console.error('Get group messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const pinMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const groupId = parseInt(req.params.groupId);
    const requesterId = req.userId;

    const [members] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, requesterId]);
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({ message: 'Only group owner or admin can pin messages' });
    }

    await pool.query('UPDATE messages SET is_pinned = 1 WHERE id = ? AND group_id = ?', [messageId, groupId]);
    res.json({ message: 'Message pinned' });
  } catch (err) {
    console.error('Pin message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const unpinMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const groupId = parseInt(req.params.groupId);
    const requesterId = req.userId;

    const [members] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, requesterId]);
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({ message: 'Only group owner or admin can unpin messages' });
    }

    await pool.query('UPDATE messages SET is_pinned = 0 WHERE id = ? AND group_id = ?', [messageId, groupId]);
    res.json({ message: 'Message unpinned' });
  } catch (err) {
    console.error('Unpin message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPinnedMessages = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const currentUserId = req.userId;

    const [members] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, currentUserId]);
    if (members.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const [rows] = await pool.query(
      `SELECT m.*, s.username as sender_username, s.display_name as sender_display_name, s.avatar_url as sender_avatar_url
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE m.group_id = ? AND m.is_pinned = 1
       ORDER BY m.created_at DESC`,
      [groupId]
    );

    res.json({
      messages: rows.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderUsername: m.sender_username,
        senderDisplayName: m.sender_display_name,
        senderAvatarUrl: m.sender_avatar_url,
        text: m.text,
        voiceUrl: m.voice_url,
        imageUrl: m.image_url,
        stickerId: m.sticker_id,
        replyToId: m.reply_to_id,
        documentUrl: m.document_url,
        documentName: m.document_name,
        documentSize: m.document_size,
        locationName: m.location_name,
        latitude: m.latitude,
        longitude: m.longitude,
        pollId: m.poll_id,
        voiceDuration: m.voice_duration,
        isPinned: !!m.is_pinned,
        createdAt: m.created_at,
      }))
    });
  } catch (err) {
    console.error('Get pinned messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const editMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Teks pesan wajib diisi' });
    const [result] = await pool.query('UPDATE messages SET text = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ? AND deleted_at IS NULL', [text, messageId, req.userId]);
    if (!result.changes) return res.status(404).json({ message: 'Pesan tidak ditemukan atau bukan milik kamu' });
    res.json({ id: messageId, text, editedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const [result] = await pool.query('UPDATE messages SET text = NULL, voice_url = NULL, image_url = NULL, video_url = NULL, document_url = NULL, location_name = NULL, poll_id = NULL, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ? AND deleted_at IS NULL', [messageId, req.userId]);
    if (!result.changes) return res.status(404).json({ message: 'Pesan tidak ditemukan atau bukan milik kamu' });
    res.json({ id: messageId, deletedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// compatibility helpers for frontend
const listConversations = async (req, res) => {
  try {
    const userId = req.userId;
    // find last message per conversation (where group_id is null)
    const [rows] = await pool.query(
      `WITH latest_messages AS (
        SELECT m.*,
          CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_id,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
            ORDER BY m.created_at DESC
          ) as rn
        FROM messages m
        WHERE m.group_id IS NULL AND (m.sender_id = ? OR m.receiver_id = ?)
      )
      SELECT lm.*, u.username as other_username, u.display_name as other_display_name, u.avatar_url as other_avatar
      FROM latest_messages lm
      JOIN users u ON lm.other_id = u.id
      WHERE lm.rn = 1
      ORDER BY lm.created_at DESC`,
      [userId, userId, userId, userId]
    );

    const conversations = rows.map(r => ({
      userId: r.other_id,
      displayName: r.other_display_name,
      avatarUrl: r.other_avatar,
      lastMessage: r.text || r.sticker_id || null,
      unreadCount: 0 // can be implemented later
    }));

    res.json({ conversations });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { userId: targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ message: 'userId is required' });
    const [users] = await pool.query('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?', [targetUserId]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    const other = users[0];
    // return a lightweight conversation object
    res.status(201).json({ userId: other.id, displayName: other.display_name, avatarUrl: other.avatar_url });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMessagesWithUser = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const targetUserId = parseInt(req.params.targetUserId);
    const [rows] = await pool.query(
      `SELECT m.*, s.username as sender_username, s.display_name as sender_display_name, s.avatar_url as sender_avatar_url
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
       AND m.group_id IS NULL
       ORDER BY m.created_at DESC
       LIMIT 200`,
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );

    res.json({ messages: rows.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderUsername: m.sender_username,
      senderDisplayName: m.sender_display_name,
      senderAvatarUrl: m.sender_avatar_url,
      receiverId: m.receiver_id,
      groupId: m.group_id,
      text: m.text,
      videoUrl: m.video_url,
      voiceUrl: m.voice_url,
      imageUrl: m.image_url,
      stickerId: m.sticker_id,
      replyToId: m.reply_to_id,
      documentUrl: m.document_url,
      documentName: m.document_name,
      documentSize: m.document_size,
      locationName: m.location_name,
      latitude: m.latitude,
      longitude: m.longitude,
      pollId: m.poll_id,
      voiceDuration: m.voice_duration,
      isPinned: !!m.is_pinned,
      createdAt: m.created_at,
    })) });
  } catch (err) {
    console.error('Get messages with user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendMessage, getPrivateMessages, getGroupMessages, pinMessage, unpinMessage, getPinnedMessages, editMessage, deleteMessage, listConversations, createConversation, getMessagesWithUser };
