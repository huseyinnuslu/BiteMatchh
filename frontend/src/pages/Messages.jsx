/**
 * Messages.jsx  v2
 * BiteMatch – Profesyonel DM Mesajlaşma Sayfası
 *
 * Özellikler:
 *  - Sol panel: Konuşma listesi + arkadaş listesi + online göstergeler
 *  - "+" ile kullanıcı arama ve yeni DM başlatma
 *  - Sağ panel: Mesaj balonları, tarih grupları, anlık socket
 *  - Sağ üst: ⋯ menüsü → Engelle / Engeli Kaldır
 *  - Tam mobil uyumlu (tek sütun, geri butonu)
 */

import {
  useState, useEffect, useRef, useContext, useCallback,
} from 'react';
import { AuthContext } from '../context/AuthContext';
import { connectSocket, getSocket } from '../socket/socketClient';
import api from '../api';
import { toast } from 'react-toastify';
import {
  Send, Search, MessageCircle, ArrowLeft,
  Plus, X, MoreVertical, ShieldBan, ShieldCheck,
  CheckCheck, Circle,
} from 'lucide-react';

/* ─── Yardımcılar ─────────────────────────────────────────────────────────── */

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 3_600_000;
  if (diffH < 24) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 168) return d.toLocaleDateString('tr-TR', { weekday: 'short' });
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
};

const fmtDateLabel = (iso) =>
  new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

const Avatar = ({ username = '?', size = 40, online = false }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${(username.charCodeAt(0) * 37) % 360},55%,45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.4, color: '#fff',
      userSelect: 'none', letterSpacing: '-0.5px',
    }}>
      {username[0]?.toUpperCase()}
    </div>
    {online && (
      <span style={{
        position: 'absolute', bottom: 0, right: 0,
        width: size * 0.3, height: size * 0.3,
        borderRadius: '50%', background: '#22c55e',
        border: `2px solid #0d1424`,
        boxShadow: '0 0 8px rgba(34,197,94,0.7)',
      }} />
    )}
  </div>
);

/* ─── ConvItem ────────────────────────────────────────────────────────────── */
const ConvItem = ({ conv, active, online, onClick }) => {
  const { user: u, lastMessage: lm } = conv;
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--primary)' : 'transparent'}`,
        cursor: 'pointer', transition: 'background 0.15s',
        borderRadius: '0 10px 10px 0',
        marginBottom: 2,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar username={u?.username} size={44} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
            @{u?.username}
          </span>
          {lm?.createdAt && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {fmtTime(lm.createdAt)}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.78rem', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lm ? (lm.isMe ? `Sen: ${lm.text}` : lm.text) : <em>Henüz mesaj yok</em>}
        </div>
      </div>
    </div>
  );
};

/* ─── NewConvModal ─────────────────────────────────────────────────────────── */
const NewConvModal = ({ onClose, onSelect, blockedIds }) => {
  const [q, setQ]           = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef             = useRef(null);

  const search = (val) => {
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
        setResults(data.filter(u => !blockedIds.has(u._id)));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, borderRadius: 20,
          background: '#111827', border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Başlık */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Plus size={18} color="var(--primary)" /> Yeni Mesaj
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Arama */}
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              autoFocus
              placeholder="Kullanıcı adı veya isim ara..."
              value={q}
              onChange={e => { setQ(e.target.value); search(e.target.value); }}
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, color: '#fff', fontSize: '0.88rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Sonuçlar */}
        <div style={{ maxHeight: 320, overflowY: 'auto', paddingBottom: 12 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Aranıyor...</div>
          )}
          {!loading && q && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Kullanıcı bulunamadı</div>
          )}
          {!loading && !q && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Kullanıcı adı yazarak ara</div>
          )}
          {results.map(u => (
            <div
              key={u._id}
              onClick={() => { onSelect(u); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar username={u.username} size={38} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#fff' }}>@{u.username}</div>
                {u.name && u.name !== u.username && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Ana Sayfa ───────────────────────────────────────────────────────────── */
const Messages = () => {
  const { user } = useContext(AuthContext);

  /* state */
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends]             = useState([]);
  const [blockedIds, setBlockedIds]       = useState(new Set());
  const [onlineIds, setOnlineIds]         = useState(new Set());
  const [loadingConvs, setLoadingConvs]   = useState(true);

  const [activeUser, setActiveUser]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [showMenu, setShowMenu]         = useState(false);

  const [showNewDM, setShowNewDM]       = useState(false);
  const [mobileView, setMobileView]     = useState('list');

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const menuRef   = useRef(null);

  /* ─── Socket bağlan, online listesi al ── */
  useEffect(() => {
    const token  = JSON.parse(localStorage.getItem('userInfo') || '{}')?.token;
    const socket = connectSocket(token);

    // Online bildirimi gönder
    socket.on('connect', () => {
      api.get('/users/friends')
        .then(({ data }) => {
          const ids = data.map(f => f._id?.toString());
          socket.emit('user_online', { userId: user._id, friendIds: ids });
        })
        .catch(() => {});
    });

    socket.on('online_friends',  ({ onlineFriends }) => setOnlineIds(new Set(onlineFriends)));
    socket.on('friend_online',   ({ userId }) => setOnlineIds(p => new Set([...p, userId])));
    socket.on('friend_offline',  ({ userId }) => setOnlineIds(p => { const n = new Set(p); n.delete(userId); return n; }));

    socket.on('receive_direct_message', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Konuşma listesini güncelle
      const otherId = msg.sender?.toString() === user._id?.toString() ? msg.recipient : msg.sender;
      setConversations(prev => {
        const idx = prev.findIndex(c => c.user?._id?.toString() === otherId?.toString());
        const upd = { text: msg.text, createdAt: msg.createdAt, isMe: msg.sender?.toString() === user._id?.toString() };
        if (idx !== -1) {
          const arr = [...prev];
          arr[idx] = { ...arr[idx], lastMessage: upd };
          return arr;
        }
        return prev;
      });
    });

    return () => {
      socket.off('online_friends');
      socket.off('friend_online');
      socket.off('friend_offline');
      socket.off('receive_direct_message');
    };
  }, [user._id]);

  /* ─── Veri yükle ── */
  useEffect(() => {
    Promise.all([
      api.get('/messages/conversations').then(({ data }) => setConversations(data)).catch(() => {}),
      api.get('/users/friends').then(({ data }) => setFriends(data)).catch(() => {}),
      api.get('/users/blocked').then(({ data }) => setBlockedIds(new Set(data.map(b => b._id?.toString())))).catch(() => {}),
    ]).finally(() => setLoadingConvs(false));
  }, []);

  /* ─── Mesajları yükle ── */
  useEffect(() => {
    if (!activeUser) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/messages/dm/${activeUser._id}`)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeUser?._id]);

  /* ─── Scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Menü dışına tıkla → kapat ── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ─── Konuşma aç ── */
  const openChat = useCallback((u) => {
    setActiveUser(u);
    setMobileView('chat');
    setShowMenu(false);
    setTimeout(() => inputRef.current?.focus(), 120);
    // Yoksa listeye ekle
    setConversations(prev =>
      prev.find(c => c.user?._id?.toString() === u._id?.toString())
        ? prev
        : [{ user: u, lastMessage: null }, ...prev]
    );
  }, []);

  /* ─── Mesaj gönder ── */
  const sendMsg = useCallback(() => {
    const txt = input.trim();
    if (!txt || !activeUser) return;

    const socket = getSocket();
    const tmpId  = Date.now().toString();
    const opt = {
      _id: tmpId, type: 'direct',
      sender: user._id, senderName: user.username,
      recipient: activeUser._id,
      text: txt, createdAt: new Date().toISOString(), isMine: true,
    };
    setMessages(prev => [...prev, opt]);
    setInput('');

    if (socket?.connected) {
      socket.emit('send_direct_message', { toUserId: activeUser._id, text: txt, senderName: user.username });
    } else {
      api.post(`/messages/dm/${activeUser._id}`, { text: txt }).catch(() => {});
    }
    setConversations(prev => {
      const idx = prev.findIndex(c => c.user?._id?.toString() === activeUser._id?.toString());
      const lm  = { text: txt, createdAt: opt.createdAt, isMe: true };
      if (idx !== -1) { const a = [...prev]; a[idx] = { ...a[idx], lastMessage: lm }; return a; }
      return prev;
    });
  }, [input, activeUser, user]);

  /* ─── Engelle / Engeli Kaldır ── */
  const handleBlock = useCallback(async () => {
    if (!activeUser) return;
    setShowMenu(false);
    const isBlocked = blockedIds.has(activeUser._id?.toString());
    try {
      if (isBlocked) {
        await api.delete(`/users/block/${activeUser._id}`);
        setBlockedIds(prev => { const n = new Set(prev); n.delete(activeUser._id?.toString()); return n; });
        toast.success(`@${activeUser.username} engeli kaldırıldı`);
      } else {
        await api.post(`/users/block/${activeUser._id}`);
        setBlockedIds(prev => new Set([...prev, activeUser._id?.toString()]));
        toast.info(`@${activeUser.username} engellendi`);
        setConversations(prev => prev.filter(c => c.user?._id?.toString() !== activeUser._id?.toString()));
        setActiveUser(null);
        setMobileView('list');
      }
    } catch { toast.error('Bir hata oluştu'); }
  }, [activeUser, blockedIds]);

  /* ─── Konuşma + Arkadaş birleştirilmiş listesi ── */
  const convUserIds  = new Set(conversations.map(c => c.user?._id?.toString()));
  const otherFriends = friends.filter(f => !convUserIds.has(f._id?.toString()) && !blockedIds.has(f._id?.toString()));

  const isActiveBlocked = activeUser && blockedIds.has(activeUser._id?.toString());

  /* ─── RENDER ───────────────────────────────────────────────────────── */
  const SIDEBAR_W = 300;

  return (
    <>
      {showNewDM && (
        <NewConvModal
          onClose={() => setShowNewDM(false)}
          onSelect={openChat}
          blockedIds={blockedIds}
        />
      )}

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 80px)',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#0d1424',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>

        {/* ════════════════════════ SOL PANEL ════════════════════════ */}
        <div style={{
          width: SIDEBAR_W, minWidth: SIDEBAR_W, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          background: '#0b1120',
          // Mobil: chat açıkken gizle
          ...(mobileView === 'chat' ? { display: 'none' } : {}),
        }}>

          {/* Başlık + Yeni DM */}
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={18} color="var(--primary)" /> Mesajlar
              </h2>
              <button
                onClick={() => setShowNewDM(true)}
                title="Yeni Mesaj"
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: 'var(--primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', scrollbarWidth: 'thin' }}>
            {loadingConvs ? (
              [1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', marginBottom: 2 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 11, width: '55%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ height: 9, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                  </div>
                </div>
              ))
            ) : (
              <>
                {conversations.length > 0 && (
                  <>
                    <div style={{ padding: '4px 12px 4px', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 800 }}>
                      Konuşmalar
                    </div>
                    {conversations.map((conv, i) => (
                      <ConvItem
                        key={conv.user?._id || i}
                        conv={conv}
                        active={activeUser?._id?.toString() === conv.user?._id?.toString()}
                        online={onlineIds.has(conv.user?._id?.toString())}
                        onClick={() => openChat(conv.user)}
                      />
                    ))}
                  </>
                )}

                {otherFriends.length > 0 && (
                  <>
                    <div style={{ padding: '10px 12px 4px', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 800 }}>
                      Arkadaşlar
                    </div>
                    {otherFriends.map(f => (
                      <ConvItem
                        key={f._id}
                        conv={{ user: f, lastMessage: null }}
                        active={activeUser?._id?.toString() === f._id?.toString()}
                        online={onlineIds.has(f._id?.toString())}
                        onClick={() => openChat(f)}
                      />
                    ))}
                  </>
                )}

                {conversations.length === 0 && otherFriends.length === 0 && !loadingConvs && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <MessageCircle size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
                    <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>Henüz konuşman yok.</p>
                    <button
                      onClick={() => setShowNewDM(true)}
                      style={{
                        padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)',
                        background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                      }}
                    >
                      + Yeni mesaj başlat
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════════════════════════ SAĞ PANEL ════════════════════════ */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
          background: '#0d1424',
          ...(mobileView === 'list' && window.innerWidth <= 640 ? { display: 'none' } : {}),
        }}>
          {!activeUser ? (
            /* Boş durum */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={32} color="var(--primary)" style={{ opacity: 0.5 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontSize: '0.95rem' }}>Mesajlarını seç</p>
                <p style={{ fontSize: '0.82rem' }}>Soldan bir konuşma seç veya yeni mesaj başlat.</p>
              </div>
              <button
                onClick={() => setShowNewDM(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}
              >
                <Plus size={16} /> Yeni Mesaj
              </button>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0, background: '#0b1120',
              }}>
                {/* Mobil geri */}
                <button
                  onClick={() => { setMobileView('list'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
                >
                  <ArrowLeft size={19} />
                </button>

                <Avatar username={activeUser.username} size={40} online={onlineIds.has(activeUser._id?.toString())} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>@{activeUser.username}</div>
                  <div style={{ fontSize: '0.72rem', color: onlineIds.has(activeUser._id?.toString()) ? '#22c55e' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Circle size={7} fill="currentColor" strokeWidth={0} />
                    {onlineIds.has(activeUser._id?.toString()) ? 'Çevrimiçi' : 'Çevrimdışı'}
                  </div>
                </div>

                {/* ⋮ menü */}
                <div style={{ position: 'relative' }} ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(m => !m)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 8, transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    <MoreVertical size={19} />
                  </button>

                  {showMenu && (
                    <div style={{
                      position: 'absolute', top: '110%', right: 0, zIndex: 100,
                      background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, minWidth: 200, overflow: 'hidden',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}>
                      <button
                        onClick={handleBlock}
                        style={{
                          width: '100%', padding: '11px 16px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          color: isActiveBlocked ? '#22c55e' : '#f87171',
                          fontSize: '0.85rem', fontWeight: 600, textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >
                        {isActiveBlocked
                          ? <><ShieldCheck size={16} /> Engeli Kaldır</>
                          : <><ShieldBan size={16} /> Kullanıcıyı Engelle</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Mesajlar ── */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '16px 20px',
                display: 'flex', flexDirection: 'column', gap: 4,
                scrollbarWidth: 'thin',
              }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '0.83rem' }}>Yükleniyor...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }}>
                    <Avatar username={activeUser.username} size={56} />
                    <p style={{ marginTop: 12, fontSize: '0.85rem' }}>
                      <strong style={{ color: '#fff' }}>@{activeUser.username}</strong> ile henüz mesajlaşmadın.
                    </p>
                    <p style={{ fontSize: '0.78rem' }}>İlk mesajı göndererek başla 👋</p>
                  </div>
                ) : (() => {
                  const nodes = [];
                  let lastDate = '';
                  messages.forEach((msg, i) => {
                    const isMine = msg.sender?.toString() === user._id?.toString() || msg.isMine;
                    const dateStr = new Date(msg.createdAt).toDateString();
                    if (dateStr !== lastDate) {
                      lastDate = dateStr;
                      nodes.push(
                        <div key={`d-${i}`} style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                          <span style={{
                            fontSize: '0.68rem', color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 20, padding: '3px 10px',
                          }}>
                            {fmtDateLabel(msg.createdAt)}
                          </span>
                        </div>
                      );
                    }

                    // Mesaj gruplaması — aynı kişiden arka arkaya gelen mesajlar
                    const prev = messages[i - 1];
                    const sameAsPrev = prev && prev.sender?.toString() === msg.sender?.toString() && (new Date(msg.createdAt) - new Date(prev.createdAt)) < 60000;

                    nodes.push(
                      <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: sameAsPrev ? 2 : 10 }}>
                        {/* Karşı taraf avatarı (sadece grubun ilk mesajında) */}
                        {!isMine && !sameAsPrev && (
                          <div style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 2 }}>
                            <Avatar username={activeUser.username} size={28} />
                          </div>
                        )}
                        {!isMine && sameAsPrev && <div style={{ width: 36 }} />}

                        <div style={{
                          maxWidth: '68%',
                          background: isMine
                            ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                            : 'rgba(255,255,255,0.07)',
                          borderRadius: isMine
                            ? (sameAsPrev ? '14px 4px 4px 14px' : '14px 4px 14px 14px')
                            : (sameAsPrev ? '4px 14px 14px 14px' : '4px 14px 14px 14px'),
                          padding: '8px 12px',
                          boxShadow: isMine ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                          position: 'relative',
                        }}>
                          <div style={{ fontSize: '0.87rem', color: '#fff', lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {msg.text}
                          </div>
                          <div style={{
                            fontSize: '0.62rem', color: isMine ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
                            marginTop: 3, display: 'flex', alignItems: 'center', gap: 4,
                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                          }}>
                            {fmtTime(msg.createdAt)}
                            {isMine && <CheckCheck size={11} style={{ opacity: 0.6 }} />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                  return nodes;
                })()}
                <div ref={bottomRef} />
              </div>

              {/* ── Input alanı ── */}
              {isActiveBlocked ? (
                <div style={{
                  padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center', color: '#f87171', fontSize: '0.82rem',
                  background: 'rgba(239,68,68,0.04)',
                }}>
                  🚫 Bu kullanıcıyı engellediniz. Mesaj gönderemezsiniz.
                </div>
              ) : (
                <div style={{
                  display: 'flex', gap: 10, padding: '12px 18px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: '#0b1120', flexShrink: 0, alignItems: 'flex-end',
                }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
                    }}
                    placeholder={`@${activeUser.username}'e mesaj gönder...`}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14, padding: '11px 16px',
                      color: '#fff', fontSize: '0.88rem', outline: 'none',
                      transition: 'border-color 0.2s', lineHeight: 1.5,
                      maxHeight: 120, overflowY: 'auto', resize: 'none',
                    }}
                    onFocus={e  => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                    onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                  <button
                    onClick={sendMsg}
                    disabled={!input.trim()}
                    style={{
                      width: 44, height: 44, borderRadius: 14, border: 'none', flexShrink: 0,
                      background: input.trim()
                        ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                        : 'rgba(255,255,255,0.06)',
                      color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: input.trim() ? '0 2px 14px rgba(99,102,241,0.4)' : 'none',
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Messages;
