const { pool } = require('../models/db');

const listGifts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price_usd, admin_fee_usd, tax_usd, creator_receive_usd, image_url, is_active FROM gifts WHERE is_active = 1 ORDER BY price_usd ASC'
    );
    res.json({
      gifts: rows.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        priceUsd: g.price_usd,
        adminFeeUsd: g.admin_fee_usd,
        taxUsd: g.tax_usd,
        creatorReceiveUsd: g.creator_receive_usd,
        imageUrl: g.image_url,
        isActive: !!g.is_active
      }))
    });
  } catch (err) {
    console.error('List gifts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendGift = async (req, res) => {
  try {
    const giftId = parseInt(req.body.giftId);
    const senderId = req.userId;
    const { receiverId, postId, commentId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    const [gifts] = await pool.query('SELECT * FROM gifts WHERE id = ? AND is_active = 1', [giftId]);
    if (gifts.length === 0) {
      return res.status(404).json({ message: 'Gift not found' });
    }
    const gift = gifts[0];

    const [result] = await pool.query(
      'INSERT INTO gift_transactions (gift_id, sender_id, receiver_id, post_id, comment_id, amount_usd, admin_fee_usd, tax_usd, creator_receive_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [giftId, senderId, receiverId, postId || null, commentId || null, gift.price_usd, gift.admin_fee_usd, gift.tax_usd, gift.creator_receive_usd]
    );

    const [rows] = await pool.query('SELECT * FROM gift_transactions WHERE id = ?', [result.insertId]);
    const transaction = rows[0];

    res.status(201).json({
      id: transaction.id,
      giftId: transaction.gift_id,
      senderId: transaction.sender_id,
      receiverId: transaction.receiver_id,
      postId: transaction.post_id,
      commentId: transaction.comment_id,
      amountUsd: transaction.amount_usd,
      adminFeeUsd: transaction.admin_fee_usd,
      taxUsd: transaction.tax_usd,
      creatorReceiveUsd: transaction.creator_receive_usd,
      createdAt: transaction.created_at
    });
  } catch (err) {
    console.error('Send gift error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getGiftTransactions = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const type = req.query.type;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let sql = 'SELECT gt.*, g.name as gift_name, g.image_url as gift_image_url, u.username as sender_username, u2.username as receiver_username FROM gift_transactions gt JOIN gifts g ON gt.gift_id = g.id JOIN users u ON gt.sender_id = u.id JOIN users u2 ON gt.receiver_id = u2.id WHERE ';
    const params = [];

    if (type === 'sent') {
      sql += 'gt.sender_id = ?';
      params.push(userId);
    } else if (type === 'received') {
      sql += 'gt.receiver_id = ?';
      params.push(userId);
    } else {
      sql += '(gt.sender_id = ? OR gt.receiver_id = ?)';
      params.push(userId, userId);
    }

    sql += ' ORDER BY gt.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);

    res.json({
      transactions: rows.map(t => ({
        id: t.id,
        giftId: t.gift_id,
        giftName: t.gift_name,
        giftImageUrl: t.gift_image_url,
        senderId: t.sender_id,
        senderUsername: t.sender_username,
        receiverId: t.receiver_id,
        receiverUsername: t.receiver_username,
        postId: t.post_id,
        commentId: t.comment_id,
        amountUsd: t.amount_usd,
        adminFeeUsd: t.admin_fee_usd,
        taxUsd: t.tax_usd,
        creatorReceiveUsd: t.creator_receive_usd,
        createdAt: t.created_at
      }))
    });
  } catch (err) {
    console.error('Get gift transactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getGiftRevenue = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [rows] = await pool.query(
      'SELECT SUM(creator_receive_usd) as total_revenue FROM gift_transactions WHERE receiver_id = ?',
      [userId]
    );
    res.json({ totalRevenue: rows[0].total_revenue || 0 });
  } catch (err) {
    console.error('Get gift revenue error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { listGifts, sendGift, getGiftTransactions, getGiftRevenue };
