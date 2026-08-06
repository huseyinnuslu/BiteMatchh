import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createRestaurantVotingRoom, getRestaurantRecommendations, shareRecommendationLocation } from '../controllers/placeController.js';

const router = express.Router();

router.post('/rooms/:id/location', protect, shareRecommendationLocation);
router.get('/rooms/:id/recommendations', protect, getRestaurantRecommendations);
router.post('/rooms/:id/restaurant-room', protect, createRestaurantVotingRoom);

export default router;
