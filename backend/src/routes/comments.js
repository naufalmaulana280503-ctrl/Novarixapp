const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const { authenticate } = require('../middleware/auth');

router.get('/post/:postId', commentsController.listComments);
router.post('/post/:postId', authenticate, commentsController.createComment);
router.post('/post/:postId/:commentId/pin', authenticate, commentsController.pinComment);
router.post('/:commentId/like', authenticate, commentsController.likeComment);
router.patch('/:commentId', authenticate, commentsController.updateComment); // EDIT KOMENTAR
router.delete('/:commentId', authenticate, commentsController.deleteComment);

module.exports = router;
