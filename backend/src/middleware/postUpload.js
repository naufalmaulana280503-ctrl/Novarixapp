const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const MAX_FILES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const ALLOWED_MIME = {
  'image/jpeg': { kind: 'image', ext: ['.jpg', '.jpeg'], maxBytes: MAX_IMAGE_BYTES },
  'image/jpg': { kind: 'image', ext: ['.jpg', '.jpeg'], maxBytes: MAX_IMAGE_BYTES },
  'image/png': { kind: 'image', ext: ['.png'], maxBytes: MAX_IMAGE_BYTES },
  'video/mp4': { kind: 'video', ext: ['.mp4'], maxBytes: MAX_VIDEO_BYTES },
};

const publicUploadsRoot = path.join(__dirname, '..', '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.userId;
    if (!userId) {
      return cb(new Error('Unauthorized: user id is required for upload'));
    }
    const dest = path.join(publicUploadsRoot, String(userId), 'posts');
    try {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const rule = ALLOWED_MIME[file.mimetype];
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!rule || (rule.ext.length && !rule.ext.includes(ext))) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and MP4 are allowed.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: MAX_FILES,
    fileSize: MAX_VIDEO_BYTES,
  },
});

const toPublicMediaUrl = (userId, filename) => `/uploads/${userId}/posts/${filename}`;

const resolveStoredFilePath = (mediaUrl) => {
  if (!mediaUrl) return null;
  const relative = String(mediaUrl).replace(/^[\\/]+/, '');
  const publicPath = path.join(__dirname, '..', '..', 'public', relative);
  const legacySrcPath = path.join(__dirname, '..', relative);
  const legacyRootPath = path.join(__dirname, '..', '..', relative);
  if (fs.existsSync(publicPath)) return publicPath;
  if (fs.existsSync(legacySrcPath)) return legacySrcPath;
  return legacyRootPath;
};

const enforcePerTypeSize = (files = []) => {
  for (const file of files) {
    const rule = ALLOWED_MIME[file.mimetype];
    const maxBytes = rule?.maxBytes || MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      const label = rule?.kind === 'image' ? '10MB' : '200MB';
      const err = new Error(`File "${file.originalname}" exceeds the ${label} size limit.`);
      err.statusCode = 400;
      throw err;
    }
  }
};

const handleMulterErrors = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Maximum 10 media files allowed' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File exceeds the 200MB maximum size' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected upload field. Use "media".' });
    }
    return res.status(400).json({ message: err.message });
  }
  return res.status(400).json({ message: err.message || 'Upload failed' });
};

module.exports = {
  upload,
  MAX_FILES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  toPublicMediaUrl,
  resolveStoredFilePath,
  enforcePerTypeSize,
  handleMulterErrors,
  publicUploadsRoot,
};
