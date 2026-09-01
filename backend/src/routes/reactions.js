const express = require('express');
const router = express.Router();
const reactionsController = require('../controllers/reactionsController');
const { authenticate } = require('../middleware/auth');

router.post('/post/:postId', authenticate, reactionsController.addReaction);
router.delete('/post/:postId', authenticate, reactionsController.removeReaction);
router.get('/post/:postId', reactionsController.getReactions);
router.post('/post/:postId/duet-react', authenticate, reactionsController.createDuetOrReact);

module.exports = router;
