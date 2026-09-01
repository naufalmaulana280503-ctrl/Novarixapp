const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/isAdmin');
const path = require('path');
const fs = require('fs');
const verificationUploadDir = path.join(__dirname, '..', '..', 'private-uploads', 'verification');

// list pending verification requests (admin)
router.get('/requests', authenticate, isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT vr.*, u.username, u.display_name, u.avatar_url, u.followers_count, u.likes_received_count FROM verification_requests vr JOIN users u ON vr.user_id = u.id WHERE vr.status = ? ORDER BY vr.created_at ASC', ['pending']);
    res.json({ requests: rows });
  } catch (err) {
    console.error('Admin list requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get specific request
router.get('/requests/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.query('SELECT vr.*, u.username, u.display_name, u.avatar_url, u.followers_count, u.likes_received_count, u.verified_tier FROM verification_requests vr JOIN users u ON vr.user_id = u.id WHERE vr.id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    res.json({ request: { ...rows[0], document_available: Boolean(rows[0].document_path) } });
  } catch (err) {
    console.error('Admin get request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/requests/:id/document', authenticate, isAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid request id' });
    const [rows] = await pool.query('SELECT document_path FROM verification_requests WHERE id = ?', [id]);
    if (!rows.length || !rows[0].document_path) return res.status(404).json({ message: 'Document not found' });
    const filePath = path.resolve(verificationUploadDir, rows[0].document_path);
    if (!filePath.startsWith(`${path.resolve(verificationUploadDir)}${path.sep}`)) return res.status(400).json({ message: 'Invalid document path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Document not found' });
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Admin document download error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// approve request
router.post('/requests/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = req.userId;
    const { badgeTier } = req.body; // 'blue'|'gold'|'purple' -> map to verified_tier and set is_verified

    const [rows] = await pool.query('SELECT * FROM verification_requests WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    const reqRow = rows[0];

    // update request
    await pool.query('UPDATE verification_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?', ['approved', adminId, id]);

    // update user verified status
    let verified_tier = null;
    if (badgeTier === 'blue') verified_tier = 'blue';
    if (badgeTier === 'gold') verified_tier = 'gold';
    if (badgeTier === 'purple') verified_tier = 'purple';

    await pool.query('UPDATE users SET verified_tier = ?, is_verified = 1 WHERE id = ?', [verified_tier, reqRow.user_id]);

    res.json({ message: 'Request approved and user verified' });
  } catch (err) {
    console.error('Admin approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// reject request
router.post('/requests/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = req.userId;
    const { reason } = req.body;

    const [rows] = await pool.query('SELECT * FROM verification_requests WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    const reqRow = rows[0];

    await pool.query('UPDATE verification_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, admin_notes = ? WHERE id = ?', ['rejected', adminId, reason || null, id]);

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('Admin reject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
