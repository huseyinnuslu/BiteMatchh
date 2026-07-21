/**
 * socketManager.js  v2
 * BiteMatch – Socket.IO Olay Yoneticisi
 */

import Message from '../models/Message.js';

const roomLikes        = new Map();
const roomParticipants = new Map();
const onlineUsers      = new Map(); // userId -> socketId

const getRoomLikes        = (rc) => { if (!roomLikes.has(rc))        roomLikes.set(rc, new Map());        return roomLikes.get(rc); };
const getRoomParticipants = (rc) => { if (!roomParticipants.has(rc)) roomParticipants.set(rc, new Set()); return roomParticipants.get(rc); };
const cleanupRoom         = (rc) => { roomLikes.delete(rc); roomParticipants.delete(rc); };

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Baglandi: ${socket.id}`);

    // user_online: kullanici uygulamaya girerken cagrilir
    socket.on('user_online', ({ userId, friendIds = [] }) => {
      if (!userId) return;
      socket.data.userId = userId;
      onlineUsers.set(userId, socket.id);
      friendIds.forEach(fid => {
        const fSocket = onlineUsers.get(fid);
        if (fSocket) io.to(fSocket).emit('friend_online', { userId });
      });
      const onlineFriends = friendIds.filter(fid => onlineUsers.has(fid));
      socket.emit('online_friends', { onlineFriends });
    });

    // join_room
    socket.on('join_room', ({ roomCode, userId, username }) => {
      if (!roomCode || !userId) return;
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userId   = userId;
      socket.data.username = username;
      const participants = getRoomParticipants(roomCode);
      participants.add(userId);
      socket.to(roomCode).emit('participant_joined', { userId, username, count: participants.size });
      socket.emit('room_joined', { roomCode, participantCount: participants.size });
    });

    // swipe_action
    socket.on('swipe_action', ({ roomCode, userId, itemId, direction }) => {
      if (!roomCode || !userId || !itemId) return;
      socket.to(roomCode).emit('user_swiped', { userId, username: socket.data.username, itemId, direction });
      if (direction !== 'right') return;
      const likes = getRoomLikes(roomCode);
      if (!likes.has(itemId)) likes.set(itemId, new Set());
      likes.get(itemId).add(userId);
      const participants = getRoomParticipants(roomCode);
      if (participants.size >= 2 && likes.get(itemId).size >= participants.size) {
        io.to(roomCode).emit('match_success', { itemId, likedBy: [...likes.get(itemId)] });
        likes.delete(itemId);
      }
    });

    // send_message: oda ici mesaj
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
        try { await Message.create({ room: roomId, sender: userId, senderName: username, text: text.slice(0, 500) }); }
        catch (e) { console.error('Mesaj kaydedilemedi:', e.message); }
      }
    });

    // invite_to_room: arkadasini odaya davet et
    socket.on('invite_to_room', ({ friendId, roomCode, roomId, inviterName }) => {
      if (!friendId || !roomCode) return;
      const friendSocket = onlineUsers.get(friendId);
      if (friendSocket) {
        io.to(friendSocket).emit('room_invitation', { roomCode, roomId, inviterName, message: `${inviterName} sizi bir odaya davet etti!` });
      }
    });

    // friend_request_notify
    socket.on('friend_request_notify', ({ toUserId, fromUsername }) => {
      const toSocket = onlineUsers.get(toUserId);
      if (toSocket) io.to(toSocket).emit('new_friend_request', { fromUsername, message: `${fromUsername} size arkadaslik istegi gonderdi` });
    });

    // send_direct_message: arkadaslar arasi DM
    // Payload: { toUserId, text, senderName }
    socket.on('send_direct_message', async ({ toUserId, text, senderName }) => {
      const myId = socket.data.userId;
      if (!myId || !toUserId || !text?.trim()) return;

      const msg = {
        _id:        Date.now().toString(),
        type:       'direct',
        sender:     myId,
        senderName: senderName || socket.data.username,
        recipient:  toUserId,
        text:       text.slice(0, 500),
        createdAt:  new Date().toISOString(),
      };

      // Aliciya ilet (online ise)
      const toSocket = onlineUsers.get(toUserId);
      if (toSocket) io.to(toSocket).emit('receive_direct_message', msg);

      // Gönderene de yansit (birden fazla sekme/cihaz icin)
      socket.emit('receive_direct_message', { ...msg, isMine: true });

      // DB'ye async kaydet
      try {
        await Message.create({
          type:       'direct',
          sender:     myId,
          senderName: msg.senderName,
          recipient:  toUserId,
          text:       msg.text,
        });
      } catch (e) { console.error('DM kaydedilemedi:', e.message); }
    });

    // disconnect
    socket.on('disconnect', (reason) => {
      const { roomCode, userId, username } = socket.data;
      if (userId) {
        onlineUsers.delete(userId);
        io.emit('friend_offline', { userId });
      }
      if (roomCode && userId) {
        const participants = getRoomParticipants(roomCode);
        participants.delete(userId);
        socket.to(roomCode).emit('participant_left', { userId, username, count: participants.size });
        if (participants.size === 0) { cleanupRoom(roomCode); }
      }
    });

    socket.on('ping_room', ({ roomCode }) => socket.emit('pong_room', { roomCode, ts: Date.now() }));
  });
};
