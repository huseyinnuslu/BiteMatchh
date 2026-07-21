/**
 * messageRoutes.js
 * BiteMatch – Doğrudan Mesajlaşma (DM) API
 *
 * GET  /api/messages/conversations     → Konuşma listesi (son mesajla)
 * GET  /api/messages/dm/:userId        → İki kullanıcı arasındaki mesajlar
 * POST /api/messages/dm/:userId        → DM gönder (socket fallback)
 */
import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import Message from '../models/Message.js';
import User    from '../models/User.js';

const router = express.Router();

// ── GET /api/messages/conversations ─────────────────────────────────────────
// Kullanıcının DM yaptığı kişileri ve son mesajı döndürür.
router.get('/conversations', protect, async (req, res, next) => {
  try {
    const myId = req.user._id;

    // Benim gönderdiğim VEYA bana gönderilen tüm DM'ler
    // Engellenen kullanicilari cek
    const me = await User.findById(myId).select('blockedUsers').lean();
    const blocked = (me?.blockedUsers || []).map(id => id.toString());

    const msgs = await Message.find({
      type: 'direct',
      $or: [{ sender: myId }, { recipient: myId }],
      // Engellenenlerle konusmayi gizle
      sender:    { $nin: blocked },
      recipient: { $nin: blocked },
    })
      .sort({ createdAt: -1 })
      .populate('sender',    'username')
      .populate('recipient', 'username')
      .lean();

    // Partner başına son mesajı grupla
    const convMap = new Map();
    for (const msg of msgs) {
      const senderId    = msg.sender?._id?.toString();
      const recipientId = msg.recipient?._id?.toString();
      const myIdStr     = myId.toString();

      const otherId   = senderId === myIdStr ? recipientId   : senderId;
      const otherUser = senderId === myIdStr ? msg.recipient : msg.sender;

      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          user:        otherUser,
          lastMessage: { text: msg.text, createdAt: msg.createdAt, senderId },
        });
      }
    }

    res.json([...convMap.values()]);
  } catch (e) { next(e); }
});

// ── GET /api/messages/dm/:userId ─────────────────────────────────────────────
// Benim ile :userId arasındaki mesajları son 100'le sınırlı getir.
router.get('/dm/:userId', protect, async (req, res, next) => {
  try {
    const myId    = req.user._id;
    const otherId = req.params.userId;

    if (!mongoose.isValidObjectId(otherId)) {
      res.status(400); throw new Error('Geçersiz kullanıcı ID');
    }

    const messages = await Message.find({
      type: 'direct',
      $or: [
        { sender: myId,    recipient: otherId },
        { sender: otherId, recipient: myId    },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json(messages);
  } catch (e) { next(e); }
});

// ── POST /api/messages/dm/:userId ────────────────────────────────────────────
// Socket müsait değilse REST üzerinden DM gönder.
router.post('/dm/:userId', protect, async (req, res, next) => {
  try {
    const { text, sharedEvent } = req.body;
    if (!text?.trim() && !sharedEvent) { res.status(400); throw new Error('Mesaj boş olamaz'); }

    const otherId = req.params.userId;
    if (!mongoose.isValidObjectId(otherId)) {
      res.status(400); throw new Error('Geçersiz kullanıcı ID');
    }

    const other = await User.findById(otherId).select('_id username').lean();
    if (!other) { res.status(404); throw new Error('Kullanıcı bulunamadı'); }

    const msg = await Message.create({
      type:       'direct',
      sender:     req.user._id,
      senderName: req.user.username,
      recipient:  otherId,
      text:       text?.trim() || '',
      sharedEvent,
    });

    res.status(201).json(msg);
  } catch (e) { next(e); }
});

export default router;
