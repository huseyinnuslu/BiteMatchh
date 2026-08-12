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
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { connectSocket, getSocket } from '../socket/socketClient';
import api from '../api';
import { toast } from 'react-toastify';
import {
  Send, Search, MessageCircle, ArrowLeft,
  Plus, X, MoreVertical, ShieldBan, ShieldCheck,
  CheckCheck, Circle, ChevronDown, ChevronUp, ExternalLink, Trash2,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import Avatar from '../components/Avatar';

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
      <Avatar src={u?.profilePic} username={u?.username} size={44} online={online} />
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
          fontSize: '0.8rem', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lm 
            ? (lm.isMe 
                ? `Sen: ${lm.text || (lm.hasSharedEvent ? 'Etkinlik Paylaşıldı 🎟' : '')}` 
                : (lm.text || (lm.hasSharedEvent ? 'Etkinlik Paylaştı 🎟' : ''))) 
            : <em>Henüz mesaj yok</em>}
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
              <Avatar src={u.profilePic} username={u.username} size={38} />
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>@{u.username}</span>
              {u.name && u.name !== u.username && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.name}</div>
              )}
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
  const [blockedUsers, setBlockedUsers]   = useState([]);   // obje listesi (sidebar için)
  const [onlineIds, setOnlineIds]         = useState(new Set());
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [showBlocked, setShowBlocked]     = useState(false); // engellenenler bölümü aç/kapa
  const navigate = useNavigate();
  const location = useLocation();

  const [activeUser, setActiveUser]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [showNewDM, setShowNewDM]       = useState(false);
  const [mobileView, setMobileView]     = useState('list');
  const [isMobile, setIsMobile]         = useState(window.innerWidth <= 768);
  // iOS klavyesi açıldığında `100vh` ve hatta `100dvh` her sürümde
  // görünür alanı güncellemeyebiliyor. VisualViewport gerçek kullanılabilir
  // yüksekliği verir; sohbeti bununla boyutlandırıyoruz.
  const getViewportHeight = () => Math.round(window.visualViewport?.height || window.innerHeight);
  const [visibleViewportHeight, setVisibleViewportHeight] = useState(getViewportHeight);

  // Engelleme onay modalı state'leri
  const [showConfirmBlock, setShowConfirmBlock] = useState(false);
  const [blockTarget, setBlockTarget]           = useState(null); // { userId, username, action: 'block' | 'unblock' }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateViewport = () => setVisibleViewportHeight(getViewportHeight());
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  // Açık mobil sohbette alt navigasyon/future sayfayı input ile klavyenin
  // arasına sokmamalı. Sohbet kendi sabit katmanında kalır.
  const isMobileChat = isMobile && mobileView === 'chat';
  useEffect(() => {
    document.documentElement.classList.toggle('messages-chat-open', isMobileChat);
    document.body.classList.toggle('messages-chat-open', isMobileChat);
    return () => {
      document.documentElement.classList.remove('messages-chat-open');
      document.body.classList.remove('messages-chat-open');
    };
  }, [isMobileChat]);

  const bottomRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const inputRef  = useRef(null);
  const menuRef   = useRef(null);
  const sendingRef = useRef(false);
  const activeUserRef = useRef(activeUser);

  // activeUserRef'i her activeUser değiştiğinde güncelle
  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  /* ─── Socket bağlan, online listesi al ── */
  useEffect(() => {
    const token  = (() => { try { return JSON.parse(localStorage.getItem('userInfo') || '{}')?.token; } catch { return null; } })();
    const socket = connectSocket(token);

    // Her bağlanmada (ilk + yeniden) user_online emit et
    // Bu sayede kişisel socket odası (user:{id}) yeniden kurulur
    const handleConnect = () => {
      api.get('/users/friends')
        .then(({ data }) => {
          socket.emit('user_online', { userId: user._id, friendIds: data.map(f => f._id?.toString()) });
        })
        .catch(() => {
          // Arkadaş listesi alınamazsa sadece kendi odasını kur
          socket.emit('user_online', { userId: user._id, friendIds: [] });
        });
    };

    if (socket.connected) handleConnect();
    socket.on('connect', handleConnect);

    socket.on('online_friends',  ({ onlineFriends }) => setOnlineIds(new Set(onlineFriends)));
    socket.on('friend_online',   ({ userId }) => setOnlineIds(p => new Set([...p, userId])));
    socket.on('friend_offline',  ({ userId }) => setOnlineIds(p => { const n = new Set(p); n.delete(userId); return n; }));

    socket.on('receive_direct_message', (msg) => {
      console.log('socket event received:', msg);
      
      const otherId = msg.sender?.toString() === user._id?.toString() ? msg.recipient : msg.sender;
      
      // SADECE aktif sohbet açık olan kişiden (veya bize) gelen mesajsa listeye ekle
      if (activeUserRef.current && activeUserRef.current._id?.toString() === otherId?.toString()) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }

      // Konuşma listesini güncelle (alıcı veya gönderen taraf için)
      setConversations(prev => {
        const idx = prev.findIndex(c => c.user?._id?.toString() === otherId?.toString());
        const upd = {
          text: msg.text,
          createdAt: msg.createdAt,
          isMe: msg.sender?.toString() === user._id?.toString(),
          hasSharedEvent: Boolean(msg.sharedEvent?.name),
        };
        if (idx !== -1) { 
          const arr = [...prev]; 
          arr[idx] = { ...arr[idx], lastMessage: upd }; 
          return arr; 
        } else {
          // Listede yoksa (yeni sohbet) API'den güncel listeyi çekmek en garantisi
          api.get('/messages/conversations').then(({ data }) => setConversations(data)).catch(() => {});
          return prev;
        }
      });
    });

    const handleDeletedMessage = ({ messageId, sender, recipient }) => {
      const activeId = activeUserRef.current?._id?.toString();
      const otherId = sender?.toString() === user._id?.toString() ? recipient : sender;
      if (activeId === otherId?.toString()) {
        setMessages(prev => prev.filter(message => message._id !== messageId));
      }
      // Silinen kayıt son mesaj olabilir; konuşma özetini sunucudan yenile.
      api.get('/messages/conversations').then(({ data }) => setConversations(data)).catch(() => {});
    };
    socket.on('direct_message_deleted', handleDeletedMessage);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('online_friends');
      socket.off('friend_online');
      socket.off('friend_offline');
      socket.off('receive_direct_message');
      socket.off('direct_message_deleted', handleDeletedMessage);
    };
  }, [user._id]);

  /* ─── Veri yükle ── */
  useEffect(() => {
    Promise.all([
      api.get('/messages/conversations').then(({ data }) => setConversations(data)).catch(() => {}),
      api.get('/users/friends').then(({ data }) => setFriends(data)).catch(() => {}),
      api.get('/users/blocked').then(({ data }) => {
        setBlockedIds(new Set(data.map(b => b._id?.toString())));
        setBlockedUsers(data);
      }).catch(() => {}),
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
    const messageList = messagesScrollRef.current;
    if (messageList) {
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // iOS Safari bazen input focus'unda document'i kendi başına aşağı kaydırır.
  // Bu üç aşamalı geri alma, klavyenin ardından gerçekleşen asenkron kaydırmayı
  // da yakalar; sohbetin sabit katmanı yerinde kalır.
  const stabilizeMobileChatViewport = useCallback(() => {
    if (window.innerWidth > 768) return;
    const resetDocumentScroll = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    resetDocumentScroll();
    requestAnimationFrame(resetDocumentScroll);
    window.setTimeout(resetDocumentScroll, 80);
    window.setTimeout(resetDocumentScroll, 260);
  }, []);

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
    // Bir konuşmayı açmak, klavyeyi otomatik açmamalı. iOS bu durumda tüm
    // dokümanı input'a kaydırıp footer'ı araya sokabiliyor.
    // Yoksa listeye ekle
    setConversations(prev =>
      prev.find(c => c.user?._id?.toString() === u._id?.toString())
        ? prev
        : [{ user: u, lastMessage: null }, ...prev]
    );
  }, []);

  // Arkadaş profilindeki “Mesaj gönder” eylemi doğru sohbeti doğrudan açar.
  useEffect(() => {
    const recipient = location.state?.recipient;
    if (!recipient?._id || recipient._id?.toString() === user?._id?.toString()) return;
    openChat(recipient);
    navigate('/messages', { replace: true, state: null });
  }, [location.key, location.state, navigate, openChat, user?._id]);

  /* ─── Mesaj gönder ── */
  const sendMsg = useCallback(() => {
    const txt = input.trim();
    if (!txt || !activeUser || sendingRef.current) return;
    sendingRef.current = true;
    setTimeout(() => { sendingRef.current = false; }, 400);

    const socket = getSocket();
    setInput('');

    if (socket?.connected) {
      // Optimistic message — tmpId ile anlık göster
      const tmpId = `tmp_${Date.now()}`;
      const opt = {
        _id: tmpId, type: 'direct',
        sender: user._id, senderName: user.username,
        recipient: activeUser._id,
        text: txt, createdAt: new Date().toISOString(), isMine: true,
      };
      setMessages(prev => [...prev, opt]);

      // fromUserId: backend'e açıkça gönderilir (socket.data.userId fallback'i)
      socket.emit('send_direct_message', {
        toUserId: activeUser._id,
        fromUserId: user._id,
        text: txt,
        senderName: user.username,
      });
    } else {
      // Socket yoksa HTTP fallback
      const opt = {
        _id: `tmp_${Date.now()}`, type: 'direct',
        sender: user._id, senderName: user.username,
        recipient: activeUser._id,
        text: txt, createdAt: new Date().toISOString(), isMine: true,
      };
      setMessages(prev => [...prev, opt]);
      api.post(`/messages/dm/${activeUser._id}`, { text: txt }).catch(() => {});
    }

    setConversations(prev => {
      const idx = prev.findIndex(c => c.user?._id?.toString() === activeUser._id?.toString());
      const lm  = { text: txt, createdAt: new Date().toISOString(), isMe: true };
      if (idx !== -1) { const a = [...prev]; a[idx] = { ...a[idx], lastMessage: lm }; return a; }
      return prev;
    });
  }, [input, activeUser, user]);

  const handleDeleteMessage = useCallback(async () => {
    if (!deleteTarget?._id || String(deleteTarget._id).startsWith('tmp_')) return;

    try {
      await api.delete(`/messages/dm/${deleteTarget._id}`);
      setMessages(prev => prev.filter(message => message._id !== deleteTarget._id));
      const { data } = await api.get('/messages/conversations');
      setConversations(data);
      toast.success('Mesaj silindi');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mesaj silinemedi');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const handleClearConversation = useCallback(async () => {
    if (!activeUser?._id) return;

    try {
      await api.delete(`/messages/conversation/${activeUser._id}`);
      setMessages([]);
      setConversations(prev => prev.filter(conv => conv.user?._id?.toString() !== activeUser._id?.toString()));
      toast.success('Sohbet senin için temizlendi');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sohbet temizlenemedi');
    } finally {
      setShowClearConfirm(false);
    }
  }, [activeUser]);

  /* ─── Konuşma + Arkadaş birleştirilmiş listesi ── */
  const convUserIds  = new Set(conversations.map(c => c.user?._id?.toString()));
  const otherFriends = friends.filter(f => !convUserIds.has(f._id?.toString()) && !blockedIds.has(f._id?.toString()));

  const isActiveBlocked = activeUser && blockedIds.has(activeUser._id?.toString());

  /* ─── Engelleme/Engel Kaldırma Aksiyonunu Başlat ── */
  const requestBlockAction = useCallback((userId, username, action) => {
    setBlockTarget({ userId, username, action });
    setShowConfirmBlock(true);
  }, []);

  const handleBlockMenuClick = useCallback(() => {
    if (!activeUser) return;
    requestBlockAction(activeUser._id, activeUser.username, isActiveBlocked ? 'unblock' : 'block');
    setShowMenu(false);
  }, [activeUser, isActiveBlocked, requestBlockAction]);

  const handleUnblockFromListClick = useCallback((userId, username) => {
    requestBlockAction(userId, username, 'unblock');
  }, [requestBlockAction]);

  const confirmBlockAction = useCallback(async () => {
    if (!blockTarget) return;
    const { userId, username, action } = blockTarget;
    try {
      if (action === 'unblock') {
        await api.delete(`/users/block/${userId}`);
        setBlockedIds(prev => { const n = new Set(prev); n.delete(userId?.toString()); return n; });
        setBlockedUsers(prev => prev.filter(b => b._id?.toString() !== userId?.toString()));
        toast.success(`@${username} engeli kaldırıldı`);
      } else {
        await api.post(`/users/block/${userId}`);
        setBlockedIds(prev => new Set([...prev, userId?.toString()]));
        setBlockedUsers(prev => [...prev, { _id: userId, username }]);
        toast.info(`@${username} engellendi`);
        setConversations(prev => prev.filter(c => c.user?._id?.toString() !== userId?.toString()));
        if (activeUser && activeUser._id?.toString() === userId?.toString()) {
          setActiveUser(null);
          setMobileView('list');
        }
      }
    } catch {
      toast.error('İşlem sırasında bir hata oluştu');
    } finally {
      setShowConfirmBlock(false);
      setBlockTarget(null);
    }
  }, [blockTarget, activeUser]);

  /* ─── RENDER ───────────────────────────────────────────────────────── */
  return (
    <>
      {showNewDM && (
        <NewConvModal
          onClose={() => setShowNewDM(false)}
          onSelect={openChat}
          blockedIds={blockedIds}
        />
      )}

      <div className="messages-shell" style={{
        display: 'flex',
        width: isMobile ? '100vw' : '94vw',
        maxWidth: isMobile ? 'none' : '1440px',
        // Mobilde açık DM, kendi tam ekran görünümüdür. Böylece footer veya
        // alt navigasyon hiçbir zaman mesaj girişinin arasına giremez.
        // Mesajlar mobilde baştan sona kendi viewport'unda çalışır. Bu,
        // klavye odağı sırasında ana uygulama sayfasının kaymasını engeller.
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? (isMobileChat ? 0 : 72) : undefined,
        left: isMobile ? 0 : '50%',
        right: isMobile ? 0 : undefined,
        transform: isMobile ? 'none' : 'translateX(-50%)',
        // iOS klavye açıkken VisualViewport tam olarak klavyenin üstündeki
        // alanı verir. Minimum yükseklik kullanmıyoruz; aksi halde composer
        // klavyenin üstünde değil sayfanın ortasında kalabiliyor.
        height: isMobileChat
          ? `${visibleViewportHeight}px`
          : isMobile ? 'calc(100dvh - 152px)' : 'calc(100vh - 120px)',
        minHeight: 0,
        borderRadius: isMobile ? 0 : 18,
        overflow: 'hidden',
        border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
        background: '#0d1424',
        zIndex: isMobile ? 90 : 'auto',
        paddingTop: isMobileChat ? 'env(safe-area-inset-top)' : 0,
        boxShadow: isMobile ? 'none' : '0 8px 40px rgba(0,0,0,0.5)',
      }}>

        {/* ════════════════════════ SOL PANEL ════════════════════════ */}
        <div style={{
          width: isMobile ? '100%' : '30%',
          minWidth: isMobile ? '100%' : '280px',
          maxWidth: isMobile ? 'none' : '380px',
          flexShrink: 0,
          minHeight: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: isMobile && mobileView === 'chat' ? 'none' : 'flex',
          flexDirection: 'column',
          background: '#0b1120',
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

                {/* ── Engellenenler bölümü ── */}
                {blockedUsers.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                    <button
                      onClick={() => setShowBlocked(v => !v)}
                      style={{
                        width: '100%', padding: '6px 12px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: '#f87171', fontSize: '0.68rem',
                        fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>🚫 Engellenenler ({blockedUsers.length})</span>
                      {showBlocked ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {showBlocked && blockedUsers.map(b => (
                      <div
                        key={b._id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px',
                          borderRadius: '0 10px 10px 0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <Avatar src={b.profilePic} username={b.username || '?'} size={34} />
                          <span style={{ color: '#fff', fontWeight: 600 }}>@{b.username}</span>
                        </div>
                        <button
                          onClick={() => handleUnblockFromListClick(b._id, b.username)}
                          title="Engeli Kaldır"
                          style={{
                            padding: '4px 8px', borderRadius: 8, border: 'none',
                            background: 'rgba(34,197,94,0.12)',
                            color: '#22c55e', cursor: 'pointer',
                            fontSize: '0.68rem', fontWeight: 700,
                            transition: 'background 0.15s',
                            marginLeft: 'auto'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.12)'; }}
                        >
                          Engeli Kaldır
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════════════════════════ SAĞ PANEL ════════════════════════ */}
        <div style={{
          flex: 1,
          display: isMobile && mobileView === 'list' ? 'none' : 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          background: '#0d1424',
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
                padding: isMobile ? '10px 12px' : '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0, background: '#0b1120',
              }}>
                {/* Mobil geri */}
                <button
                  onClick={() => { setMobileView('list'); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: isMobile ? 'flex' : 'none',
                    padding: 4
                  }}
                >
                  <ArrowLeft size={19} />
                </button>

                <div 
                  onClick={() => navigate(`/profile/${activeUser._id}`)} 
                  style={{ cursor: 'pointer' }}
                >
                  <Avatar src={activeUser.profilePic} username={activeUser.username} size={40} online={onlineIds.has(activeUser._id?.toString())} />
                </div>

                <div 
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${activeUser._id}`)}
                >
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
                        onClick={() => { setShowClearConfirm(true); setShowMenu(false); }}
                        style={{
                          width: '100%', padding: '11px 16px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >
                        <Trash2 size={16} /> Sohbeti temizle
                      </button>
                      <button
                        onClick={handleBlockMenuClick}
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
              <div ref={messagesScrollRef} style={{
                flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: isMobile ? '12px 10px' : '16px 20px',
                display: 'flex', flexDirection: 'column', gap: 4,
                scrollbarWidth: 'thin',
              }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '0.83rem' }}>Yükleniyor...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <Avatar src={activeUser.profilePic} username={activeUser.username} size={56} />
                    </div>
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
                            <Avatar src={activeUser.profilePic} username={activeUser.username} size={28} />
                          </div>
                        )}
                        {!isMine && sameAsPrev && <div style={{ width: 36 }} />}

                        <div style={{
                          maxWidth: '75%',
                          minWidth: msg.sharedEvent ? (isMobile ? '240px' : '290px') : 'auto',
                          background: isMine
                            ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                            : 'rgba(255,255,255,0.07)',
                          borderRadius: isMine
                            ? (sameAsPrev ? '14px 4px 4px 14px' : '14px 4px 14px 14px')
                            : (sameAsPrev ? '4px 14px 14px 14px' : '4px 14px 14px 14px'),
                          padding: '10px 14px',
                          boxShadow: isMine ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                          {/* Paylaşılan Etkinlik Ön İzleme Kartı */}
                          {msg.sharedEvent && msg.sharedEvent.name && (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.45)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              marginBottom: msg.text ? '0.6rem' : '0',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}>
                              <div style={{ position: 'relative', width: '100%', height: isMobile ? '100px' : '120px' }}>
                                <img 
                                  src={msg.sharedEvent.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300'} 
                                  alt="" 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                                <div style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0,
                                  background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95), transparent)',
                                  padding: '0.5rem 0.75rem',
                                }}>
                                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'white', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.sharedEvent.name}
                                  </h4>
                                </div>
                              </div>
                              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {msg.sharedEvent.location && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    <span style={{ flexShrink: 0 }}>📍</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {msg.sharedEvent.location}
                                    </span>
                                  </div>
                                )}
                                {/* Yönlendirme Düğmeleri */}
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  {msg.sharedEvent.ticketUrl && (
                                    <button
                                      onClick={() => window.open(msg.sharedEvent.ticketUrl, '_blank', 'noopener,noreferrer')}
                                      style={{
                                        flex: 1, padding: '0.45rem', borderRadius: '8px', border: 'none',
                                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                        color: 'white', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                                        transition: 'opacity 0.2s',
                                      }}
                                    >
                                      🎟 Bilet Al
                                    </button>
                                  )}
                                  {(msg.sharedEvent.mapsQuery || msg.sharedEvent.location) && (
                                    <button
                                      onClick={() => {
                                        const q = encodeURIComponent(msg.sharedEvent.mapsQuery || msg.sharedEvent.location);
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer');
                                      }}
                                      style={{
                                        flex: 1, padding: '0.45rem', borderRadius: '8px', border: 'none',
                                        background: 'rgba(255, 255, 255, 0.08)', color: 'white', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                      }}
                                    >
                                      📍 Harita
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {msg.text && (
                            <div style={{ fontSize: '0.87rem', color: '#fff', lineHeight: 1.5, wordBreak: 'break-word' }}>
                              {msg.text}
                            </div>
                          )}
                          <div style={{
                            fontSize: '0.62rem', color: isMine ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
                            marginTop: 3, display: 'flex', alignItems: 'center', gap: 4,
                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                          }}>
                            {fmtTime(msg.createdAt)}
                            {isMine && <CheckCheck size={11} style={{ opacity: 0.6 }} />}
                            {isMine && !String(msg._id || '').startsWith('tmp_') && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(msg)}
                                title="Mesajı sil"
                                aria-label="Mesajı sil"
                                style={{ border: 0, padding: 0, background: 'transparent', color: 'rgba(255,255,255,.62)', cursor: 'pointer', display: 'inline-grid', placeItems: 'center' }}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
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
                  display: 'flex', gap: isMobile ? 8 : 10, padding: isMobile ? '6px 10px calc(6px + env(safe-area-inset-bottom))' : '12px 18px',
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
                      borderRadius: isMobile ? 12 : 14, padding: isMobile ? '8px 14px' : '11px 16px',
                      color: '#fff', fontSize: '0.88rem', outline: 'none',
                      transition: 'border-color 0.2s', lineHeight: 1.5,
                      height: isMobile ? 44 : 'auto', maxHeight: 120, overflowY: 'auto', resize: 'none',
                    }}
                    onFocus={e  => {
                      e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                      stabilizeMobileChatViewport();
                    }}
                    onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                  <button
                    onClick={sendMsg}
                    disabled={!input.trim()}
                    style={{
                      width: 44, height: 44, borderRadius: isMobile ? 12 : 14, border: 'none', flexShrink: 0,
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
      {/* Engelleme/Engel kaldırma onay modalı */}
      {showConfirmBlock && blockTarget && (
        <ConfirmModal
          icon="🛡️"
          title={blockTarget.action === 'block' ? 'Kullanıcıyı Engelle' : 'Engeli Kaldır'}
          message={`@${blockTarget.username} kullanıcısını ${blockTarget.action === 'block' ? 'engellemek' : 'engeli kaldırmak'} istediğinize emin misiniz?`}
          confirmText={blockTarget.action === 'block' ? 'Evet, Engelle' : 'Evet, Engeli Kaldır'}
          confirmColor={blockTarget.action === 'block' ? '#ef4444' : '#22c55e'}
          onConfirm={confirmBlockAction}
          onCancel={() => { setShowConfirmBlock(false); setBlockTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          icon="🗑️"
          title="Mesaj silinsin mi?"
          message="Bu mesaj sohbetin her iki tarafı için kaldırılacak. Bu işlem geri alınamaz."
          confirmText="Mesajı sil"
          confirmColor="#ef4444"
          onConfirm={handleDeleteMessage}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showClearConfirm && activeUser && (
        <ConfirmModal
          icon="🧹"
          title="Sohbet temizlensin mi?"
          message={`@${activeUser.username} ile olan mesajlar yalnızca senin ekranından kaldırılacak. Karşı tarafın sohbeti etkilenmez.`}
          confirmText="Sohbeti temizle"
          confirmColor="#ef4444"
          onConfirm={handleClearConversation}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </>
  );
};

export default Messages;
