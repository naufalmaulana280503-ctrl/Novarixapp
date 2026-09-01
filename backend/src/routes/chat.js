const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const groupPollsController = require('../controllers/groupPollsController');
const { authenticate } = require('../middleware/auth');
const {
  upload: chatUpload,
  toPublicChatUrl,
  detectType,
  handleMulterErrors: chatMulterErrors,
} = require('../middleware/chatUpload');

// Compatibility endpoints used by frontend
router.get('/conversations', authenticate, chatController.listConversations);
router.post('/conversations', authenticate, chatController.createConversation);
router.get('/messages/:targetUserId', authenticate, chatController.getMessagesWithUser);

// NEW: Upload file for chat (images, docs, voice notes)
router.post(
  '/upload',
  authenticate,
  (req, res, next) => {
    chatUpload.single('file')(req, res, (err) => chatMulterErrors(err, req, res, next));
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan' });
      }
      const userId = req.userId;
      const type = detectType(req.file.mimetype);
      const publicUrl = toPublicChatUrl(userId, req.file.filename, type);
      res.status(200).json({
        url: publicUrl,
        type,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err) {
      console.error('Chat upload error:', err);
      res.status(500).json({ message: err?.message || 'Upload gagal' });
    }
  }
);

// NEW: Compat alias for frontend Chat.jsx POST /chat/messages/:userId (sends DM to targetUserId)
router.post('/messages/:targetUserId', authenticate, async (req, res) => {
  try {
    req.body.receiverId = parseInt(req.params.targetUserId);
    if (!req.body.groupId) req.body.groupId = null;
    return chatController.sendMessage(req, res);
  } catch (e) {
    console.error('Chat compat DM send error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/send', authenticate, chatController.sendMessage);
router.put('/messages/:messageId', authenticate, chatController.editMessage);
router.delete('/messages/:messageId', authenticate, chatController.deleteMessage);
router.get('/private/:userId1/:userId2', authenticate, chatController.getPrivateMessages);
router.get('/group/:groupId', authenticate, chatController.getGroupMessages);
router.post('/group/:groupId/pin/:messageId', authenticate, chatController.pinMessage);
router.post('/group/:groupId/unpin/:messageId', authenticate, chatController.unpinMessage);
router.get('/group/:groupId/pinned', authenticate, chatController.getPinnedMessages);

// Poll aliases for chat (ease of use from frontend Chat.jsx / GroupChat.jsx)
router.post('/group/:groupId/poll', authenticate, groupPollsController.createPoll);
router.post('/poll/:pollId/vote', authenticate, groupPollsController.votePoll);
router.get('/poll/:pollId', authenticate, groupPollsController.getPollResults);

// Compat aliases for pinned messages used by frontend Chat.jsx
router.get('/conversations/:conversationId/pinned', authenticate, (req, res) => {
  res.json({ messages: [] });
});

module.exports = router;
