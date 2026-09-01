const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// simple search endpoint for users (by username or display name)
router.get('/search', authenticate, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ users: [] });
    const { pool } = require('../models/db');
    const like = `%${q.replace(/%/g, '')}%`;
    const [rows] = await pool.query(`SELECT id, username, display_name, avatar_url FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 30`, [like, like]);
    const users = rows.map(u => ({ id: u.id, username: u.username, displayName: u.display_name, avatarUrl: u.avatar_url }));
    res.json({ users });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/settings', authenticate, async (req, res) => {
  try {
    const { pool } = require('../models/db');
    const [rows] = await pool.query('SELECT app_settings FROM users WHERE id = ?', [req.userId]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    let settings = {};
    try { settings = typeof rows[0].app_settings === 'object' ? (rows[0].app_settings || {}) : (rows[0].app_settings ? JSON.parse(rows[0].app_settings) : {}); } catch (_) {}
    res.json({ settings });
  } catch (err) {
    console.error('Get user settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/settings', authenticate, async (req, res) => {
  try {
    const { pool } = require('../models/db');
    const allowed = ['appearance', 'anti_spy', 'mode_offline', 'language'];
    const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    const [rows] = await pool.query('SELECT app_settings FROM users WHERE id = ?', [req.userId]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    let current = {};
    try { current = typeof rows[0].app_settings === 'object' ? (rows[0].app_settings || {}) : (rows[0].app_settings ? JSON.parse(rows[0].app_settings) : {}); } catch (_) {}
    const settings = { ...current, ...patch };
    await pool.query('UPDATE users SET app_settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(settings), req.userId]);
    res.json({ settings });
  } catch (err) {
    console.error('Update user settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/following', authenticate, async (req, res) => {
  try {
    const targetId = Number.parseInt(req.params.id, 10);
    const [rows] = await require('../models/db').pool.query('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [req.userId, targetId]);
    res.json({ following: rows.length > 0 });
  } catch (err) {
    console.error('Following status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const targetId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(targetId) || targetId === req.userId) return res.status(400).json({ message: 'Invalid follow target' });
    const { pool } = require('../models/db');
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [targetId]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.userId, targetId]);
    await pool.query('UPDATE users SET following_count = following_count + 1 WHERE id = ?', [req.userId]);
    await pool.query('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [targetId]);
    res.status(201).json({ following: true });
  } catch (err) {
    if (/unique|duplicate/i.test(err.message)) return res.json({ following: true });
    console.error('Follow user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/follow', authenticate, async (req, res) => {
  try {
    const targetId = Number.parseInt(req.params.id, 10);
    const { pool } = require('../models/db');
    const [result] = await pool.query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.userId, targetId]);
    if (result.changes) {
      await pool.query('UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?', [req.userId]);
      await pool.query('UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?', [targetId]);
    }
    res.json({ following: false });
  } catch (err) {
    console.error('Unfollow user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const getRelationshipList = async (req, res, direction) => {
  try {
    const targetId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(targetId)) return res.status(400).json({ message: 'Invalid user id' });
    const column = direction === 'followers' ? 'f.following_id' : 'f.follower_id';
    const otherColumn = direction === 'followers' ? 'f.follower_id' : 'f.following_id';
    const { pool } = require('../models/db');
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
        EXISTS (SELECT 1 FROM follows mine WHERE mine.follower_id = ? AND mine.following_id = u.id) AS following
       FROM follows f JOIN users u ON u.id = ${otherColumn}
       WHERE ${column} = ? ORDER BY u.display_name, u.username`,
      [req.userId, targetId]
    );
    res.json({ users: rows.map((user) => ({ id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url, following: user.following === true || user.following === 1 })) });
  } catch (err) {
    console.error(`List ${direction} error:`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/:id/followers', authenticate, (req, res) => getRelationshipList(req, res, 'followers'));
router.get('/:id/following-list', authenticate, (req, res) => getRelationshipList(req, res, 'following'));

router.post('/:id/block', authenticate, async (req, res) => {
  try {
    const targetId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(targetId) || targetId === req.userId) return res.status(400).json({ message: 'Invalid block target' });
    const { pool } = require('../models/db');
    const [rows] = await pool.query('SELECT app_settings FROM users WHERE id = ?', [req.userId]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    let settings = {};
    try { settings = rows[0].app_settings ? JSON.parse(rows[0].app_settings) : {}; } catch (_) {}
    const blocked = Array.from(new Set([...(settings.blocked_user_ids || []).map(Number), targetId]));
    settings.blocked_user_ids = blocked;
    await pool.query('UPDATE users SET app_settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(settings), req.userId]);
    await pool.query('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', [req.userId, targetId, targetId, req.userId]);
    res.json({ blocked: true });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// update mood/vibe for the authenticated user
router.post('/:id/vibe', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (parseInt(id) !== userId) return res.status(403).json({ message: 'Forbidden' });
    const { current_mood, vibe_color } = req.body;
    await require('../models/db').pool.query('UPDATE users SET current_mood = ?, vibe_color = ? WHERE id = ?', [current_mood || null, vibe_color || null, userId]);
    res.json({ message: 'Vibe updated' });
  } catch (err) {
    console.error('Update vibe error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// user profile lookup
router.get('/:username', authenticate, async (req, res) => {
  const { pool } = require('../models/db');
  const { computeVerifiedBadge, formatNumber } = require('../controllers/authController');
  try {
    const [users] = await pool.query('SELECT id, email, username, display_name, avatar_url, bio, email_confirmed, followers_count, following_count, posts_count, likes_received_count, verified_badge, is_verified, current_mood, vibe_color, verified_tier, created_at FROM users WHERE username = ?', [req.params.username]);
    const user = users[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compute real-time post count from posts table (posts_count may be stale)
    let realPostsCount = user.posts_count || 0;
    try {
      const [countRows] = await pool.query('SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?', [user.id]);
      if (countRows && countRows[0]) {
        realPostsCount = countRows[0].cnt || 0;
        // Sync the stale counter
        if (realPostsCount !== user.posts_count) {
          pool.query('UPDATE users SET posts_count = ? WHERE id = ?', [realPostsCount, user.id]).catch(() => {});
        }
      }
    } catch (countErr) {
      // Non-fallback to posts_count from users table
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        emailConfirmed: user.email_confirmed,
        verifiedBadge: computeVerifiedBadge(user),
        verifiedTier: user.verified_tier,
        isVerified: user.is_verified,
        followersCount: user.followers_count,
        followingCount: user.following_count,
        postsCount: realPostsCount,
        likesReceived: user.likes_received_count,
        currentMood: user.current_mood,
        vibeColor: user.vibe_color,
        formattedFollowers: formatNumber(user.followers_count),
        formattedFollowing: formatNumber(user.following_count),
        formattedPosts: formatNumber(realPostsCount),
        formattedLikes: formatNumber(user.likes_received_count),
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
