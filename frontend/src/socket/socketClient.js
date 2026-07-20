/**
 * socketClient.js
 * BiteMatch – Socket.IO istemci bağlantı yöneticisi
 *
 * Singleton pattern: tüm uygulama boyunca tek bir socket bağlantısı kullanılır.
 * connect() → bağlantıyı başlatır
 * disconnect() → temizler
 * getSocket() → mevcut instance'ı döner
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

let socket = null;

/**
 * Socket bağlantısını başlat (zaten bağlıysa mevcut instance'ı döner)
 * @param {string} token - JWT token (kimlik doğrulama için auth header'a eklenir)
 */
export const connectSocket = (token) => {
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'], // önce websocket, düşerse polling
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('🟢 Socket bağlandı:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('🔴 Socket bağlantı hatası:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket bağlantı kesildi:', reason);
  });

  return socket;
};

/**
 * Mevcut socket instance'ını döner (bağlı olsun ya da olmasın)
 */
export const getSocket = () => socket;

/**
 * Socket bağlantısını kapat ve instance'ı temizle
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket bağlantısı kapatıldı');
  }
};
