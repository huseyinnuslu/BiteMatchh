import express from 'express';
import {
  registerUser,
  loginUser,
  guestLogin,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  googleLogin,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Kimlik doğrulama rotaları
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/guest', guestLogin);
router.put('/profile', protect, updateUserProfile);

// Şifre sıfırlama – Gmail OTP akışı
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth2 ile giriş / kayıt
router.post('/google-login', googleLogin);

export default router;
