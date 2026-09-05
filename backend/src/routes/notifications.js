const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

// Get notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT n.*, 
        u.username as actor_username, u.display_name as actor_display_name, u.avatar_url as actor_avatar_url,
        CASE WHEN n.post_id IS NOT NULL THEN p.media_url ELSE NULL END as post_media_url
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       LEFT JOIN posts p ON n.post_id = p.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, limit, offset]
    );
    res.json({ notifications: rows.map(n => ({
      id: n.id, type: n.type, message: n.message,
      actor: { id: n.actor_id, username: n.actor_username, displayName: n.actor_display_name, avatarUrl: n.actor_avatar_url },
      postId: n.post_id, postMediaUrl: n.post_media_url,
      commentId: n.comment_id, groupId: n.group_id,
      isRead: n.is_read, createdAt: n.created_at,
    }))});
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.userId]);
    res.json({ count: parseInt(rows[0]?.count || 0) });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark as read
router.post('/read', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ANY($1::int[]) AND user_id = $2', [notificationIds, req.userId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all as read
router.post('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper: create notification (called by other controllers)
const createNotification = async (userId, actorId, type, message, extra = {}) => {
  try {
    if (userId === actorId) return; // don't notify yourself
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, message, post_id, comment_id, group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, actorId, type, message, extra.postId || null, extra.commentId || null, extra.groupId || null]
    );
  } catch (err) {
    console.warn('[Notification] Failed to create:', err.message);
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
