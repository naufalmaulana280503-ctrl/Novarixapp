const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

// storage for verification documents
const uploadDir = path.join(__dirname, '..', '..', 'private-uploads', 'verification');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only PDF, JPEG, and PNG documents are allowed.'));
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// server-side eligibility checks
const BLUE_FOLLOWERS = 30000000;
const BLUE_LIKES = 30000000;
const GOLD_FOLLOWERS = 10000000;

async function checkUserEligibility(userId) {
  const [rows] = await pool.query('SELECT id, followers_count, likes_received_count, is_partner, business_verified, is_invited_elite FROM users WHERE id = ?', [userId]);
  const user = rows[0] || null;
  if (!user) return null;

  const followers = Number(user.followers_count || 0);
  const likes = Number(user.likes_received_count || 0);

  const blueEligible = followers >= BLUE_FOLLOWERS && likes >= BLUE_LIKES;
  const goldEligible = (followers >= GOLD_FOLLOWERS || !!user.is_partner) && !!user.business_verified;
  const purpleEligible = !!user.is_invited_elite;

  return {
    userId: user.id,
    followers,
    likes,
    blue: { eligible: blueEligible, required: { followers: BLUE_FOLLOWERS, likes: BLUE_LIKES } },
    gold: { eligible: goldEligible, required: { followers: GOLD_FOLLOWERS }, partner: !!user.is_partner, businessVerified: !!user.business_verified },
    purple: { eligible: purpleEligible },
  };
}

// GET eligibility
router.get('/eligibility/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await checkUserEligibility(userId);
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json(result);
  } catch (err) {
    console.error('Eligibility check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit verification request (multipart)
router.post('/submit', authenticate, upload.single('document'), async (req, res) => {
  try {
    const userId = req.userId;
    const tier = req.body.tier;
    if (!['blue','gold','purple'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });

    const eligibility = await checkUserEligibility(userId);
    if (!eligibility) return res.status(404).json({ message: 'User not found' });

    // server-side validation
    if (tier === 'blue') {
      if (!eligibility.blue.eligible) {
        return res.status(400).json({ message: 'User does not meet Blue tier requirements' });
      }
    }
    if (tier === 'gold') {
      // gold requires business docs or partner + business_verified
      const hasDoc = !!req.file;
      if (!(eligibility.gold.eligible || hasDoc)) {
        return res.status(400).json({ message: 'Gold tier requires business documents and/or partner status' });
      }
    }
    if (tier === 'purple') {
      if (!eligibility.purple.eligible) return res.status(400).json({ message: 'Purple tier is invite-only' });
    }

    const docPath = req.file ? path.relative(uploadDir, req.file.path) : null;
    const metadata = JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] });

    const [result] = await pool.query('INSERT INTO verification_requests (user_id, tier, status, document_path, metadata) VALUES (?, ?, ?, ?, ?)', [userId, tier, 'pending', docPath, metadata]);

    // Optionally update user's verified_tier to pending state or leave until approval
    await pool.query('UPDATE users SET verified_tier = ? WHERE id = ?', [null, userId]);

    res.json({ message: 'Verification request submitted', requestId: result.insertId });
  } catch (err) {
    console.error('Verification submit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// compatibility route /request -> same as /submit
router.post('/request', authenticate, upload.single('document'), async (req, res) => {
  try {
    const userId = req.userId;
    const tier = req.body.tier;
    if (!['blue','gold','purple'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });

    const eligibility = await checkUserEligibility(userId);
    if (!eligibility) return res.status(404).json({ message: 'User not found' });

    if (tier === 'blue') {
      if (!eligibility.blue.eligible) {
        return res.status(400).json({ message: 'User does not meet Blue tier requirements' });
      }
    }
    if (tier === 'gold') {
      const hasDoc = !!req.file;
      if (!(eligibility.gold.eligible || hasDoc)) {
        return res.status(400).json({ message: 'Gold tier requires business documents and/or partner status' });
      }
    }
    if (tier === 'purple') {
      if (!eligibility.purple.eligible) return res.status(400).json({ message: 'Purple tier is invite-only' });
    }

    const docPath = req.file ? path.relative(uploadDir, req.file.path) : null;
    const metadata = JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] });

    const [result] = await pool.query('INSERT INTO verification_requests (user_id, tier, status, document_path, metadata) VALUES (?, ?, ?, ?, ?)', [userId, tier, 'pending', docPath, metadata]);
    await pool.query('UPDATE users SET verified_tier = ? WHERE id = ?', [null, userId]);

    res.json({ message: 'Verification request submitted', requestId: result.insertId });
  } catch (err) {
    console.error('Verification submit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET request status for user
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query('SELECT * FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    if (!rows || rows.length === 0) return res.json({ status: 'none' });
    res.json({ request: rows[0] });
  } catch (err) {
    console.error('Get verification status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
