const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');
const { authenticate } = require('../middleware/auth');

router.get('/eligibility', authenticate, adsController.checkEligibility);
router.post('/create', authenticate, adsController.createAd);
router.get('/my', authenticate, adsController.getMyAds);
router.get('/:adId/stats', authenticate, adsController.getAdStats);
router.post('/:adId/approve', authenticate, adsController.approveAd);
router.post('/:adId/reject', authenticate, adsController.rejectAd);

module.exports = router;
