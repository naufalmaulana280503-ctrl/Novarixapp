const express = require('express');
const router = express.Router();
const storiesController = require('../controllers/storiesController');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterErrors } = require('../middleware/postUpload');

// Upload story/boomerang
router.post(
  '/',
  authenticate,
  (req, res, next) => {
    upload.single('media')(req, res, (err) => {
      if (err) return handleMulterErrors(err, req, res, next);
      next();
    });
  },
  storiesController.uploadStory
);

// Get stories for home feed (all stories from following + own)
router.get('/feed', authenticate, storiesController.getStoriesFeed);

// Get user's own stories
router.get('/user/:userId', authenticate, storiesController.getUserStories);

// Mark story as viewed
router.post('/:storyId/view', authenticate, storiesController.viewStory);

// Get story viewers (users who viewed the story)
router.get('/:storyId/viewers', authenticate, storiesController.getStoryViewers);

// Delete story
router.delete('/:storyId', authenticate, storiesController.deleteStory);

module.exports = router;
