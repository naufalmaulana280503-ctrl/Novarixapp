const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

router.get('/', authenticate, async (req, res) => {
  try {
    const [capsules] = await pool.query(
      `SELECT id, title, message, media_url, unlock_at, created_at
       FROM time_capsules WHERE user_id = ? ORDER BY unlock_at ASC`,
      [req.userId],
    );
    res.json({ capsules });
  } catch (error) {
    console.error('List time capsules error:', error);
    res.status(500).json({ message: 'Gagal memuat Time Capsule' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 120);
    const message = String(req.body.message || '').trim().slice(0, 5000);
    const unlockAt = parseDate(req.body.unlockAt);
    const mediaUrl = req.body.mediaUrl ? String(req.body.mediaUrl).slice(0, 1000) : null;
    if (!message && !mediaUrl) return res.status(400).json({ message: 'Pesan atau media wajib diisi' });
    if (!unlockAt || unlockAt <= new Date()) return res.status(400).json({ message: 'Waktu buka harus di masa depan' });

    const [result] = await pool.query(
      `INSERT INTO time_capsules (user_id, title, message, media_url, unlock_at)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, title || null, message || null, mediaUrl, unlockAt.toISOString()],
    );
    res.status(201).json({ id: result.insertId, message: 'Time Capsule dibuat' });
  } catch (error) {
    console.error('Create time capsule error:', error);
    res.status(500).json({ message: 'Gagal membuat Time Capsule' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, message, media_url, unlock_at, created_at
       FROM time_capsules WHERE id = ? AND user_id = ?`,
      [req.params.id, req.userId],
    );
    if (!rows.length) return res.status(404).json({ message: 'Time Capsule tidak ditemukan' });
    const capsule = rows[0];
    if (new Date(capsule.unlock_at) > new Date()) {
      return res.json({ capsule: { id: capsule.id, title: capsule.title, unlock_at: capsule.unlock_at }, locked: true });
    }
    res.json({ capsule, locked: false });
  } catch (error) {
    console.error('Get time capsule error:', error);
    res.status(500).json({ message: 'Gagal memuat Time Capsule' });
  }
});

module.exports = router;
