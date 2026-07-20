import express from 'express';
import {
  registerUser,
  loginUser,
  guestLogin,
  updateUserProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Kimlik doğrulama rotaları
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/guest', guestLogin);
router.put('/profile', protect, updateUserProfile);

// Şifre sıfırlama – Gmail OTP akışı
// Adım 1: E-postaya 6 haneli kod gönder
router.post('/forgot-password', forgotPassword);
// Adım 2: Kodu ve yeni şifreyi doğrula
router.post('/reset-password', resetPassword);

export default router;
