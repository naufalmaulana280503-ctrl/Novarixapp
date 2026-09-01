const express = require('express');
const router = express.Router();
const watermarkController = require('../controllers/watermarkController');
const { authenticate } = require('../middleware/auth');

router.post('/post/:postId', authenticate, watermarkController.applyWatermark);
router.get('/post/:postId', watermarkController.getWatermarks);
router.post('/batch', authenticate, watermarkController.batchWatermark);

module.exports = router;
