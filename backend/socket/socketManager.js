/**
 * socketManager.js
 * BiteMatch – Socket.IO Olay Yöneticisi
 *
 * Oda bazlı gerçek zamanlı olaylar:
 *   join_room      → Kullanıcıyı socket odasına ekle
 *   swipe_action   → Kaydırma olayını diğer kullanıcılara ilet
 *   match_success  → Eşleşme tespit edildiğinde odaya yayınla
 *
 * Eşleşme kontrolü MongoDB'ye gitmeden, bellekte tutulan
 * oda bazlı "like" listeleri ile anlık yapılır.
 */

// ─── Bellek içi veri yapıları ───────────────────────────────────────────────
// roomLikes: { [roomCode]: { [itemId]: Set<userId> } }
// Aynı kişi aynı item'ı tekrar like'lasa sorun olmasın.
const roomLikes = new Map();

// roomParticipants: { [roomCode]: Set<userId> }
// Odadaki aktif katılımcı sayısını takip etmek için.
const roomParticipants = new Map();

// ─── Yardımcı fonksiyonlar ──────────────────────────────────────────────────
const getRoomLikes = (roomCode) => {
  if (!roomLikes.has(roomCode)) roomLikes.set(roomCode, new Map());
  return roomLikes.get(roomCode);
};

const getRoomParticipants = (roomCode) => {
  if (!roomParticipants.has(roomCode)) roomParticipants.set(roomCode, new Set());
  return roomParticipants.get(roomCode);
};

const cleanupRoom = (roomCode) => {
  roomLikes.delete(roomCode);
  roomParticipants.delete(roomCode);
};

// ─── Ana başlatma fonksiyonu ────────────────────────────────────────────────
export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Bağlandı: ${socket.id}`);

    // ── join_room ────────────────────────────────────────────────────────────
    // Payload: { roomCode: string, userId: string, username: string }
    socket.on('join_room', ({ roomCode, userId, username }) => {
      if (!roomCode || !userId) return;

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userId = userId;
      socket.data.username = username;

      // Katılımcıyı kaydet
      const participants = getRoomParticipants(roomCode);
      participants.add(userId);

      console.log(`👥 ${username || userId} → oda: ${roomCode} (${participants.size} kişi)`);

      // Odadaki diğer kullanıcılara yeni katılımcıyı bildir
      socket.to(roomCode).emit('participant_joined', {
        userId,
        username,
        count: participants.size,
      });

      // Kendisine oda bilgisini gönder
      socket.emit('room_joined', {
        roomCode,
        participantCount: participants.size,
      });
    });

    // ── swipe_action ─────────────────────────────────────────────────────────
    // Payload: { roomCode, userId, itemId, direction: 'right' | 'left' }
    socket.on('swipe_action', ({ roomCode, userId, itemId, direction }) => {
      if (!roomCode || !userId || !itemId) return;

      // Diğer kullanıcılara anlık bildir
      socket.to(roomCode).emit('user_swiped', {
        userId,
        username: socket.data.username,
        itemId,
        direction,
      });

      // Sadece "right" (like) eşleşme kontrolüne girer
      if (direction !== 'right') return;

      const likes = getRoomLikes(roomCode);
      if (!likes.has(itemId)) likes.set(itemId, new Set());
      likes.get(itemId).add(userId);

      const participants = getRoomParticipants(roomCode);
      const participantCount = participants.size;

      // Eşleşme: odadaki herkes bu item'ı beğendiyse
      if (
        participantCount >= 2 &&
        likes.get(itemId).size >= participantCount
      ) {
        console.log(`🎉 Eşleşme! Oda: ${roomCode} | Item: ${itemId}`);

        io.to(roomCode).emit('match_success', {
          itemId,
          likedBy: [...likes.get(itemId)],
        });

        // Eşleşen item'ı temizle (tekrar tetiklenmesin)
        likes.delete(itemId);
      }
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const { roomCode, userId, username } = socket.data;
      console.log(`❌ Ayrıldı: ${socket.id} (${reason})`);

      if (roomCode && userId) {
        const participants = getRoomParticipants(roomCode);
        participants.delete(userId);

        // Odadaki diğer kullanıcılara haber ver
        socket.to(roomCode).emit('participant_left', {
          userId,
          username,
          count: participants.size,
        });

        // Oda boşaldıysa bellekten temizle
        if (participants.size === 0) {
          cleanupRoom(roomCode);
          console.log(`🧹 Oda temizlendi: ${roomCode}`);
        }
      }
    });

    // ── ping (bağlantı canlılık testi) ───────────────────────────────────────
    socket.on('ping_room', ({ roomCode }) => {
      socket.emit('pong_room', { roomCode, ts: Date.now() });
    });
  });
};
