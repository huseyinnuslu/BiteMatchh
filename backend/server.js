import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import swipeRoutes from './routes/swipeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { initSocket } from './socket/socketManager.js';

dotenv.config();
connectDB();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ─── Güvenlik: Helmet (HTTP başlıkları) ─────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Socket.IO uyumluluğu için
  contentSecurityPolicy: false,     // Vercel frontend için
}));

// ─── Sıkıştırma (gzip) ─────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman / sunucu içi
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

// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Genel API limiti: 15 dakikada 200 istek
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Çok fazla istek gönderdiniz. 15 dakika sonra tekrar deneyin.' },
  skip: () => !isProd, // Sadece production'da aktif
});

// Auth limiti: 15 dakikada 20 istek (brute-force koruması)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  skip: () => !isProd,
});

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',   authLimiter, authRoutes);
app.use('/api/rooms',  apiLimiter,  roomRoutes);
app.use('/api/swipes', apiLimiter,  swipeRoutes);
app.use('/api/admin',  apiLimiter,  adminRoutes);
app.use('/api/users',  apiLimiter,  userRoutes);

// Health check — Render keep-alive için
app.get('/',        (_req, res) => res.json({ status: 'ok', app: 'BiteMatch API' }));
app.get('/health',  (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── Hata Middleware ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── HTTP Server + Socket.IO ─────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 30000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

initSocket(io);

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`[BiteMatch] Server ${PORT} portunda çalışıyor | ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
});

// ─── Render Cold Start Önleme ────────────────────────────────────────────────
// Render free tier'da 15 dakika hareketsizlikte server uyur.
// Her 10 dakikada /health'e kendi kendine ping atarak uyanık tutar.
if (isProd && process.env.RENDER_EXTERNAL_URL) {
  const SELF_URL = `${process.env.RENDER_EXTERNAL_URL}/health`;
  setInterval(async () => {
    try {
      const { default: https } = await import('https');
      https.get(SELF_URL, (res) => {
        console.log(`[Keep-alive] ping → ${res.statusCode}`);
      }).on('error', () => {});
    } catch {}
  }, 10 * 60 * 1000); // 10 dakika
}
