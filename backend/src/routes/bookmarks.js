const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

// Toggle bookmark
router.post('/:postId/toggle', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const [existing] = await pool.query('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?', [req.userId, postId]);
    if (existing.length > 0) {
      await pool.query('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?', [req.userId, postId]);
      res.json({ bookmarked: false });
    } else {
      await pool.query('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)', [req.userId, postId]);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    console.error('Toggle bookmark error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bookmarks for user
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.verified_badge, u.is_verified,
        EXISTS (SELECT 1 FROM reactions rv WHERE rv.post_id = p.id AND rv.user_id = ? AND rv.type IN ('like','love')) AS is_loved,
        COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type IN ('like','love')), 0) AS likes_count
       FROM bookmarks b
       JOIN posts p ON b.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, req.userId, limit, offset]
    );
    res.json({ posts: rows });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if post is bookmarked
router.get('/:postId/status', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?', [req.userId, parseInt(req.params.postId)]);
    res.json({ bookmarked: existing.length > 0 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
