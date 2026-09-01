const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterErrors } = require('../middleware/postUpload');

router.post(
  '/',
  authenticate,
  (req, res, next) => {
    upload.array('media', 10)(req, res, (err) => {
      if (err) return handleMulterErrors(err, req, res, next);
      next();
    });
  },
  postsController.createPost
);
router.get('/feed', authenticate, postsController.getFeed);
router.get('/user/:userId', authenticate, postsController.getUserPosts);
router.delete('/:postId', authenticate, postsController.deletePost);
router.post('/:postId/view', authenticate, postsController.incrementView);
router.post('/:postId/share', authenticate, postsController.sharePost);
router.post('/:postId/repost', authenticate, postsController.repostPost);

// === ROUTE LIKE / UNLIKE POSTINGAN DEDICATED (LANCAR TANPA ERROR SPAM) ===
router.post('/:postId/like', authenticate, postsController.toggleLike);
router.delete('/:postId/like', authenticate, postsController.toggleLike);

// === ROUTE AMBIL POSTINGAN YANG DI-LIKE USER (UNTUK TAB "DISUKAI" DI PROFILE) ===
router.get('/user/:userId/liked', authenticate, postsController.getLikedPosts);

module.exports = router;
