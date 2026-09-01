const { pool } = require('../models/db');

const applyWatermark = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const { mediaUrl, watermarkType } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({ message: 'Media URL is required' });
    }

    const [posts] = await pool.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const [result] = await pool.query(
      'INSERT INTO watermarks (post_id, media_url, watermark_type) VALUES (?, ?, ?)',
      [postId, mediaUrl, watermarkType || 'permanent']
    );

    await pool.query('UPDATE posts SET watermark_applied = 1 WHERE id = ?', [postId]);

    const [rows] = await pool.query('SELECT * FROM watermarks WHERE id = ?', [result.insertId]);
    const watermark = rows[0];

    res.status(201).json({
      id: watermark.id,
      postId: watermark.post_id,
      mediaUrl: watermark.media_url,
      watermarkType: watermark.watermark_type,
      createdAt: watermark.created_at
    });
  } catch (err) {
    console.error('Apply watermark error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getWatermarks = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const [rows] = await pool.query(
      'SELECT * FROM watermarks WHERE post_id = ? ORDER BY created_at DESC',
      [postId]
    );

    res.json({
      watermarks: rows.map(w => ({
        id: w.id,
        postId: w.post_id,
        mediaUrl: w.media_url,
        watermarkType: w.watermark_type,
        createdAt: w.created_at
      }))
    });
  } catch (err) {
    console.error('Get watermarks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const batchWatermark = async (req, res) => {
  try {
    const { postIds } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ message: 'postIds array is required' });
    }

    const placeholders = postIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT p.id, p.media_url FROM posts p WHERE p.id IN (${placeholders})`,
      postIds
    );

    res.json({
      totalRequested: postIds.length,
      totalFound: rows.length,
      posts: rows.map(p => ({
        postId: p.id,
        mediaUrl: p.media_url,
        watermarkApplied: true
      }))
    });
  } catch (err) {
    console.error('Batch watermark error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { applyWatermark, getWatermarks, batchWatermark };
