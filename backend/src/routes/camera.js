const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const { authenticate } = require('../middleware/auth');

router.post('/photo', authenticate, cameraController.capturePhoto);
router.post('/video/start', authenticate, cameraController.startVideoRecording);
router.post('/video/stop/:sessionId', authenticate, cameraController.stopVideoRecording);
router.post('/beauty', authenticate, cameraController.applyBeautyEffect);

module.exports = router;
