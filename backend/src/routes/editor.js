const express = require('express');
const router = express.Router();
const editorController = require('../controllers/editorController');
const { authenticate } = require('../middleware/auth');

router.post('/trim', authenticate, editorController.trimVideo);
router.post('/speed', authenticate, editorController.changeSpeed);
router.post('/transition', authenticate, editorController.addTransition);

module.exports = router;
