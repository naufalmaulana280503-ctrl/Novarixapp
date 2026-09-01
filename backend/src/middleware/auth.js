const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
