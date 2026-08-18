/**
 * socketManager.js  v3
 * BiteMatch – Socket.IO Olay Yoneticisi
 *
 * MIMARISI:
 *  - Her kullanıcı bağlandığında kendi kişisel Socket.IO odasına (user:{userId}) giriyor.
 *  - Mesaj/bildirim gönderiminde socketId yerine bu oda kullanılıyor.
 *  - Bu sayede: sunucu restart, birden fazla sekme/cihaz sorunları çözülüyor.
 *  - onlineUsers Map'i sadece "online presence" göstergesi için kullanılıyor.
 */

import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';

const roomLikes        = new Map();
const roomParticipants = new Map();
const onlineUsers      = new Map(); // userId -> Set<socketId> (presence only)

const getRoomLikes        = (rc) => { if (!roomLikes.has(rc))        roomLikes.set(rc, new Map());        return roomLikes.get(rc); };
const getRoomParticipants = (rc) => { if (!roomParticipants.has(rc)) roomParticipants.set(rc, new Set()); return roomParticipants.get(rc); };
const cleanupRoom         = (rc) => { roomLikes.delete(rc); roomParticipants.delete(rc); };

// Kullanıcının kişisel socket odasının adı
const userRoom = (userId) => `user:${userId}`;

// Paylaşılan kart, socket ve veritabanında aynı ve eksiksiz şekle sahip olmalı.
// Boş/yarım bir nesne “etkinlik paylaştı” bildirimi üretmez.
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

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Baglandi: ${socket.id}`);

    // 🔥 BAĞLANTI ANINDA OTOMATİK ODAYA KATIL (Eski PWA cache'li frontend'ler için hayat kurtarıcı!)
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const uId = decoded.id.toString();
          socket.data.userId = uId;
          socket.join(userRoom(uId));
          
          if (!onlineUsers.has(uId)) onlineUsers.set(uId, new Set());
          onlineUsers.get(uId).add(socket.id);
        }
      }
    } catch (err) {
      console.warn('Socket token verify hatası:', err.message);
    }

    // ── user_online ────────────────────────────────────────────────────────────
    // Kullanıcı uygulamaya girerken çağrılır.
    // Artık userId bazlı kişisel odaya da katılıyor.
    socket.on('user_online', ({ userId, friendIds = [] }) => {
      if (!userId) return;

      socket.data.userId = userId;

      // Kişisel odaya katıl (mesaj teslimi için anahtar adım)
      socket.join(userRoom(userId));

      // Presence map güncelle
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      // Arkadaşlara "online" bildirimi gönder
      friendIds.forEach(fid => {
        if (onlineUsers.has(fid)) {
          io.to(userRoom(fid)).emit('friend_online', { userId });
        }
      });

      // Bu kullanıcıya online arkadaşlarını gönder
      const onlineFriends = friendIds.filter(fid => onlineUsers.has(fid));
      socket.emit('online_friends', { onlineFriends });
    });

    // ── join_room (Oy odası) ──────────────────────────────────────────────────
    socket.on('join_room', ({ roomCode, userId, username }) => {
      if (!roomCode || !userId) return;
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userId   = userId;
      socket.data.username = username;

      // Kişisel odaya da katıl (bağlantı kopsa bile mesaj alabilsin)
      socket.join(userRoom(userId));
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      const participants = getRoomParticipants(roomCode);
      const isNewParticipant = !participants.has(userId);
      participants.add(userId);
      if (isNewParticipant) {
        socket.to(roomCode).emit('participant_joined', { userId, username, count: participants.size });
      }
      socket.emit('room_joined', { roomCode, participantCount: participants.size });
    });

    // ── leave_room (Odadan Çıkış) ──────────────────────────────────────────────
    socket.on('leave_room', ({ roomCode, userId, username }) => {
      if (!roomCode) return;
      socket.leave(roomCode);
      if (socket.data.roomCode === roomCode) {
        socket.data.roomCode = null;
      }
      if (userId) {
        const participants = getRoomParticipants(roomCode);
        const wasParticipant = participants.delete(userId);
        if (wasParticipant) {
          socket.to(roomCode).emit('participant_left', { userId, username, count: participants.size });
        }
        if (participants.size === 0) { cleanupRoom(roomCode); }
      }
    });

    // ── swipe_action ─────────────────────────────────────────────────────────
    socket.on('swipe_action', ({ roomCode, userId, itemId, direction, completed = false }) => {
      if (!roomCode || !userId || !itemId) return;
      socket.to(roomCode).emit('user_swiped', { userId, username: socket.data.username, itemId, direction, completed: Boolean(completed) });
    });

    // ── send_message (Oda içi sohbet) ────────────────────────────────────────
    socket.on('send_message', async ({ roomCode, roomId, userId, username, text }) => {
      if (!roomCode || !userId || !text?.trim()) return;
      const msg = {
        _id:        Date.now().toString(),
        sender:     userId,
        senderName: username,
        text:       text.slice(0, 500),
        createdAt:  new Date().toISOString(),
      };
      io.to(roomCode).emit('receive_message', msg);
      if (roomId) {
        try { 
          await Message.create({ room: roomId, sender: userId, senderName: username, text: text.slice(0, 500) }); 
          // Oda katılımcılarına genel bildirim de at (odada değilseler bile alsınlar)
          const RoomModel = (await import('../models/Room.js')).default;
          const room = await RoomModel.findById(roomId).select('participants name');
          if (room) {
            room.participants.forEach(async (pId) => {
              if (pId.toString() !== userId) {
                const notif = await Notification.create({
                  user: pId,
                  message: `${room.name} - ${username}: ${text.slice(0, 30)}`,
                  type: 'message',
                  // Sonuçlanmış odaya düz gitmek eşleşme modalını açıyordu.
                  // Bildirimden gelen kullanıcı doğrudan oda sohbetini görür.
                  link: `/room/${roomId}?chat=1`
                });
                io.to(`user:${pId.toString()}`).emit('new_notification', notif);
              }
            });
          }
        }
        catch (e) { console.error('Mesaj kaydedilemedi:', e.message); }
      }
    });

    // ── invite_to_room ───────────────────────────────────────────────────────
    socket.on('invite_to_room', async ({ friendId, roomCode, roomId, inviterName }) => {
      if (!friendId || !roomCode) return;
      const message = `${inviterName} sizi bir odaya davet etti!`;
      try {
        const notif = await Notification.create({
          user: friendId, message,
          type: 'room_invite',
          link: `/room/${roomId}`
        });
        // Kişisel oda ile gönder — socketId'ye gerek yok
        io.to(userRoom(friendId)).emit('new_notification', notif);
        io.to(userRoom(friendId)).emit('room_invitation', {
          roomCode,
          roomId,
          inviterName,
          message,
          notificationId: notif._id.toString(),
        });
      } catch (e) { console.error('Bildirim kaydedilemedi:', e.message); }
    });

    // ── friend_request_notify ────────────────────────────────────────────────
    socket.on('friend_request_notify', async ({ toUserId, fromUsername }) => {
      const message = `${fromUsername} size arkadaşlık isteği gönderdi`;
      try {
        const notif = await Notification.create({
          user: toUserId, message,
          type: 'friend_request',
          link: `/profile`
        });
        io.to(userRoom(toUserId)).emit('new_notification', notif);
        io.to(userRoom(toUserId)).emit('new_friend_request', { fromUsername, message });
      } catch (e) { console.error('Bildirim kaydedilemedi:', e.message); }
    });

    // ── send_direct_message ──────────────────────────────────────────────────
    // ARTIK kişisel oda (user:{toUserId}) kullanılıyor.
    // SocketId tabanlı onlineUsers.get() yerine io.to(userRoom()) kullanıyoruz.
    // Bu; sunucu restart, yeniden bağlanma, birden fazla cihaz sorunlarını çözer.
    socket.on('send_direct_message', async ({ toUserId, text, senderName, sharedEvent, fromUserId }) => {
      // fromUserId: frontend artık açıkça gönderiyor (güvenilir fallback)
      const myId = fromUserId || socket.data.userId;
      if (!myId || !toUserId) return;
      const messageText = text?.trim().slice(0, 500) || '';
      const eventCard = normalizeSharedEvent(sharedEvent);
      if (!messageText && !eventCard) return;

      // socket.data.userId her zaman güncel kalsın
      if (!socket.data.userId) {
        socket.data.userId = myId;
        socket.join(userRoom(myId));
      }

      const msgPayload = {
        _id:        Date.now().toString(),
        type:       'direct',
        sender:     myId,
        senderName: senderName || socket.data.username,
        recipient:  toUserId,
        text:       messageText,
        sharedEvent: eventCard,
        createdAt:  new Date().toISOString(),
      };

      // ✅ Alıcıya ilet — kişisel oda sayesinde kaç cihazda açıksa hepsine gider

      // ✅ Gönderene de gönder (birden fazla cihaz/sekme varsa diğerleri de görsün)
      // Ama sadece bu socket'ı değil, userRoom'u kullan (diğer cihazlar da alsın)

      // DB'ye kaydet + bildirim
      try {
         const savedMessage = await Message.create({
          type: 'direct',
          sender: myId,
          senderName: msgPayload.senderName,
          recipient: toUserId,
          text: msgPayload.text,
          sharedEvent: eventCard,
         });

         msgPayload._id = savedMessage._id.toString();
         msgPayload.createdAt = savedMessage.createdAt.toISOString();
         // İletilen kart, MongoDB'ye gerçekten kaydedilmiş karttır.
         msgPayload.sharedEvent = savedMessage.sharedEvent?.toObject?.() || eventCard;
         io.to(userRoom(toUserId)).emit('receive_direct_message', msgPayload);
         socket.to(userRoom(myId)).emit('receive_direct_message', { ...msgPayload, isMine: true });

        const notifMsg = msgPayload.text
          ? `${msgPayload.senderName}: ${msgPayload.text}`
          : `${msgPayload.senderName} bir etkinlik paylaştı 🎟`;
        const notif = await Notification.create({
          user: toUserId,
          message: notifMsg,
          type: 'message',
          link: `/messages`
        });
        io.to(userRoom(toUserId)).emit('new_notification', notif);

      } catch (e) { console.error('DM veya Bildirim kaydedilemedi:', e.message); }
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const { roomCode, userId, username } = socket.data;

      if (userId) {
        // Birden fazla sekme/cihaz desteği: sadece bu socket'ı kaldır
        const sockets = onlineUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            // Tüm cihazlar kapandıysa offline bildir
            io.emit('friend_offline', { userId });
          }
        }
      }

      if (roomCode && userId) {
        const participants = getRoomParticipants(roomCode);
        const wasParticipant = participants.delete(userId);
        if (wasParticipant) {
          socket.to(roomCode).emit('participant_left', { userId, username, count: participants.size });
        }
        if (participants.size === 0) { cleanupRoom(roomCode); }
      }
    });

    socket.on('ping_room', ({ roomCode }) => socket.emit('pong_room', { roomCode, ts: Date.now() }));
  });
};
