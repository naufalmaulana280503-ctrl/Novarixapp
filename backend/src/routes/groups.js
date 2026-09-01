const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// List groups for the authenticated user
router.get('/', authenticate, groupsController.listMyGroups);
router.post('/', authenticate, groupsController.createGroup);
router.get('/user/:userId', authenticate, groupsController.listUserGroups);
router.get('/:groupId', authenticate, groupsController.getGroup);
router.put('/:groupId', authenticate, groupsController.updateGroup);
router.delete('/:groupId', authenticate, groupsController.deleteGroup);
router.post('/:groupId/join', authenticate, groupsController.joinGroup);
router.post('/:groupId/leave', authenticate, groupsController.leaveGroup);
router.get('/:groupId/members', authenticate, groupsController.getGroupMembers);
router.post('/:groupId/members', authenticate, groupsController.addMember);
router.delete('/:groupId/members/:userId', authenticate, groupsController.kickMember);
router.put('/:groupId/members/:userId/role', authenticate, groupsController.changeMemberRole);
router.post('/:groupId/invite', authenticate, groupsController.generateInviteCode);
router.post('/invite/:inviteCode', authenticate, groupsController.joinByInviteCode);

// NEW: Compat endpoints for GroupChat.jsx — get and send group messages
router.get('/:groupId/messages', authenticate, async (req, res) => {
  try {
    req.params.groupId = parseInt(req.params.groupId);
    return chatController.getGroupMessages(req, res);
  } catch (e) {
    console.error('Group messages GET compat error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/:groupId/messages', authenticate, async (req, res) => {
  try {
    req.body.groupId = parseInt(req.params.groupId);
    if (!req.body.receiverId) req.body.receiverId = null;
    return chatController.sendMessage(req, res);
  } catch (e) {
    console.error('Group messages POST compat error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/:groupId/kick', authenticate, async (req, res) => {
  try {
    req.params.userId = req.body.userId;
    req.params.groupId = parseInt(req.params.groupId);
    return groupsController.kickMember(req, res);
  } catch (e) {
    console.error('Group kick compat error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
