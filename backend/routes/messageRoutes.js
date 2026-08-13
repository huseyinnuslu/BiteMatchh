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
import Room    from '../models/Room.js';
import Notification from '../models/Notification.js';
import { getIo } from '../server.js';

const router = express.Router();

// Socket kapalıyken kullanılan HTTP yolu da etkinlik kartını socket yolu ile
// birebir aynı kurallarla kaydeder; yarım kartlar bildirim oluşturamaz.
const normalizeSharedEvent = (event) => {
  if (!event || typeof event !== 'object') return null;

  const name = typeof event.name === 'string' ? event.name.trim() : '';
  if (!name) return null;

  const normalized = { name };
  ['imageUrl', 'location', 'ticketUrl', 'mapsQuery'].forEach((key) => {
    if (typeof event[key] === 'string' && event[key].trim()) {
      normalized[key] = event[key].trim();
    }
  });
  return normalized;
};

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
      hiddenFor: { $ne: myId },
      // Engellenenlerle konusmayi gizle
      sender:    { $nin: blocked },
      recipient: { $nin: blocked },
    })
      .sort({ createdAt: -1 })
      .populate('sender',    'username profilePic')
      .populate('recipient', 'username profilePic')
      .lean();

    // Partner başına son mesajı grupla
    const convMap = new Map();
    for (const msg of msgs) {
      const senderId    = msg.sender?._id?.toString();
      const recipientId = msg.recipient?._id?.toString();
      const myIdStr     = myId.toString();

      const otherId   = senderId === myIdStr ? recipientId   : senderId;
      const otherUser = senderId === myIdStr ? msg.recipient : msg.sender;
      
      // sharedEvent nesnesinin dolu olup olmadığını kontrol et (sadece boş obje gelmesine karşı isim kontrolü yap)
      const isShared = msg.sharedEvent && msg.sharedEvent.name ? true : false;

      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          user:        otherUser,
          lastMessage: { text: msg.text, createdAt: msg.createdAt, senderId, hasSharedEvent: isShared },
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

    // Önce en yeni 100 kaydı alıyoruz. `createdAt: 1` ile `limit(100)`
    // kullanmak, yoğun konuşmalarda yanlışlıkla en eski 100 mesajı döndürür;
    // bu da son paylaşılan etkinlik kartının solda görünmesine rağmen sohbetten
    // kaybolmuş gibi görünmesine sebep olur.
    const latestMessages = await Message.find({
      type: 'direct',
      $or: [
        { sender: myId,    recipient: otherId },
        { sender: otherId, recipient: myId    },
      ],
      hiddenFor: { $ne: myId },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Arayüzde soldan sağa/doğal konuşma akışı için tekrar eskiden yeniye dön.
    res.json(latestMessages.reverse());
  } catch (e) { next(e); }
});

// ── GET /api/messages/room/:roomId ──────────────────────────────────────────
// Bildirimden gelen oda katılımcısı, kaydedilmiş oda sohbetini açar. Oda
// katılımcısı olmayan hiç kimse bu endpoint üzerinden mesajlara erişemez.
router.get('/room/:roomId', protect, async (req, res, next) => {
  try {
    const roomId = req.params.roomId;
    if (!mongoose.isValidObjectId(roomId)) {
      res.status(400); throw new Error('Geçersiz oda ID');
    }

    const room = await Room.exists({ _id: roomId, participants: req.user._id });
    if (!room) {
      res.status(403); throw new Error('Bu odanın sohbetine erişim yetkiniz yok');
    }

    const latestMessages = await Message.find({ type: 'room', room: roomId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(latestMessages.reverse());
  } catch (e) { next(e); }
});

// ── POST /api/messages/dm/:userId ────────────────────────────────────────────
// Socket müsait değilse REST üzerinden DM gönder.
router.post('/dm/:userId', protect, async (req, res, next) => {
  try {
    const { text, sharedEvent } = req.body;
    const messageText = text?.trim().slice(0, 500) || '';
    const eventCard = normalizeSharedEvent(sharedEvent);
    if (!messageText && !eventCard) { res.status(400); throw new Error('Mesaj boş olamaz'); }

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
      text:       messageText,
      sharedEvent: eventCard,
    });

    // HTTP fallback ile gönderilse bile alıcıya socket üzerinden anlık ilet!
    try {
      const io = getIo();
      if (io) {
        const msgPayload = {
          _id:        msg._id.toString(),
          type:       'direct',
          sender:     req.user._id.toString(),
          senderName: req.user.username,
          recipient:  otherId.toString(),
          text:       messageText,
          sharedEvent: msg.sharedEvent?.toObject?.() || eventCard,
          createdAt:  msg.createdAt,
        };
        
        io.to(`user:${otherId}`).emit('receive_direct_message', msgPayload);
        
        const notifMsg = msgPayload.text
          ? `${msgPayload.senderName}: ${msgPayload.text}`
          : `${msgPayload.senderName} bir etkinlik paylaştı 🎟`;
        
        const notif = await Notification.create({
          user: otherId,
          message: notifMsg,
          type: 'message',
          link: `/messages`
        });
        io.to(`user:${otherId}`).emit('new_notification', notif);
      }
    } catch (err) {
      console.error('HTTP Fallback Socket Emit Error:', err.message);
    }

    res.status(201).json(msg);
  } catch (e) { next(e); }
});

// ── DELETE /api/messages/conversation/:userId ───────────────────────────────
// Sohbet yalnızca isteği yapan kullanıcının ekranından temizlenir.
router.delete('/conversation/:userId', protect, async (req, res, next) => {
  try {
    const otherId = req.params.userId;
    if (!mongoose.isValidObjectId(otherId)) {
      res.status(400);
      throw new Error('Geçersiz kullanıcı ID');
    }

    await Message.updateMany(
      {
        type: 'direct',
        $or: [
          { sender: req.user._id, recipient: otherId },
          { sender: otherId, recipient: req.user._id },
        ],
      },
      { $addToSet: { hiddenFor: req.user._id } },
    );

    res.json({ message: 'Sohbet temizlendi' });
  } catch (e) { next(e); }
});

// ── DELETE /api/messages/dm/:messageId ──────────────────────────────────────
// Gönderen, kendi doğrudan mesajını her iki taraftan da kaldırabilir.
router.delete('/dm/:messageId', protect, async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    if (!mongoose.isValidObjectId(messageId)) {
      res.status(400);
      throw new Error('Geçersiz mesaj ID');
    }

    const message = await Message.findOneAndDelete({
      _id: messageId,
      type: 'direct',
      sender: req.user._id,
    }).lean();

    if (!message) {
      res.status(404);
      throw new Error('Mesaj bulunamadı veya silme yetkiniz yok');
    }

    const payload = {
      messageId: message._id.toString(),
      sender: message.sender.toString(),
      recipient: message.recipient.toString(),
    };
    const io = getIo();
    io?.to(`user:${payload.sender}`).emit('direct_message_deleted', payload);
    io?.to(`user:${payload.recipient}`).emit('direct_message_deleted', payload);

    res.json({ message: 'Mesaj silindi', messageId: payload.messageId });
  } catch (e) { next(e); }
});

export default router;
