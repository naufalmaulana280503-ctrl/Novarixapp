const { pool } = require('../models/db');

const listStickers = async (req, res) => {
  try {
    const { packName, isGift } = req.query;
    let sql = 'SELECT id, name, pack_name, image_url, is_gift, price_usd, created_at FROM stickers WHERE 1=1';
    const params = [];

    if (packName) {
      sql += ' AND pack_name = ?';
      params.push(packName);
    }
    if (isGift !== undefined) {
      const giftVal = isGift === 'true' ? 1 : 0;
      sql += ' AND is_gift = ?';
      params.push(giftVal);
    }

    const [rows] = await pool.query(sql, params);
    res.json({
      stickers: rows.map(s => ({
        id: s.id,
        name: s.name,
        packName: s.pack_name,
        imageUrl: s.image_url,
        isGift: !!s.is_gift,
        priceUsd: s.price_usd,
        createdAt: s.created_at
      }))
    });
  } catch (err) {
    console.error('List stickers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const acquireSticker = async (req, res) => {
  try {
    const userId = req.userId;
    const stickerId = parseInt(req.body.stickerId);
    const priceUsd = parseFloat(req.body.priceUsd) || 0;

    const [stickers] = await pool.query('SELECT id, name, image_url FROM stickers WHERE id = ?', [stickerId]);
    if (stickers.length === 0) {
      return res.status(404).json({ message: 'Sticker not found' });
    }

    const [existing] = await pool.query('SELECT id FROM user_stickers WHERE user_id = ? AND sticker_id = ?', [userId, stickerId]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Sticker already acquired' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await pool.query('INSERT INTO user_stickers (user_id, sticker_id) VALUES (?, ?)', [userId, stickerId]);

    const [rows] = await pool.query('SELECT * FROM user_stickers WHERE user_id = ? AND sticker_id = ?', [userId, stickerId]);
    const userSticker = rows[0];

    res.status(201).json({
      id: userSticker.id,
      userId: userSticker.user_id,
      stickerId: userSticker.sticker_id,
      acquiredAt: userSticker.acquired_at
    });
  } catch (err) {
    console.error('Acquire sticker error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserStickers = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [rows] = await pool.query(
      `SELECT us.*, s.name, s.pack_name, s.image_url, s.is_gift, s.price_usd
       FROM user_stickers us
       JOIN stickers s ON us.sticker_id = s.id
       WHERE us.user_id = ?
       ORDER BY us.acquired_at DESC`,
      [userId]
    );

    res.json({
      stickers: rows.map(s => ({
        id: s.id,
        userId: s.user_id,
        stickerId: s.sticker_id,
        name: s.name,
        packName: s.pack_name,
        imageUrl: s.image_url,
        isGift: !!s.is_gift,
        priceUsd: s.price_usd,
        acquiredAt: s.acquired_at
      }))
    });
  } catch (err) {
    console.error('Get user stickers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { listStickers, acquireSticker, getUserStickers };
