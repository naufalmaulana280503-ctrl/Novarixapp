const { pool } = require('../models/db');

const reportContent = async (req, res) => {
  try {
    const reporterId = req.userId;
    const { targetUserId, targetPostId, targetGroupId, reason, evidenceUrls } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    if (!targetUserId && !targetPostId && !targetGroupId) {
      return res.status(400).json({ message: 'At least one target is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO reports (reporter_id, target_user_id, target_post_id, target_group_id, reason, evidence_urls) VALUES (?, ?, ?, ?, ?, ?)',
      [reporterId, targetUserId || null, targetPostId || null, targetGroupId || null, reason, evidenceUrls || null]
    );

    const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
    const report = rows[0];

    res.status(201).json({
      id: report.id,
      reporterId: report.reporter_id,
      targetUserId: report.target_user_id,
      targetPostId: report.target_post_id,
      targetGroupId: report.target_group_id,
      reason: report.reason,
      evidenceUrls: report.evidence_urls,
      status: report.status,
      moderatorId: report.moderator_id,
      actionTaken: report.action_taken,
      createdAt: report.created_at
    });
  } catch (err) {
    console.error('Report content error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getReports = async (req, res) => {
  try {
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT r.*, u.username as reporter_username, tu.username as target_username
               FROM reports r
               JOIN users u ON r.reporter_id = u.id
               LEFT JOIN users tu ON r.target_user_id = tu.id
               WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);

    res.json({
      reports: rows.map(r => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterUsername: r.reporter_username,
        targetUserId: r.target_user_id,
        targetUsername: r.target_username,
        targetPostId: r.target_post_id,
        targetGroupId: r.target_group_id,
        reason: r.reason,
        evidenceUrls: r.evidence_urls,
        status: r.status,
        moderatorId: r.moderator_id,
        actionTaken: r.action_taken,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const reviewReport = async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const moderatorId = req.userId;
    const { actionTaken } = req.body;

    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [moderatorId]);
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admin or moderator can review reports' });
    }

    const [reports] = await pool.query('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await pool.query(
      "UPDATE reports SET status = 'reviewed', moderator_id = ?, action_taken = ? WHERE id = ?",
      [moderatorId, actionTaken || 'reviewed', reportId]
    );

    res.json({ message: 'Report reviewed successfully' });
  } catch (err) {
    console.error('Review report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const runBotCheck = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = users[0];

    let flags = [];
    let isFlagged = false;

    const suspiciousPatterns = ['bot', 'test', 'xxx', '123456', 'qwerty', 'admin'];
    const lowerUsername = (user.username || '').toLowerCase();
    const lowerDisplayName = (user.display_name || '').toLowerCase();

    for (const pattern of suspiciousPatterns) {
      if (lowerUsername.includes(pattern) || lowerDisplayName.includes(pattern)) {
        flags.push('Contains suspicious pattern: ' + pattern);
        isFlagged = true;
        break;
      }
    }

    if (/^[0-9]+$/.test(user.username)) {
      flags.push('Username is all numbers');
      isFlagged = true;
    }

    const daysSinceCreation = user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    if (daysSinceCreation < 1 && user.posts_count === 0) {
      flags.push('New account with no posts');
      isFlagged = true;
    }

    const [existing] = await pool.query('SELECT id FROM bot_checks WHERE user_id = ?', [userId]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE bot_checks SET is_flagged_bot = ?, flag_reason = ?, checks_run = checks_run + 1, last_check_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [isFlagged ? 1 : 0, flags.join('; ') || null, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO bot_checks (user_id, is_flagged_bot, flag_reason, last_check_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, isFlagged ? 1 : 0, flags.join('; ') || null]
      );
    }

    res.json({
      userId,
      isFlagged,
      flags,
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Run bot check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const autoBanBots = async (req, res) => {
  try {
    const [botChecks] = await pool.query('SELECT * FROM bot_checks WHERE is_flagged_bot = 1 AND auto_banned = 0');
    let bannedCount = 0;

    for (const check of botChecks) {
      await pool.query("UPDATE users SET role = 'user', is_bot_banned = 1, bot_ban_reason = ? WHERE id = ?", [check.flag_reason, check.user_id]);
      await pool.query('UPDATE bot_checks SET auto_banned = 1 WHERE id = ?', [check.id]);
      bannedCount++;
    }

    res.json({ message: 'Auto-banned ' + bannedCount + ' bot accounts' });
  } catch (err) {
    console.error('Auto ban bots error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBotFlags = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT bc.*, u.username, u.display_name, u.email, u.created_at as user_created_at
       FROM bot_checks bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.is_flagged_bot = 1
       ORDER BY bc.last_check_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      flags: rows.map(f => ({
        id: f.id,
        userId: f.user_id,
        username: f.username,
        displayName: f.display_name,
        email: f.email,
        flagReason: f.flag_reason,
        checksRun: f.checks_run,
        autoBanned: !!f.auto_banned,
        lastCheckAt: f.last_check_at,
        userCreatedAt: f.user_created_at
      }))
    });
  } catch (err) {
    console.error('Get bot flags error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { reportContent, getReports, reviewReport, runBotCheck, autoBanBots, getBotFlags };
