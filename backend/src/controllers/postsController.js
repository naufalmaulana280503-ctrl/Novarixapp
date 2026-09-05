const fs = require('fs');
const { pool } = require('../models/db');
const { computeVerifiedBadge, formatNumber } = require('./authController');
const { createNotification } = require('../routes/notifications');
const {
  toPublicMediaUrl,
  resolveStoredFilePath,
  enforcePerTypeSize,
} = require('../middleware/postUpload');

const getVideoDuration = (filePath) => {
  return new Promise((resolve) => {
    try {
      const ffprobe = require('ffprobe');
      const ffprobeStatic = require('ffprobe-static');
      ffprobe(filePath, { path: ffprobeStatic.path })
        .then((info) => {
          const duration = info.format.duration;
          resolve(duration ? Math.round(duration) : null);
        })
        .catch(() => resolve(null));
    } catch {
      resolve(null);
    }
  });
};

const parseMediaUrls = (post) => {
  if (post.media_urls) {
    try {
      const parsed = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // fall through to single media_url
    }
  }
  return post.media_url ? [post.media_url] : [];
};

const unlinkFiles = (files = []) => {
  files.forEach((file) => {
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (err) {
      console.error('Failed to remove uploaded file:', err);
    }
  });
};

const mapPost = (post) => {
  const mediaUrls = parseMediaUrls(post);
  const mappedLikes = post.likes_count != null ? Number(post.likes_count) : Number(post.likes ?? 0);
  return {
    id: post.id,
    userId: post.user_id ?? post.userId,
    authorId: post.user_id ?? post.authorId,
    username: post.username,
    displayName: post.display_name || post.displayName || post.username,
    avatarUrl: post.avatar_url || post.avatarUrl,
    caption: post.caption || post.content || '',
    mediaUrl: mediaUrls[0] || post.media_url || post.media,
    mediaUrls,
    mediaType: post.media_type || post.mediaType || 'image',
    duration: post.duration,
    width: post.width,
    height: post.height,
    fps: post.fps,
    privacy: post.privacy,
    views: post.views,
    likes: mappedLikes,
    commentsCount: post.comments_count ?? post.commentsCount ?? 0,
    sharesCount: post.shares_count ?? post.shares ?? 0,
    repostsCount: post.reposts_count ?? post.reposts ?? 0,
    createdAt: post.created_at || post.createdAt,
    verifiedBadge: computeVerifiedBadge(post),
    isVerified: post.is_verified === true || post.is_verified === 1,
    isFollowing: post.is_following === true || post.is_following === 1,
    formattedLikes: formatNumber(mappedLikes),
    isReposted: post.is_reposted === true || post.is_reposted === 1,
    isLoved: post.is_loved === true || post.is_loved === 1,
    loved: post.is_loved === true || post.is_loved === 1,
  };
};

const createPost = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: 'At least one media file is required' });
    }
    if (files.length > 10) {
      unlinkFiles(files);
      return res.status(400).json({ message: 'Maximum 10 media files allowed' });
    }

    try {
      enforcePerTypeSize(files);
    } catch (sizeErr) {
      unlinkFiles(files);
      return res.status(400).json({ message: sizeErr.message });
    }

    const { caption, content, privacy, width, height, fps, unlock_at } = req.body;
    const userId = req.userId;
    if (!userId) {
      unlinkFiles(files);
      return res.status(401).json({ message: 'User tidak terautentikasi. Silakan login ulang.' });
    }

    const finalCaption = caption ?? content ?? null;

    let users;
    try {
      [users] = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    } catch (lookupErr) {
      console.error('[createPost] Gagal lookup user:', lookupErr.message || lookupErr);
      unlinkFiles(files);
      return res.status(500).json({ message: 'Gagal memverifikasi user di database.' });
    }
    if (!users || !users.length) {
      unlinkFiles(files);
      return res.status(401).json({ message: 'Akun login tidak ditemukan di database aktif. Silakan login ulang.' });
    }

    let mediaUrls = [];
    try {
      mediaUrls = files.map((file) => toPublicMediaUrl(userId, file.filename));
    } catch (urlErr) {
      console.error('[createPost] Gagal build media URLs:', urlErr);
      unlinkFiles(files);
      return res.status(500).json({ message: 'Gagal memproses path file upload.' });
    }

    const hasVideo = files.some((file) => file.mimetype.startsWith('video/'));
    const mediaType = hasVideo ? 'video' : 'image';
    let duration = null;

    if (hasVideo) {
      try {
        const videoFile = files.find((file) => file.mimetype.startsWith('video/'));
        duration = await getVideoDuration(videoFile.path);
        if (duration && duration > 10800) {
          unlinkFiles(files);
          return res.status(400).json({ message: 'Video duration exceeds 3 hour limit (10800 seconds)' });
        }
      } catch (durationErr) {
        console.warn('[createPost] Gagal baca durasi video (abaikan):', durationErr.message || durationErr);
        duration = null;
      }
    }

    const postPrivacy = ['public', 'close_friends', 'private'].includes(privacy)
      ? privacy
      : privacy === 'close-friends'
        ? 'close_friends'
        : 'public';

    let unlockAtVal = null;
    let isLocked = false;
    if (unlock_at) {
      const parsed = new Date(unlock_at);
      if (!isNaN(parsed.getTime())) {
        unlockAtVal = parsed.toISOString();
        if (parsed.getTime() > Date.now()) isLocked = true;
      }
    }

    const safeMediaUrls = mediaUrls.length ? JSON.stringify(mediaUrls) : null;
    const safeWidth = width ? parseInt(width, 10) : null;
    const safeHeight = height ? parseInt(height, 10) : null;
    const safeFps = fps ? parseInt(fps, 10) : null;

    let result;
    try {
      [result] = await pool.query(
        'INSERT INTO posts (user_id, caption, media_url, media_urls, media_type, duration, width, height, fps, privacy, unlock_at, is_locked) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [
          userId,
          finalCaption || null,
          mediaUrls[0],
          safeMediaUrls,
          mediaType,
          duration,
          safeWidth,
          safeHeight,
          safeFps,
          postPrivacy,
          unlockAtVal,
          isLocked,
        ]
      );
    } catch (insertErr) {
      console.error('[createPost] INSERT posts GAGAL:', insertErr.message || insertErr);
      console.error('[createPost] Detail insertErr.code:', {
        code: insertErr.code,
        constraint: insertErr.constraint,
        detail: insertErr.detail,
        table: insertErr.table,
        column: insertErr.column,
      });
      unlinkFiles(files);
      return res.status(500).json({
        message: 'Gagal menyimpan postingan ke database. Detail: ' + (insertErr.message || 'unknown'),
        code: insertErr.code,
        constraint: insertErr.constraint,
      });
    }

    const newPostId = result?.insertId;
    if (!newPostId) {
      unlinkFiles(files);
      return res.status(500).json({ message: 'Gagal mendapatkan ID post setelah insert.' });
    }

    // Increment user's post count
    try {
      await pool.query('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?', [userId]);
    } catch (countErr) {
      console.warn('[createPost] Gagal update posts_count (non-fatal):', countErr.message);
    }

    let postRows;
    try {
      [postRows] = await pool.query('SELECT * FROM posts WHERE id = $1', [newPostId]);
    } catch (selectErr) {
      console.error('[createPost] SELECT post gagal:', selectErr.message || selectErr);
      return res.status(201).json({
        id: newPostId,
        userId,
        mediaUrl: mediaUrls[0],
        mediaUrls,
        mediaType,
        caption: caption || null,
        privacy: postPrivacy,
      });
    }

    if (!postRows || !postRows.length) {
      return res.status(201).json({
        id: newPostId,
        userId,
        mediaUrl: mediaUrls[0],
        mediaUrls,
        mediaType,
        caption: caption || null,
        privacy: postPrivacy,
      });
    }

    res.status(201).json(mapPost(postRows[0]));
  } catch (err) {
    console.error('[createPost] FATAL Create post error:', err);
    console.error('[createPost] err.stack:', err.stack);
    try { unlinkFiles(req.files || []); } catch (_) {}
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Server error' : (err.message || 'Server error'),
      ...(process.env.NODE_ENV !== 'production' ? { code: err.code, detail: err.detail, constraint: err.constraint, stack: err.stack } : {}),
    });
  }
};

const getFeed = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const scope = req.query.scope === 'following' ? 'following' : 'all';

    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.followers_count, u.likes_received_count, u.verified_badge, u.is_verified,
      COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type IN ('like','love')), 0) AS likes_count,
      EXISTS (SELECT 1 FROM follows fx WHERE fx.follower_id = ? AND fx.following_id = p.user_id) AS is_following,
      EXISTS (SELECT 1 FROM post_reposts pr WHERE pr.original_post_id = p.id AND pr.repost_by_user_id = ?) AS is_reposted,
      EXISTS (SELECT 1 FROM reactions rv WHERE rv.post_id = p.id AND rv.user_id = ? AND rv.type IN ('like','love')) AS is_loved
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE (
         (p.privacy = 'public')
         OR (p.user_id = ?)
       )
       AND (
         CAST(COALESCE(p.is_locked, false) AS TEXT) IN ('0', 'false')
         OR (CAST(COALESCE(p.is_locked, false) AS TEXT) IN ('1', 'true') AND (p.unlock_at IS NOT NULL AND p.unlock_at <= CURRENT_TIMESTAMP))
         OR p.user_id = ?
       )
       AND (? = 'all' OR p.user_id = ? OR EXISTS (SELECT 1 FROM follows ff WHERE ff.follower_id = ? AND ff.following_id = p.user_id))
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, userId, userId, scope, userId, userId, limit, offset]
    );

    res.json({
      posts: rows.map(mapPost),
    });
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const incrementView = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
    res.json({ message: 'View incremented' });
  } catch (err) {
    console.error('Increment view error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const sharePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    await pool.query('UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?', [postId]);
    res.json({ message: 'Share recorded' });
  } catch (err) {
    console.error('Share post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const repostPost = async (req, res) => {
  try {
    const originalPostId = parseInt(req.params.postId, 10);
    const userId = req.userId;
    const { caption } = req.body;

    const [posts] = await pool.query('SELECT * FROM posts WHERE id = ?', [originalPostId]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Original post not found' });
    }

    // Check if already reposted
    const [existingRepost] = await pool.query('SELECT id FROM post_reposts WHERE original_post_id = ? AND repost_by_user_id = ?', [originalPostId, userId]);
    if (existingRepost && existingRepost.length > 0) {
      return res.status(400).json({ message: 'Anda sudah repost postingan ini' });
    }

    const originalPost = posts[0];
    const mediaUrls = parseMediaUrls(originalPost);

    // Record repost in tracking table
    await pool.query('INSERT INTO post_reposts (original_post_id, repost_by_user_id) VALUES (?, ?)', [originalPostId, userId]);

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, caption, media_url, media_urls, media_type, duration, width, height, fps, privacy, has_reaction, reaction_post_id, watermark_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, caption || '', mediaUrls[0], JSON.stringify(mediaUrls), originalPost.media_type, originalPost.duration, originalPost.width, originalPost.height, originalPost.fps, 'public', 1, originalPostId, 1]
    );

    await pool.query('UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = ?', [originalPostId]);

    const [newPost] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId]);

    res.status(201).json(mapPost(newPost[0]));
  } catch (err) {
    console.error('Repost post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.followers_count, u.likes_received_count, u.verified_badge, u.is_verified,
      COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type IN ('like','love')), 0) AS likes_count,
      EXISTS (SELECT 1 FROM post_reposts pr WHERE pr.original_post_id = p.id AND pr.repost_by_user_id = ?) AS is_reposted,
      EXISTS (SELECT 1 FROM reactions rv WHERE rv.post_id = p.id AND rv.user_id = ? AND rv.type IN ('like','love')) AS is_loved
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?
      AND (CAST(COALESCE(p.is_locked, false) AS TEXT) IN ('0', 'false') OR (CAST(COALESCE(p.is_locked, false) AS TEXT) IN ('1', 'true') AND p.unlock_at IS NOT NULL AND p.unlock_at <= CURRENT_TIMESTAMP) OR p.user_id = ?)
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [viewerId, viewerId, userId, viewerId, limit, offset]
    );

    // Sync posts_count in users table to match actual posts count (fix stale counter)
    try {
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS real_count FROM posts WHERE user_id = ? AND (CAST(is_locked AS TEXT) IN ('0', 'false') OR (CAST(is_locked AS TEXT) IN ('1', 'true') AND unlock_at IS NOT NULL AND unlock_at <= CURRENT_TIMESTAMP))`,
        [userId]
      );
      const realCount = Number(countRow?.real_count || 0);
      await pool.query(
        `UPDATE users SET posts_count = ? WHERE id = ? AND posts_count != ?`,
        [realCount, userId, realCount]
      );
    } catch (syncErr) {
      console.warn('[getUserPosts] Gagal sync posts_count (non-fatal):', syncErr.message || syncErr);
    }

    res.json({
      posts: rows.map(mapPost),
    });
  } catch (err) {
    console.error('Get user posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const [posts] = await pool.query('SELECT media_url, media_urls FROM posts WHERE id = ? AND user_id = ?', [postId, userId]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const mediaUrls = parseMediaUrls(posts[0]);

    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);

    // Decrement user's post count
    try {
      await pool.query('UPDATE users SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = ?', [posts[0].user_id]);
    } catch (countErr) {
      console.warn('[deletePost] Gagal update posts_count (non-fatal):', countErr.message);
    }

    mediaUrls.forEach((mediaUrl) => {
      try {
        const filePath = resolveStoredFilePath(mediaUrl);
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handler Toggle Like / Unlike via posts endpoint dedicated
const toggleLike = async (req, res) => {
  try {
    const rawPostId = req.params.postId;
    const userId = req.userId;
    const action = req.method; // POST = LIKE, DELETE = UNLIKE

    // ===== VALIDASI POST ID SECARA TUNTAS =====
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

    // ===== CEK REACTION EXISTING =====
    const [existing] = await pool.query(
      'SELECT id, type FROM reactions WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );
    const hasReaction = existing.length > 0;
    const isLikeTypeBefore = hasReaction && ['like', 'love'].includes(existing[0].type);

    let finalLikes = 0;
    let finalIsLoved = false;

    if (action === 'POST') {
      // ============ LIKE (tambah) ============
      if (!hasReaction) {
        await pool.query(
          "INSERT INTO reactions (post_id, user_id, type) VALUES (?, ?, 'love')",
          [postId, userId]
        );
        await pool.query('UPDATE posts SET likes = COALESCE(likes, 0) + 1, has_reaction = TRUE WHERE id = ?', [postId]);
        // Create notification for post author
        createNotification(postAuthorId, userId, 'like', 'Menyukai postinganmu ❤️', { postId });
        if (String(postAuthorId) !== String(userId)) {
          await pool.query('UPDATE users SET likes_received_count = COALESCE(likes_received_count, 0) + 1 WHERE id = ?', [postAuthorId]);
        }
      } else if (!isLikeTypeBefore) {
        // Kalau reaction bukan love/like sebelumnya, ganti tipe + increment counter
        await pool.query("UPDATE reactions SET type = 'love' WHERE id = ?", [existing[0].id]);
        await pool.query('UPDATE posts SET likes = COALESCE(likes, 0) + 1, has_reaction = TRUE WHERE id = ?', [postId]);
        if (String(postAuthorId) !== String(userId)) {
          await pool.query('UPDATE users SET likes_received_count = COALESCE(likes_received_count, 0) + 1 WHERE id = ?', [postAuthorId]);
        }
      }
      finalIsLoved = true;
    } else if (action === 'DELETE') {
      // ============ UNLIKE (hapus, idempotent) ============
      if (hasReaction && isLikeTypeBefore) {
        await pool.query('DELETE FROM reactions WHERE id = ?', [existing[0].id]);
        await pool.query('UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ?', [postId]);
        if (String(postAuthorId) !== String(userId)) {
          await pool.query('UPDATE users SET likes_received_count = GREATEST(COALESCE(likes_received_count, 0) - 1, 0) WHERE id = ?', [postAuthorId]);
        }
      }
      // Reset has_reaction jika 0
      const [[remainingRow]] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM reactions WHERE post_id = ? AND type IN (?, ?)',
        [postId, 'like', 'love']
      );
      if (Number(remainingRow?.cnt || 0) === 0) {
        await pool.query('UPDATE posts SET has_reaction = FALSE WHERE id = ?', [postId]);
      }
      finalIsLoved = false;
    }

    // ===== SINKRONISASI: COUNT ASLI dari tabel reactions (source of truth) =====
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
      console.warn('[toggleLike] sync likes non-fatal:', syncErr.message);
      const [[fb]] = await pool.query('SELECT COALESCE(likes, 0) AS l FROM posts WHERE id = ?', [postId]);
      finalLikes = Number(fb?.l || 0);
    }

    // RESPONSE 200 SELALU dengan data valid
    res.status(200).json({
      success: true,
      postId: postId,
      likes: finalLikes,
      isLoved: finalIsLoved,
      action: action === 'POST' ? 'liked' : 'unliked',
    });
  } catch (err) {
    console.error('[toggleLike] Fatal:', err);
    res.status(500).json({ success: false, message: 'Server gagal memproses like' });
  }
};

// Handler untuk ambil daftar postingan yang di-like user (untuk tab "Disukai" di Profile)
const getLikedPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.followers_count, u.likes_received_count, u.verified_badge, u.is_verified,
      COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type IN ('like','love')), 0) AS likes_count,
      EXISTS (SELECT 1 FROM post_reposts pr WHERE pr.original_post_id = p.id AND pr.repost_by_user_id = ?) AS is_reposted,
      EXISTS (SELECT 1 FROM reactions rv WHERE rv.post_id = p.id AND rv.user_id = ? AND rv.type IN ('like','love')) AS is_loved,
      rv2.created_at AS liked_at
       FROM reactions rv2
       JOIN posts p ON rv2.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE rv2.user_id = ? AND rv2.type IN ('like','love')
       ORDER BY rv2.created_at DESC
       LIMIT ? OFFSET ?`,
      [viewerId, viewerId, userId, limit, offset]
    );

    res.json({ posts: rows.map(mapPost) });
  } catch (err) {
    console.error('Get liked posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createPost, getFeed, getUserPosts, deletePost, incrementView, sharePost, repostPost, toggleLike, getLikedPosts };
