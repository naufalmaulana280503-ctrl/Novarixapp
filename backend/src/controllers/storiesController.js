const fs = require('fs');
const { pool } = require('../models/db');
const { toPublicMediaUrl } = require('../middleware/postUpload');
const { computeVerifiedBadge, formatNumber } = require('./authController');

const getVideoDuration = (filePath) => {
  return new Promise((resolve) => {
    try {
      const ffprobe = require('ffprobe');
      const ffprobeStatic = require('ffprobe-static');
      ffprobe(filePath, { path: ffprobeStatic.path })
        .then((info) => {
          const duration = info.format.duration;
          resolve(duration ? Math.round(duration) : 15);
        })
        .catch(() => resolve(15));
    } catch {
      resolve(15);
    }
  });
};

const mapStory = (story) => ({
  id: story.id,
  userId: story.user_id,
  username: story.username,
  displayName: story.display_name,
  avatarUrl: story.avatar_url,
  mediaUrl: story.media_url,
  mediaType: story.media_type,
  caption: story.caption,
  durationSeconds: story.duration_seconds || 15,
  viewsCount: story.views_count || 0,
  createdAt: story.created_at,
  expiresAt: story.expires_at,
  verifiedBadge: computeVerifiedBadge(story),
  isVerified: story.is_verified,
});

const uploadStory = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Media file required' });
    }

    const userId = req.userId;
    if (!userId) {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(401).json({ message: 'User tidak terautentikasi' });
    }

    // Get user info
    const [users] = await pool.query('SELECT id, username, display_name, avatar_url, is_verified FROM users WHERE id = $1', [userId]);
    if (!users || !users.length) {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(401).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    const { caption, mediaType } = req.body;
    const isBoomerang = mediaType === 'boomerang';
    const mediaUrl = toPublicMediaUrl(userId, file.filename);
    
    let duration = 15;
    if (file.mimetype.startsWith('video/')) {
      duration = await getVideoDuration(file.path);
    }
    
    // Boomerang videos are max 1 second
    if (isBoomerang && duration > 1) {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Boomerang videos harus <= 1 detik' });
    }

    // Stories expire in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO stories (user_id, media_url, media_type, caption, duration_seconds, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, mediaUrl, isBoomerang ? 'boomerang' : (file.mimetype.startsWith('video/') ? 'video' : 'image'), caption || null, duration, expiresAt]
    );

    const storyId = result.insertId || result[0]?.id;
    const story = await (async () => {
      const [rows] = await pool.query(
        `SELECT s.*, u.username, u.display_name, u.avatar_url, u.is_verified 
         FROM stories s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = $1`,
        [storyId]
      );
      return rows?.[0];
    })();

    res.json({ message: 'Story uploaded successfully', story: story ? mapStory(story) : null });
  } catch (err) {
    console.error('[uploadStory] Error:', err);
    res.status(500).json({ message: 'Gagal upload story' });
  }
};

const getStoriesFeed = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User tidak terautentikasi' });
    }

    // Get stories from users being followed + own stories (within 24 hours)
    const [stories] = await pool.query(
      `SELECT s.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) as views_count
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > NOW() 
         AND (s.user_id = $1 OR s.user_id IN (
           SELECT following_id FROM follows WHERE follower_id = $1
         ))
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(stories.map(mapStory));
  } catch (err) {
    console.error('[getStoriesFeed] Error:', err);
    res.status(500).json({ message: 'Gagal fetch stories' });
  }
};

const getUserStories = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId;

    if (!targetUserId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    // Get user's stories (within 24 hours)
    const [stories] = await pool.query(
      `SELECT s.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) as views_count
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1 AND s.expires_at > NOW()
       ORDER BY s.created_at DESC`,
      [targetUserId]
    );

    // If requesting own stories, include view information
    const mappedStories = stories.map((story) => {
      const mapped = mapStory(story);
      if (String(story.user_id) === String(currentUserId)) {
        mapped.viewsCount = story.views_count || 0;
      }
      return mapped;
    });

    res.json(mappedStories);
  } catch (err) {
    console.error('[getUserStories] Error:', err);
    res.status(500).json({ message: 'Gagal fetch user stories' });
  }
};

const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.userId;

    if (!storyId) {
      return res.status(400).json({ message: 'Story ID required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'User tidak terautentikasi' });
    }

    // Check if story exists
    const [storyCheck] = await pool.query('SELECT id FROM stories WHERE id = $1', [storyId]);
    if (!storyCheck || !storyCheck.length) {
      return res.status(404).json({ message: 'Story tidak ditemukan' });
    }

    // Insert view (ignore if already viewed by same user)
    try {
      await pool.query(
        `INSERT INTO story_views (story_id, viewer_id) VALUES ($1, $2)`,
        [storyId, userId]
      );
    } catch (err) {
      // Ignore duplicate view error
      if (!/duplicate|unique/i.test(err.message)) throw err;
    }

    // Update view count
    const [updateResult] = await pool.query(
      `UPDATE stories SET views_count = (SELECT COUNT(*) FROM story_views WHERE story_id = $1) WHERE id = $1`,
      [storyId]
    );

    res.json({ message: 'Story viewed', success: true });
  } catch (err) {
    console.error('[viewStory] Error:', err);
    res.status(500).json({ message: 'Gagal record story view' });
  }
};

const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.userId;

    if (!storyId) {
      return res.status(400).json({ message: 'Story ID required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'User tidak terautentikasi' });
    }

    // Verify story ownership
    const [storyCheck] = await pool.query('SELECT user_id FROM stories WHERE id = $1', [storyId]);
    if (!storyCheck || !storyCheck.length) {
      return res.status(404).json({ message: 'Story tidak ditemukan' });
    }

    if (Number(storyCheck[0].user_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Tidak bisa lihat viewers story orang lain' });
    }

    // Get story viewers with user info
    const [viewers] = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, sv.viewed_at
       FROM story_views sv
       JOIN users u ON sv.viewer_id = u.id
       WHERE sv.story_id = $1
       ORDER BY sv.viewed_at DESC`,
      [storyId]
    );

    res.json({
      totalViews: viewers.length,
      viewers: viewers.map((v) => ({
        id: v.id,
        username: v.username,
        displayName: v.display_name,
        avatarUrl: v.avatar_url,
        isVerified: v.is_verified,
        viewedAt: v.viewed_at,
      })),
    });
  } catch (err) {
    console.error('[getStoryViewers] Error:', err);
    res.status(500).json({ message: 'Gagal fetch story viewers' });
  }
};

const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.userId;

    if (!storyId) {
      return res.status(400).json({ message: 'Story ID required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'User tidak terautentikasi' });
    }

    // Verify story ownership
    const [storyCheck] = await pool.query('SELECT id, user_id, media_url FROM stories WHERE id = $1', [storyId]);
    if (!storyCheck || !storyCheck.length) {
      return res.status(404).json({ message: 'Story tidak ditemukan' });
    }

    if (Number(storyCheck[0].user_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Hanya pemilik bisa hapus story' });
    }

    // Delete story (cascade will delete views)
    await pool.query('DELETE FROM stories WHERE id = $1', [storyId]);

    res.json({ message: 'Story deleted successfully' });
  } catch (err) {
    console.error('[deleteStory] Error:', err);
    res.status(500).json({ message: 'Gagal delete story' });
  }
};

module.exports = {
  uploadStory,
  getStoriesFeed,
  getUserStories,
  viewStory,
  getStoryViewers,
  deleteStory,
};
