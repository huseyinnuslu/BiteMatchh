import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import swipeRoutes from './routes/swipeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { initSocket } from './socket/socketManager.js';
import { startEventCron } from './services/eventFetcherService.js';
import eventRoutes from './routes/eventRoutes.js';

dotenv.config();
connectDB().then(() => {
  // MongoDB bağlantısı kurulduktan sonra canlı etkinlik cron'unu başlat
  startEventCron();
});


const app = express();

// ─── CORS Ayarları ─────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL);
    isAllowed
      ? callback(null, true)
      : callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── REST Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

app.get('/', (_req, res) => res.send('BiteMatch API Çalışıyor...'));

// ─── Hata Middleware ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── HTTP Server + Socket.IO ────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
  // Mobil/yavaş ağlar için ping ayarları
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Socket olaylarını ayrı modülde yönet
initSocket(io);

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
