const { pool } = require('../models/db');

const isAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(401).json({ message: 'Unauthorized' });

    const role = rows[0].role;
    if (role === 'admin' || role === 'moderator') return next();

    return res.status(403).json({ message: 'Admin access required' });
  } catch (err) {
    console.error('isAdmin middleware error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { isAdmin };
