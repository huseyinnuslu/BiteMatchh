/**
 * Messages.jsx
 * BiteMatch – Doğrudan Mesajlaşma Sayfası
 * /messages route'unda erişilir, Navbar'dan ulaşılabilir.
 */
import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../socket/socketClient';
import api from '../api';
import { Send, Search, MessageCircle, ArrowLeft, UserCircle2, Circle } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────── */
/* Yardımcılar                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */
const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
};

const Avatar = ({ username = '?', size = 40, online = false }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.4,
      color: 'white', userSelect: 'none',
    }}>
      {username[0]?.toUpperCase()}
    </div>
    {online && (
      <span style={{
        position: 'absolute', bottom: 1, right: 1,
        width: size * 0.28, height: size * 0.28,
        borderRadius: '50%', background: '#22c55e',
        border: '2px solid var(--bg-card)',
        boxShadow: '0 0 6px #22c55e',
      }} />
    )}
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────── */
/* Ana Bileşen                                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */
const Messages = () => {
  const { user } = useContext(AuthContext);

  // Konuşma listesi
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends]             = useState([]);
  const [onlineFriends, setOnlineFriends] = useState(new Set());
  const [searchQ, setSearchQ]             = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(true);

  // Aktif sohbet
  const [activeUser, setActiveUser]   = useState(null); // { _id, username }
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Mobil: panel gösterimi
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  /* ── Konuşmalar ve arkadaş listesini yükle ── */
  useEffect(() => {
    Promise.all([
      api.get('/messages/conversations').then(({ data }) => setConversations(data)).catch(() => {}),
      api.get('/users/friends').then(({ data }) => setFriends(data)).catch(() => {}),
    ]).finally(() => setLoadingConvs(false));
  }, []);

  /* ── Socket: DM dinle, online takip ── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Gelen DM
    const dmHandler = (msg) => {
      // Aktif sohbet bu kişiyle mi?
      if (
        activeUser &&
        (msg.sender === activeUser._id || msg.recipient === activeUser._id)
      ) {
        setMessages(prev => {
          // Optimistic duplicate kontrolü
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }

      // Konuşma listesinde son mesajı güncelle
      setConversations(prev => {
        const otherId   = msg.sender === user._id ? msg.recipient : msg.sender;
        const otherName = msg.sender === user._id ? msg.senderName : msg.senderName;
        const idx = prev.findIndex(c => c.user?._id?.toString() === otherId?.toString());
        const newMsg = { text: msg.text, createdAt: msg.createdAt, senderId: msg.sender };
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], lastMessage: newMsg };
          return updated;
        }
        return [{ user: { _id: otherId, username: otherName }, lastMessage: newMsg }, ...prev];
      });
    };

    const onlineHandler  = ({ userId }) => setOnlineFriends(p => new Set([...p, userId]));
    const offlineHandler = ({ userId }) => setOnlineFriends(p => { const n = new Set(p); n.delete(userId); return n; });

    socket.on('receive_direct_message', dmHandler);
    socket.on('friend_online',  onlineHandler);
    socket.on('friend_offline', offlineHandler);

    return () => {
      socket.off('receive_direct_message', dmHandler);
      socket.off('friend_online',  onlineHandler);
      socket.off('friend_offline', offlineHandler);
    };
  }, [activeUser, user._id]);

  /* ── Aktif sohbet mesajlarını yükle ── */
  useEffect(() => {
    if (!activeUser) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/messages/dm/${activeUser._id}`)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeUser?._id]);

  /* ── Otomatik scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Konuşma aç ── */
  const openChat = useCallback((u) => {
    setActiveUser(u);
    setMobileView('chat');
    setTimeout(() => inputRef.current?.focus(), 100);

    // Konuşma yoksa listeye ekle
    setConversations(prev => {
      if (prev.find(c => c.user?._id?.toString() === u._id?.toString())) return prev;
      return [{ user: u, lastMessage: null }, ...prev];
    });
  }, []);

  /* ── Mesaj gönder ── */
  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !activeUser) return;

    const socket = getSocket();
    const tempId = Date.now().toString();

    // Optimistic UI
    const optimistic = {
      _id:        tempId,
      type:       'direct',
      sender:     user._id,
      senderName: user.username,
      recipient:  activeUser._id,
      text:       trimmed,
      createdAt:  new Date().toISOString(),
      isMine:     true,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    if (socket) {
      socket.emit('send_direct_message', {
        toUserId:   activeUser._id,
        text:       trimmed,
        senderName: user.username,
      });
    } else {
      // REST fallback
      api.post(`/messages/dm/${activeUser._id}`, { text: trimmed }).catch(() => {});
    }

    // Konuşma listesini güncelle
    setConversations(prev => {
      const idx = prev.findIndex(c => c.user?._id?.toString() === activeUser._id?.toString());
      const newMsg = { text: trimmed, createdAt: optimistic.createdAt, senderId: user._id };
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessage: newMsg };
        return updated;
      }
      return prev;
    });
  }, [input, activeUser, user]);

  /* ──────────────────────────────────────────────────────── */
  /* Birleşik kişi listesi: konuşmalar + diğer arkadaşlar   */
  /* ──────────────────────────────────────────────────────── */
  const convUserIds = new Set(conversations.map(c => c.user?._id?.toString()));
  const otherFriends = friends.filter(f => !convUserIds.has(f._id?.toString()));

  const filteredConvs = conversations.filter(c =>
    c.user?.username?.toLowerCase().includes(searchQ.toLowerCase())
  );
  const filteredFriends = otherFriends.filter(f =>
    f.username?.toLowerCase().includes(searchQ.toLowerCase())
  );

  /* ──────────────────────────────────────────────────────── */
  /* RENDER                                                   */
  /* ──────────────────────────────────────────────────────── */
  return (
    <div style={{
      display: 'flex', gap: 0,
      height: 'calc(100vh - 130px)',
      borderRadius: '20px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(20px)',
    }}>

      {/* ── Sol Panel: Konuşma Listesi ────────────────────────── */}
      <div style={{
        width: 300, minWidth: 300, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        // Mobil: chat açıkken gizle
        ...(mobileView === 'chat' && window.innerWidth < 640 ? { display: 'none' } : {}),
      }}>
        {/* Başlık */}
        <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ margin: '0 0 0.9rem', fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageCircle size={20} color="var(--primary)" />
            Mesajlar
          </h2>
          {/* Arama */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Ara..."
              style={{
                width: '100%', paddingLeft: 30, padding: '0.5rem 0.75rem 0.5rem 30px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: 'white', fontSize: '0.85rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {loadingConvs ? (
            [1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '0.85rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 6, animation: 'shimmer 1.4s infinite' }} />
                  <div style={{ height: 10, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 6, animation: 'shimmer 1.4s infinite' }} />
                </div>
              </div>
            ))
          ) : (
            <>
              {/* Mevcut Konuşmalar */}
              {filteredConvs.length > 0 && (
                <>
                  <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Konuşmalar</div>
                  {filteredConvs.map((conv, i) => {
                    const u = conv.user;
                    const isActive  = activeUser?._id === u?._id?.toString();
                    const isOnline  = onlineFriends.has(u?._id?.toString());
                    const lastText  = conv.lastMessage?.text || '';
                    const lastTime  = conv.lastMessage?.createdAt;
                    const isMeSender = conv.lastMessage?.senderId?.toString() === user._id?.toString();
                    return (
                      <div
                        key={u?._id || i}
                        onClick={() => openChat(u)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Avatar username={u?.username} size={42} online={isOnline} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', marginBottom: '0.15rem' }}>@{u?.username}</div>
                          {lastText && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isMeSender ? 'Sen: ' : ''}{lastText}
                            </div>
                          )}
                        </div>
                        {lastTime && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{formatTime(lastTime)}</span>}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Diğer Arkadaşlar (konuşma yoksa) */}
              {filteredFriends.length > 0 && (
                <>
                  <div style={{ padding: '0.75rem 1rem 0.25rem', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Arkadaşlar</div>
                  {filteredFriends.map((f) => {
                    const isOnline = onlineFriends.has(f._id?.toString());
                    const isActive = activeUser?._id === f._id?.toString();
                    return (
                      <div
                        key={f._id}
                        onClick={() => openChat(f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Avatar username={f.username} size={42} online={isOnline} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>@{f.username}</div>
                          <div style={{ fontSize: '0.75rem', color: isOnline ? '#22c55e' : 'var(--text-muted)' }}>
                            {isOnline ? '● Çevrimiçi' : '○ Çevrimdışı'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {filteredConvs.length === 0 && filteredFriends.length === 0 && !loadingConvs && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <MessageCircle size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.85rem' }}>
                    {searchQ ? 'Sonuç bulunamadı.' : 'Henüz mesajlaşma yok.\nArkadaşlarına yaz!'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Sağ Panel: Aktif Sohbet ───────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        ...(mobileView === 'list' && window.innerWidth < 640 ? { display: 'none' } : {}),
      }}>
        {!activeUser ? (
          /* Boş durum */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
            <MessageCircle size={56} style={{ opacity: 0.2 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'rgba(255,255,255,0.6)' }}>Bir sohbet seç</p>
              <p style={{ fontSize: '0.85rem' }}>Soldan bir arkadaş seçerek yazmaya başla.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              {/* Mobil geri butonu */}
              <button
                onClick={() => setMobileView('list')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', display: 'flex' }}
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar username={activeUser.username} size={38} online={onlineFriends.has(activeUser._id?.toString())} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>@{activeUser.username}</div>
                <div style={{ fontSize: '0.72rem', color: onlineFriends.has(activeUser._id?.toString()) ? '#22c55e' : 'var(--text-muted)' }}>
                  {onlineFriends.has(activeUser._id?.toString()) ? '● Çevrimiçi' : '○ Çevrimdışı'}
                </div>
              </div>
            </div>

            {/* Mesajlar */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', scrollbarWidth: 'thin' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Yükleniyor...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.85rem' }}>Henüz mesaj yok. İlk mesajı sen gönder! 👋</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender?.toString() === user._id?.toString() || msg.isMine;
                  const showDate = i === 0 || (
                    new Date(msg.createdAt).toDateString() !== new Date(messages[i-1]?.createdAt).toDateString()
                  );
                  return (
                    <div key={msg._id || i}>
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '0.5rem 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(msg.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          background: isMine
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(255,255,255,0.07)',
                          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          padding: '0.55rem 0.9rem',
                          boxShadow: isMine ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                        }}>
                          <div style={{ fontSize: '0.9rem', color: 'white', lineHeight: 1.45 }}>{msg.text}</div>
                          <div style={{ fontSize: '0.65rem', color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              display: 'flex', gap: '0.6rem', padding: '0.85rem 1.25rem',
              borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Bir şeyler yaz..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px', padding: '0.7rem 1rem',
                  color: 'white', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                style={{
                  width: 46, height: 46, borderRadius: '14px', border: 'none',
                  background: input.trim()
                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                    : 'rgba(255,255,255,0.07)',
                  color: 'white', cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                  boxShadow: input.trim() ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                <Send size={19} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;
