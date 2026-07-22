import express from 'express';
import { cleanupEvents } from '../controllers/cronController.js';

const router = express.Router();

// Hem GET hem POST isteklerini kabul et (Cron servisleri genellikle GET kullanabilir)
router.post('/cleanup-events', cleanupEvents);
router.get('/cleanup-events', cleanupEvents);

export default router;
