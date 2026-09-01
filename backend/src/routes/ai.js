const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const {
	upload: aiUpload,
	handleMulterErrors: aiMulterErrors,
} = require('../middleware/chatUpload');

router.post(
	'/chat',
	authenticate,
	(req, res, next) => {
		aiUpload.single('file')(req, res, (err) => aiMulterErrors(err, req, res, next));
	},
	(req, _res, next) => {
		if (req.body && typeof req.body.history === 'string' && req.body.history.trim()) {
			try {
				const parsed = JSON.parse(req.body.history)
				if (Array.isArray(parsed)) req.body.history = parsed
			} catch { /* skip */ }
		}
		next()
	},
	aiController.aiChat,
);
router.post('/suggest-caption', authenticate, aiController.suggestCaption);
router.post('/detect-nsfw', authenticate, aiController.detectNSFW);

module.exports = router;
