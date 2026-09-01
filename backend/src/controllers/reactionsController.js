const { pool } = require('../models/db');

const addReaction = async (req, res) => {
  try {
    // ===== VALIDASI POST ID TUNTAS =====
    const rawPostId = req.params.postId;
    if (rawPostId === undefined || rawPostId === null || String(rawPostId).trim() === '') {
      return res.status(400).json({ success: false, message: 'Post ID tidak boleh kosong' });
    }
    const postId = parseInt(rawPostId, 10);
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ success: false, message: 'Format Post ID tidak valid' });
    }
    const [postCheck] = await pool.query('SELECT id, user_id AS postAuthorId FROM posts WHERE id = ?', [postId]);
    if (!postCheck || postCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan' });
    }
    const postAuthorId = postCheck[0].postAuthorId;
    const userId = req.userId;
    const { type, reactionMediaUrl } = req.body;

    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'duet', 'react_video'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction type' });
    }
    const isLikeType = ['like', 'love'].includes(type);

    const [existing] = await pool.query('SELECT id, type FROM reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
    const wasLikeTypeBefore = existing.length > 0 && ['like', 'love'].includes(existing[0].type);
    let likesDelta = 0;

    if (existing.length > 0) {
      // Update reaction yang sudah ada
      await pool.query('UPDATE reactions SET type = ?, reaction_media_url = ? WHERE id = ?', [type, reactionMediaUrl || null, existing[0].id]);
      if (isLikeType && !wasLikeTypeBefore) likesDelta = +1;
      else if (!isLikeType && wasLikeTypeBefore) likesDelta = -1;
    } else {
      // Insert reaction baru
      await pool.query(
        'INSERT INTO reactions (post_id, user_id, type, reaction_media_url) VALUES (?, ?, ?, ?)',
        [postId, userId, type, reactionMediaUrl || null]
      );
      if (isLikeType) likesDelta = +1;
    }

    // Apply delta counter likes posts + users.likes_received_count
    if (likesDelta !== 0) {
      if (likesDelta > 0) {
        await pool.query('UPDATE posts SET likes = COALESCE(likes, 0) + 1, has_reaction = TRUE WHERE id = ?', [postId]);
        if (String(postAuthorId) !== String(userId)) {
          await pool.query('UPDATE users SET likes_received_count = COALESCE(likes_received_count, 0) + 1 WHERE id = ?', [postAuthorId]);
        }
      } else {
        await pool.query('UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ?', [postId]);
        if (String(postAuthorId) !== String(userId)) {
          await pool.query('UPDATE users SET likes_received_count = GREATEST(COALESCE(likes_received_count, 0) - 1, 0) WHERE id = ?', [postAuthorId]);
        }
      }
    } else if (isLikeType) {
      await pool.query('UPDATE posts SET has_reaction = TRUE WHERE id = ?', [postId]);
    }

    // ===== SINKRONISASI COUNT ASLI =====
    let finalLikes = 0;
    try {
      const [[countRow]] = await pool.query(
        'SELECT COUNT(*) AS real_count FROM reactions WHERE post_id = ? AND type IN (?, ?)',
        [postId, 'like', 'love']
      );
      const realCount = Number(countRow?.real_count || 0);
      await pool.query(
        'UPDATE posts SET likes = ? WHERE id = ? AND COALESCE(likes, 0) != ?',
        [realCount, postId, realCount]
      );
      finalLikes = realCount;
    } catch (syncErr) {
      console.warn('[addReaction] sync non-fatal:', syncErr.message);
      const [[fb]] = await pool.query('SELECT COALESCE(likes, 0) AS l FROM posts WHERE id = ?', [postId]);
      finalLikes = Number(fb?.l || 0);
    }

    const [rows] = await pool.query('SELECT * FROM reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
    const reaction = rows[0];

    // RESPONSE 200 dengan data terbaru
    res.status(200).json({
      success: true,
      id: reaction.id,
      postId: reaction.post_id,
      userId: reaction.user_id,
      type: reaction.type,
      reactionMediaUrl: reaction.reaction_media_url,
      createdAt: reaction.created_at,
      likes: finalLikes,
      isLoved: ['like', 'love'].includes(reaction.type),
    });
  } catch (err) {
    console.error('Add reaction error:', err);
    res.status(500).json({ success: false, message: 'Server error saat menambah reaction' });
  }
};

const removeReaction = async (req, res) => {
  try {
    // ===== VALIDASI POST ID TUNTAS =====
    const rawPostId = req.params.postId;
    if (rawPostId === undefined || rawPostId === null || String(rawPostId).trim() === '') {
      return res.status(400).json({ success: false, message: 'Post ID tidak boleh kosong' });
    }
    const postId = parseInt(rawPostId, 10);
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ success: false, message: 'Format Post ID tidak valid' });
    }
    const [postCheck] = await pool.query('SELECT id, user_id AS postAuthorId FROM posts WHERE id = ?', [postId]);
    if (!postCheck || postCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan' });
    }
    const postAuthorId = postCheck[0].postAuthorId;
    const userId = req.userId;

    const [existing] = await pool.query('SELECT id, type FROM reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
    const hasReaction = existing.length > 0;
    const wasLikeType = hasReaction && ['like', 'love'].includes(existing[0].type);

    if (hasReaction) {
      await pool.query('DELETE FROM reactions WHERE id = ?', [existing[0].id]);
      if (wasLikeType) {
        await pool.query('UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ?', [postId]);
        if (String(postAuthorId) !== String(userId)) {
          await pool.query('UPDATE users SET likes_received_count = GREATEST(COALESCE(likes_received_count, 0) - 1, 0) WHERE id = ?', [postAuthorId]);
        }
      }
    }

    // Reset has_reaction jika sisa 0
    const [[remainingRow]] = await pool.query('SELECT COUNT(*) AS cnt FROM reactions WHERE post_id = ?', [postId]);
    if (Number(remainingRow?.cnt || 0) === 0) {
      await pool.query('UPDATE posts SET has_reaction = FALSE WHERE id = ?', [postId]);
    }

    // ===== SINKRONISASI COUNT ASLI =====
    let finalLikes = 0;
    try {
      const [[countRow]] = await pool.query(
        'SELECT COUNT(*) AS real_count FROM reactions WHERE post_id = ? AND type IN (?, ?)',
        [postId, 'like', 'love']
      );
      const realCount = Number(countRow?.real_count || 0);
      await pool.query(
        'UPDATE posts SET likes = ? WHERE id = ? AND COALESCE(likes, 0) != ?',
        [realCount, postId, realCount]
      );
      finalLikes = realCount;
    } catch (syncErr) {
      console.warn('[removeReaction] sync non-fatal:', syncErr.message);
      const [[fb]] = await pool.query('SELECT COALESCE(likes, 0) AS l FROM posts WHERE id = ?', [postId]);
      finalLikes = Number(fb?.l || 0);
    }

    // Idempotent: response 200 SELALU, tidak error 404 jika tidak ada reaction
    res.status(200).json({
      success: true,
      message: hasReaction ? 'Reaction removed' : 'No reaction to remove',
      postId: postId,
      likes: finalLikes,
      isLoved: false,
    });
  } catch (err) {
    console.error('Remove reaction error:', err);
    res.status(500).json({ success: false, message: 'Server error saat menghapus reaction' });
  }
};

const getReactions = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const [rows] = await pool.query(
      `SELECT r.*, u.username, u.display_name, u.avatar_url
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.post_id = ?
       ORDER BY r.created_at DESC`,
      [postId]
    );

    res.json({
      reactions: rows.map(r => ({
        id: r.id,
        postId: r.post_id,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        type: r.type,
        reactionMediaUrl: r.reaction_media_url,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.error('Get reactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createDuetOrReact = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.userId;
    const { reactionMediaUrl, type, caption } = req.body;

    const validTypes = ['duet', 'react_video'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use duet or react_video' });
    }

    const [posts] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Original post not found' });
    }
    const originalPost = posts[0];

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, caption, media_url, media_type, duration, width, height, fps, has_reaction, reaction_post_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, caption || '', originalPost.media_url, originalPost.media_type, originalPost.duration, originalPost.width, originalPost.height, originalPost.fps, 1, postId]
    );

    await pool.query('UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = ?', [postId]);

    const [newPost] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId]);

    res.status(201).json({
      id: newPost[0].id,
      userId: newPost[0].user_id,
      caption: newPost[0].caption,
      mediaUrl: newPost[0].media_url,
      mediaType: newPost[0].media_type,
      duration: newPost[0].duration,
      width: newPost[0].width,
      height: newPost[0].height,
      fps: newPost[0].fps,
      hasReaction: !!newPost[0].has_reaction,
      reactionPostId: newPost[0].reaction_post_id,
      views: newPost[0].views,
      likes: newPost[0].likes,
      createdAt: newPost[0].created_at
    });
  } catch (err) {
    console.error('Create duet/react error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { addReaction, removeReaction, getReactions, createDuetOrReact };
