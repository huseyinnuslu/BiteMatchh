import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import swipeRoutes from './routes/swipeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

// Veritabanına Bağlan
connectDB();

const app = express();

// CORS Ayarları (Local ve Vercel Canlı Ortamları İçin Dinamik)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // API araçları, server-to-server veya boş origin isteklerine izin ver
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL);
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy does not allow access from this origin'), false);
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('BiteMatch API Çalışıyor...');
});

// Hata Yönetimi Middleware'leri
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
