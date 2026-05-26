import express from 'express';
import { registerUser, loginUser, guestLogin, updateUserProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/guest', guestLogin);
router.put('/profile', protect, updateUserProfile);

export default router;
