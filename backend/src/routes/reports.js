const express = require('express');
const router = express.Router();
const { submitReport, getMyReports } = require('../controllers/reportsController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '..', '..', 'private-uploads', 'reports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only JPEG, PNG, PDF, and TXT evidence files are allowed.'));
    cb(null, true);
  },
  limits: { files: 8, fileSize: 10 * 1024 * 1024 }
});

router.post('/', authenticate, upload.array('evidence', 8), submitReport);
router.get('/my', authenticate, getMyReports);

module.exports = router;
