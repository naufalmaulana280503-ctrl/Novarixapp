const express = require('express');
const router = express.Router();
const giftsController = require('../controllers/giftsController');
const { authenticate } = require('../middleware/auth');

router.get('/list', giftsController.listGifts);
router.post('/send', authenticate, giftsController.sendGift);
router.get('/transactions/:userId', authenticate, giftsController.getGiftTransactions);
router.get('/revenue/:userId', authenticate, giftsController.getGiftRevenue);

module.exports = router;
