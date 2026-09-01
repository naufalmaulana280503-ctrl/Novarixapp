const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/oauth', authController.oauthLogin);
router.get('/confirm/:token', authController.confirmEmail);
router.get('/confirm-email/:token', authController.confirmEmail);
router.post('/confirm-email', authController.confirmEmail);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/phone-verification', authController.sendPhoneVerification);
router.post('/verify-phone', authController.verifyPhone);
router.post('/accept-terms', authenticate, authController.acceptTerms);
router.post('/assign-verified-badge', authenticate, authController.assignVerifiedBadge);

module.exports = router;
