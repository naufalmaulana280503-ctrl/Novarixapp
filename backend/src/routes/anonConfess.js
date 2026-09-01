const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT id, body, created_at, likes_count, reports_count
       FROM anon_confessions WHERE status = 'visible' ORDER BY created_at DESC LIMIT 100`,
    );
    res.json({ posts });
  } catch (error) {
    console.error('List anonymous confessions error:', error);
    res.status(500).json({ message: 'Gagal memuat Anon-Confess Board' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const body = String(req.body.body || '').trim().slice(0, 2000);
    if (body.length < 3) return res.status(400).json({ message: 'Pengakuan minimal 3 karakter' });
    const [result] = await pool.query(
      `INSERT INTO anon_confessions (body, status) VALUES (?, 'visible')`,
      [body],
    );
    res.status(201).json({ id: result.insertId, message: 'Pengakuan anonim diterbitkan' });
  } catch (error) {
    console.error('Create anonymous confession error:', error);
    res.status(500).json({ message: 'Gagal menerbitkan pengakuan' });
  }
});

router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ message: 'Alasan laporan wajib diisi' });
    const [result] = await pool.query(
      `UPDATE anon_confessions SET reports_count = reports_count + 1, status = CASE WHEN reports_count + 1 >= 3 THEN 'review' ELSE status END WHERE id = ? AND status != 'removed'`,
      [req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Pengakuan tidak ditemukan' });
    res.json({ message: 'Laporan diterima' });
  } catch (error) {
    console.error('Report anonymous confession error:', error);
    res.status(500).json({ message: 'Gagal mengirim laporan' });
  }
});

module.exports = router;
