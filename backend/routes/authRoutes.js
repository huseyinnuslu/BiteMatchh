import express from 'express';
import { registerUser, loginUser, guestLogin, updateUserProfile, forgotPassword, resetPassword, getSecurityQuestion, resetPasswordWithAnswer } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/guest', guestLogin);
router.put('/profile', protect, updateUserProfile);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.post('/security-question', getSecurityQuestion);
router.post('/reset-with-answer', resetPasswordWithAnswer);

export default router;
