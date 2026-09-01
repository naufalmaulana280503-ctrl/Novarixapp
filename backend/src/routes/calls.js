const express = require('express');
const router = express.Router();
const callsController = require('../controllers/callsController');
const { authenticate } = require('../middleware/auth');

router.post('/initiate', authenticate, callsController.initiateCall);
router.patch('/:callId/status', authenticate, callsController.updateCallStatus);
router.post('/:callId/end', authenticate, callsController.endCall);
router.get('/history', authenticate, callsController.getCallHistory);

module.exports = router;
