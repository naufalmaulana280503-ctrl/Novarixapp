const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const MAX_DOC_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VOICE_BYTES = 25 * 1024 * 1024;

const ALLOWED_DOC_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-zip-compressed',
];

const ALLOWED_IMAGE_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
];

const ALLOWED_VIDEO_MIME = [
  'video/mp4', 'video/webm', 'video/quicktime',
];

const ALLOWED_VOICE_MIME = [
  'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
];

const publicUploadsRoot = path.join(__dirname, '..', '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.userId;
    if (!userId) {
      return cb(new Error('Unauthorized: user id is required for upload'));
    }
    let subdir = 'chat';
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) subdir = 'chat/images';
    else if (ALLOWED_VIDEO_MIME.includes(file.mimetype)) subdir = 'chat/videos';
    else if (ALLOWED_VOICE_MIME.includes(file.mimetype)) subdir = 'chat/voice';
    else subdir = 'chat/docs';

    const dest = path.join(publicUploadsRoot, String(userId), subdir);
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
  const isImage = ALLOWED_IMAGE_MIME.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_MIME.includes(file.mimetype);
  const isVoice = ALLOWED_VOICE_MIME.includes(file.mimetype);
  const isDoc = ALLOWED_DOC_MIME.includes(file.mimetype);
  if (!isImage && !isVideo && !isVoice && !isDoc) {
    return cb(new Error('Jenis file tidak didukung. Gunakan gambar (JPG/PNG/GIF/WEBP), audio (WEBM/MP3/WAV/OGG), atau dokumen (PDF/DOC/XLS/PPT/TXT/ZIP).'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: Math.max(MAX_DOC_BYTES, MAX_IMAGE_BYTES, MAX_VOICE_BYTES),
  },
});

const toPublicChatUrl = (userId, filename, type) => {
  let subdir = 'chat';
  if (type === 'image') subdir = 'chat/images';
  else if (type === 'video') subdir = 'chat/videos';
  else if (type === 'voice') subdir = 'chat/voice';
  else subdir = 'chat/docs';
  return `/uploads/${userId}/${subdir}/${filename}`;
};

const detectType = (mimetype) => {
  if (ALLOWED_IMAGE_MIME.includes(mimetype)) return 'image';
  if (ALLOWED_VIDEO_MIME.includes(mimetype)) return 'video';
  if (ALLOWED_VOICE_MIME.includes(mimetype)) return 'voice';
  return 'document';
};

const handleMulterErrors = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File terlalu besar (maks 50MB untuk dokumen, 10MB untuk gambar, 25MB untuk voice note)' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Field upload tidak sesuai. Gunakan field "file".' });
    }
    return res.status(400).json({ message: err.message });
  }
  return res.status(400).json({ message: err.message || 'Upload gagal' });
};

module.exports = {
  upload,
  toPublicChatUrl,
  detectType,
  handleMulterErrors,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VOICE_BYTES,
  publicUploadsRoot,
};
