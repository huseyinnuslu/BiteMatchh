import express from 'express';
import { createRoom, getRoomById, joinRoom, deleteRoom, leaveRoom, getMyRooms, getActiveRoom, leaveActiveRoom, startRoom, getMatchHistory, inviteToRoom, updateStreamingPlatforms } from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createRoom).get(protect, getMyRooms);
router.route('/history').get(protect, getMatchHistory);
router.route('/active').get(protect, getActiveRoom);
router.route('/active/leave').put(protect, leaveActiveRoom);

router.route('/:id')
  .get(protect, getRoomById)
  .delete(protect, deleteRoom);

router.route('/:id/join').put(protect, joinRoom);
router.route('/:id/leave').put(protect, leaveRoom);
router.route('/:id/start').put(protect, startRoom);
router.route('/:id/streaming-platforms').put(protect, updateStreamingPlatforms);
router.route('/:id/invite').put(protect, inviteToRoom);

export default router;
