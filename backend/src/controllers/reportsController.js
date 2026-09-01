const { pool } = require('../models/db');

const submitReport = async (req, res) => {
  try {
    const reporterId = req.userId;
    const { category, details, priority, targetGroupId, targetMessageId } = req.body;

    if (!details || details.trim().length < 10) {
      return res.status(400).json({ message: 'Details are required (min 10 chars).' });
    }

    // handle uploaded files (multer should have stored them in req.files)
    const files = req.files || [];
    const evidenceFiles = files.map(f => f.filename);

    const reason = `[${category || 'Other'}] ${details}`;

    const [result] = await pool.query(
      'INSERT INTO reports (reporter_id, target_group_id, target_message_id, reason, evidence_urls) VALUES (?, ?, ?, ?, ?)',
      [reporterId, targetGroupId || null, targetMessageId || null, reason, JSON.stringify(evidenceFiles || null)]
    );

    const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
    const report = rows[0];

    res.status(201).json({
      id: report.id,
      reporterId: report.reporter_id,
      reason: report.reason,
      evidenceCount: evidenceFiles.length,
      status: report.status,
      createdAt: report.created_at
    });
  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyReports = async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await pool.query('SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ reports: rows.map(r => ({ id: r.id, reason: r.reason, evidenceCount: r.evidence_urls ? JSON.parse(r.evidence_urls).length : 0, status: r.status, createdAt: r.created_at })) });
  } catch (err) {
    console.error('Get my reports error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { submitReport, getMyReports };
