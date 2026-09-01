const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authenticate } = require('../middleware/auth');

router.post('/report', authenticate, moderationController.reportContent);
router.get('/reports', authenticate, moderationController.getReports);
router.post('/reports/:reportId/review', authenticate, moderationController.reviewReport);
router.post('/bot-check/:userId', authenticate, moderationController.runBotCheck);
router.post('/auto-ban-bots', authenticate, moderationController.autoBanBots);
router.get('/bot-flags', authenticate, moderationController.getBotFlags);

module.exports = router;
