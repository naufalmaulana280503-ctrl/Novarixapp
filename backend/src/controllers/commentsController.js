const { pool } = require('../models/db');
const { createNotification } = require('../routes/notifications');

const listComments = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url,
       (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.is_pinned DESC, c.created_at ASC
       LIMIT ? OFFSET ?`,
      [postId, limit, offset]
    );

    res.json({
      comments: rows.map(c => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        username: c.username,
        displayName: c.display_name,
        avatarUrl: c.avatar_url,
        parentId: c.parent_id,
        text: c.text,
        voiceUrl: c.voice_url,
        imageUrl: c.image_url,
        stickerId: c.sticker_id,
        giftStickerId: c.gift_sticker_id,
        isPinned: !!c.is_pinned,
        likes: c.likes_count,
        createdAt: c.created_at
      }))
    });
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createComment = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.userId;
    const { text, voiceUrl, imageUrl, stickerId, giftStickerId, parentId } = req.body;

    if (!text && !voiceUrl && !imageUrl && !stickerId && !giftStickerId) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, parent_id, text, voice_url, image_url, sticker_id, gift_sticker_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [postId, userId, parentId || null, text || null, voiceUrl || null, imageUrl || null, stickerId || null, giftStickerId || null]
    );

    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    );
    const comment = rows[0];

    await pool.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);
    // Notify post author
    const [postAuthor] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (postAuthor.length > 0) {
      createNotification(postAuthor[0].user_id, userId, 'comment', 'Mengomentari postinganmu 💬', { postId, commentId: result.insertId });
    }

    res.status(201).json({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      username: comment.username,
      displayName: comment.display_name,
      avatarUrl: comment.avatar_url,
      parentId: comment.parent_id,
      text: comment.text,
      voiceUrl: comment.voice_url,
      imageUrl: comment.image_url,
      stickerId: comment.sticker_id,
      giftStickerId: comment.gift_sticker_id,
      isPinned: !!comment.is_pinned,
      likes: comment.likes,
      createdAt: comment.created_at
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const pinComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const postId = parseInt(req.params.postId);
    const userId = req.userId;

    const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    const isOwner = posts[0].user_id === userId;
    const isAdmin = users.length > 0 && (users[0].role === 'admin' || users[0].role === 'moderator');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only post owner or admin can pin comments' });
    }

    await pool.query('UPDATE comments SET is_pinned = 1 WHERE id = ?', [commentId]);
    res.json({ message: 'Comment pinned successfully' });
  } catch (err) {
    console.error('Pin comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const likeComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.userId;

    const [existing] = await pool.query('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
    if (existing.length > 0) {
      await pool.query('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
      await pool.query('UPDATE comments SET likes = likes - 1 WHERE id = ?', [commentId]);
      return res.json({ message: 'Comment unliked', liked: false });
    }

    await pool.query('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId]);
    await pool.query('UPDATE comments SET likes = likes + 1 WHERE id = ?', [commentId]);
    res.json({ message: 'Comment liked', liked: true });
  } catch (err) {
    console.error('Like comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.userId;

    const [comments] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    const comment = comments[0];

    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    const isOwner = comment.user_id === userId;
    const isAdmin = users.length > 0 && (users[0].role === 'admin' || users[0].role === 'moderator');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
    await pool.query('UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?', [comment.post_id]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handler EDIT KOMENTAR (PATCH) - hanya pemilik komentar yang bisa edit
const updateComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.userId;
    const { text, voiceUrl, imageUrl, stickerId, giftStickerId } = req.body;

    // Validasi ID dan konten
    if (isNaN(commentId) || commentId <= 0) {
      return res.status(400).json({ success: false, message: 'Comment ID tidak valid' });
    }
    if (!text && !voiceUrl && !imageUrl && !stickerId && !giftStickerId) {
      return res.status(400).json({ success: false, message: 'Konten komentar tidak boleh kosong' });
    }
    if (typeof text === 'string' && text.trim().length === 0 && !voiceUrl && !imageUrl && !stickerId && !giftStickerId) {
      return res.status(400).json({ success: false, message: 'Komentar tidak boleh hanya spasi' });
    }

    const [comments] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ success: false, message: 'Komentar tidak ditemukan' });
    }
    const comment = comments[0];

    // Otorisasi: hanya pemilik komentar yang bisa edit (admin/mod tidak boleh edit konten user)
    if (String(comment.user_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Hanya pembuat komentar yang bisa mengedit' });
    }

    // Lakukan update (hanya kolom konten yang diizinkan berubah)
    await pool.query(
      `UPDATE comments
       SET text = ?, voice_url = ?, image_url = ?, sticker_id = ?, gift_sticker_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        text ?? comment.text,
        voiceUrl ?? comment.voice_url,
        imageUrl ?? comment.image_url,
        stickerId ?? comment.sticker_id,
        giftStickerId ?? comment.gift_sticker_id,
        commentId
      ]
    );

    // Ambil data komentar terbaru setelah update
    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url,
       (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
       FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [commentId]
    );
    const updated = rows[0];

    res.status(200).json({
      success: true,
      id: updated.id,
      postId: updated.post_id,
      userId: updated.user_id,
      username: updated.username,
      displayName: updated.display_name,
      avatarUrl: updated.avatar_url,
      parentId: updated.parent_id,
      text: updated.text,
      voiceUrl: updated.voice_url,
      imageUrl: updated.image_url,
      stickerId: updated.sticker_id,
      giftStickerId: updated.gift_sticker_id,
      isPinned: !!updated.is_pinned,
      likes: updated.likes_count,
      createdAt: updated.created_at,
      editedAt: updated.updated_at,
      isEdited: true,
    });
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengedit komentar' });
  }
};

module.exports = { listComments, createComment, pinComment, likeComment, deleteComment, updateComment };
