import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { X, Send, MessageCircle, ChevronDown } from 'lucide-react';
import { getSocket } from '../socket/socketClient';
import api from '../api';

const QUICK_REPLIES = [
  'Hangi saatte buluşuyoruz?',
  'Mekânda buluşalım mı?',
  'Rezervasyon yapayım mı?',
  'Yolda mısın?',
  'Harika seçim.',
  'Ben de aynı fikirdeyim.',
];

// İlk test sürümlerinde hızlı cevaplar ASCII karakterler ve emoji ile
// kaydedilmişti. Bu yalnızca o birebir eski şablonları ekranda düzeltir;
// kullanıcıların kendi yazdığı mesajlara kesinlikle müdahale etmez.
const LEGACY_QUICK_REPLY_TEXTS = new Map([
  ['Hangi saatte bulusuyoruz? 🕐', 'Hangi saatte buluşuyoruz?'],
  ['Hangi saatte bulusuyoruz?', 'Hangi saatte buluşuyoruz?'],
  ['Mekanda bulusalalim mi? 📍', 'Mekânda buluşalım mı?'],
  ['Mekanda bulusalalim mi?', 'Mekânda buluşalım mı?'],
  ['Rezervasyon yapayim mi? 🍽️', 'Rezervasyon yapayım mı?'],
  ['Rezervasyon yapayim mi?', 'Rezervasyon yapayım mı?'],
  ['Yolda misin? 🚗', 'Yolda mısın?'],
  ['Harika secim! 🎉', 'Harika seçim.'],
  ['Harika secim!', 'Harika seçim.'],
  ['Ben de ayni fikirdeyim 👍', 'Ben de aynı fikirdeyim.'],
  ['Ben de ayni fikirdeyim', 'Ben de aynı fikirdeyim.'],
]);

const displayMessageText = (text) => LEGACY_QUICK_REPLY_TEXTS.get(text) || text;

const ChatDrawer = ({ isOpen, onClose, roomCode, roomId, matchedItem }) => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef(null);

  // Bildirimden gelen oda katılımcısı geçmiş oda sohbetini de görür.
  useEffect(() => {
    if (!isOpen || !roomId) return;
    let cancelled = false;
    api.get(`/messages/room/${roomId}`)
      .then(({ data }) => { if (!cancelled) setMessages(data); })
      .catch(() => { if (!cancelled) setMessages([]); });
    return () => { cancelled = true; };
  }, [isOpen, roomId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isOpen) return;
    const handler = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('receive_message', handler);
    return () => socket.off('receive_message', handler);
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('send_message', { roomCode, roomId, userId: user._id, username: user.username, text: trimmed });
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        transition: 'height 0.3s ease', height: minimized ? '52px' : '420px',
        overflow: 'hidden', pointerEvents: 'all',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => setMinimized(m => !m)}>
          <MessageCircle size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>{matchedItem?.name || 'Sohbet'}</span>
          {messages.length > 0 && minimized && (
            <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{messages.length > 9 ? '9+' : messages.length}</span>
          )}
          <ChevronDown size={16} style={{ transform: minimized ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.2s', color: 'var(--text-muted)' }} />
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>

        {!minimized && (
          <>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                padding: '0.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
              onWheel={(event) => event.stopPropagation()}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '2rem' }}>
                  <MessageCircle size={30} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '0.85rem' }}>Eşleştiniz. Şimdi plan yapın.</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.sender === user._id || msg.sender === user._id?.toString();
                return (
                  <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '75%', minWidth: 0, background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.08)', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '0.5rem 0.75rem', fontSize: '0.88rem', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {!isMe && <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.2rem' }}>{msg.senderName}</div>}
                      <div>{displayMessageText(msg.text)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Quick Replies */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0 0.75rem 0.5rem', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
              {QUICK_REPLIES.map((qr, i) => (
                <button key={i} onClick={() => sendMessage(qr)} style={{ whiteSpace: 'nowrap', flexShrink: 0, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '0.3rem 0.7rem', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer' }}>{qr}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem 0.75rem', flexShrink: 0 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Bir şeyler yaz..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.6rem 0.9rem', color: 'white', fontSize: '0.9rem', outline: 'none' }} />
              <button onClick={() => sendMessage()} disabled={!input.trim()}
                style={{ width: 42, height: 42, borderRadius: '12px', border: 'none', background: input.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.07)', color: 'white', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatDrawer;
