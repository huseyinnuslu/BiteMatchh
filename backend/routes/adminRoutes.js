import express from 'express';
import { getAllUsers, deleteUser, bulkDeleteUsers, updateUserRole, getAllRooms, deleteRoom, bulkDeleteRooms, getStats, importEvents } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tüm admin route'ları protect + adminOnly middleware'den geçer
router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.delete('/users/bulk', bulkDeleteUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', updateUserRole);
router.get('/rooms', getAllRooms);
router.delete('/rooms/bulk', bulkDeleteRooms);
router.delete('/rooms/:id', deleteRoom);
router.post('/import-events', importEvents);

export default router;
