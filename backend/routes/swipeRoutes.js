import express from 'express';
import { recordSwipe } from '../controllers/swipeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, recordSwipe);

export default router;
