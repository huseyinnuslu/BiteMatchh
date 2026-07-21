import express from 'express';
import { createRoom, getRoomById, joinRoom, deleteRoom, getMyRooms, startRoom, getMatchHistory } from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createRoom).get(protect, getMyRooms);
router.route('/history').get(protect, getMatchHistory);

router.route('/:id')
  .get(protect, getRoomById)
  .delete(protect, deleteRoom);

router.route('/:id/join').put(protect, joinRoom);
router.route('/:id/start').put(protect, startRoom);

export default router;
