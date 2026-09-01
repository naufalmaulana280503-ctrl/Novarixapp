const express = require('express');
const router = express.Router();
const stickersController = require('../controllers/stickersController');
const { authenticate } = require('../middleware/auth');

router.get('/list', stickersController.listStickers);
router.post('/acquire', authenticate, stickersController.acquireSticker);
router.get('/user/:userId', authenticate, stickersController.getUserStickers);

module.exports = router;
