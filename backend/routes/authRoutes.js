import express from 'express';
import {
  registerUser,
  verifyRegistrationEmail,
  resendRegistrationVerification,
  loginUser,
  guestLogin,
  updateUserProfile,
  completeUsernameOnboarding,
  forgotPassword,
  resetPassword,
  googleLogin,
  startGmailApiAuthorization,
  completeGmailApiAuthorization,
  requestEmailChange,
  confirmEmailChange,
  requestAccountDeletion,
  deleteOwnAccount,
  exportPersonalData,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Kimlik doğrulama rotaları
router.post('/register', registerUser);
router.post('/verify-email', verifyRegistrationEmail);
router.post('/verify-email/resend', resendRegistrationVerification);
router.post('/login', loginUser);
router.post('/guest', guestLogin);
router.put('/profile', protect, updateUserProfile);
router.post('/complete-username', protect, completeUsernameOnboarding);
router.post('/email-change/request', protect, requestEmailChange);
router.post('/email-change/confirm', protect, confirmEmailChange);
router.post('/account/delete/request', protect, requestAccountDeletion);
router.get('/account/export', protect, exportPersonalData);
router.delete('/account', protect, deleteOwnAccount);

// Şifre sıfırlama – Gmail OTP akışı
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth2 ile giriş / kayıt
router.post('/google-login', googleLogin);

// Yalnızca geçici Gmail API test kurulumu için. GMAIL_API_SETUP_TOKEN silinince kullanılamaz.
router.get('/gmail/connect', startGmailApiAuthorization);
router.get('/gmail/callback', completeGmailApiAuthorization);

export default router;
