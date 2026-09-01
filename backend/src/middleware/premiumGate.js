const { pool } = require('../models/db');

const premiumGate = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [rows] = await pool.query('SELECT is_premium, premium_expires FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(401).json({ message: 'Unauthorized' });

    const user = rows[0];
    const now = new Date();
    const expires = user.premium_expires ? new Date(user.premium_expires) : null;

    if (user.is_premium && expires && expires > now) {
      // subscription active
      return next();
    }

    return res.status(402).json({ message: 'Premium subscription required', code: 'premium_required' });
  } catch (err) {
    console.error('premiumGate error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { premiumGate };
