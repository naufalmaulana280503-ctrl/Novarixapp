const express = require('express');
const router = express.Router();
const groupPollsController = require('../controllers/groupPollsController');
const { authenticate } = require('../middleware/auth');

router.post('/group/:groupId', authenticate, groupPollsController.createPoll);
router.post('/poll/:pollId/vote', authenticate, groupPollsController.votePoll);
router.get('/poll/:pollId', authenticate, groupPollsController.getPollResults);

module.exports = router;
