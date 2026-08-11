import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Users, BarChart2, Search, UserPlus, UserMinus,
  Heart, Trophy, Calendar, Clock, CheckCircle, XCircle,
  UserCircle, Camera, Trash2, Inbox, Pencil, Settings, Lock, Sparkles, X
} from 'lucide-react';
import api from '../api';
import Avatar from '../components/Avatar';
import { getSocket } from '../socket/socketClient';

// ── Kategori emoji haritası ──────────────────────────────────────────────────
const CATEGORY_ICONS = {
  yemek: '🍔', restoran: '🍽️', film: '🎬', dizi: '📺',
  aktivite: '🎯', mekan: '📍', muzik: '🎵', oyun: '🎮', custom: '✨',
};

// Backend güncellenirken veya PWA eski bir API yanıtını gösterirken dahi
// rütbe yolunun boş görünmemesi için istemci tarafında da tutulur.
const RANK_PATH = [
  { level: 1, minXp: 0, title: 'Karar Çırağı', icon: '🌱', description: 'İlk tercihlerine yön veriyorsun.' },
  { level: 2, minXp: 35, title: 'Tercih Kaşifi', icon: '🧭', description: 'Farklı seçenekleri keşfetmeye başladın.' },
  { level: 3, minXp: 100, title: 'Lezzet İz Sürücüsü', icon: '🍜', description: 'Grubun zevklerini yakalıyorsun.' },
  { level: 4, minXp: 220, title: 'Eşleşme Avcısı', icon: '🎯', description: 'Ortak kararların peşindesin.' },
  { level: 5, minXp: 420, title: 'Grup Nabzı', icon: '🤝', description: 'Kararsız grupları harekete geçiriyorsun.' },
  { level: 6, minXp: 700, title: 'Karar Mimarı', icon: '🏗️', description: 'Seçim akışını ustalıkla yönetiyorsun.' },
  { level: 7, minXp: 1050, title: 'Rota Ustası', icon: '🗺️', description: 'Yeni planların yönünü belirliyorsun.' },
  { level: 8, minXp: 1500, title: 'Uyum Kaptanı', icon: '⚓', description: 'Grubun ortak noktasını buluyorsun.' },
  { level: 9, minXp: 2100, title: 'Eşleşme Elçisi', icon: '✨', description: 'BiteMatch ruhunu grubuna taşıyorsun.' },
  { level: 10, minXp: 3000, title: 'Fikir Önderi', icon: '👑', description: 'Karar vermek için sana güveniliyor.' },
  { level: 11, minXp: 4200, title: 'BiteMatch Ustası', icon: '🔥', description: 'Her odada tecrüben konuşuyor.' },
  { level: 12, minXp: 6000, title: 'Karar Efsanesi', icon: '🏆', description: 'BiteMatch’in zirvesindesin.' },
];

// ── Sekme bileşeni ───────────────────────────────────────────────────────────
const Tab = ({ id, label, icon: Icon, active, onClick, badge }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.6rem 1.1rem', borderRadius: '10px', border: 'none',
      background: active ? 'linear-gradient(135deg,var(--primary),var(--secondary))' : 'transparent',
      color: active ? 'white' : 'var(--text-muted)',
      fontWeight: active ? 700 : 500, fontSize: '0.88rem',
      cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: active ? '0 4px 14px rgba(255,75,75,0.3)' : 'none',
    }}
  >
    <Icon size={14} />
    {label}
    {badge > 0 && (
      <span style={{
        position: 'absolute', top: 4, right: 4,
        background: 'var(--danger)', color: 'white',
        borderRadius: '50%', width: 17, height: 17,
        fontSize: '0.65rem', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>{badge > 9 ? '9+' : badge}</span>
    )}
  </button>
);

// ── Uyum skoru rengi ─────────────────────────────────────────────────────────
const scoreColor = (s) =>
  s >= 70 ? 'var(--success)' : s >= 40 ? 'gold' : 'var(--text-muted)';

const ScoreBar = ({ score }) => (
  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${score}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ height: '100%', background: scoreColor(score), borderRadius: '3px' }}
    />
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const { updateUser } = useContext(AuthContext);

  // Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [showRanks, setShowRanks] = useState(false);

  // ── Profil yükle ──────────────────────────────────────────────────────────
  const loadProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setProfile(data);
    } catch {
      toast.error('Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  // ── Gizlilik Ayarı Toggle ────────────────────────────────────────────────
  const handleTogglePrivacy = async () => {
    const newValue = !profile.isStatsPublic;
    try {
      await api.put('/auth/profile', { isStatsPublic: newValue });
      setProfile(prev => ({ ...prev, isStatsPublic: newValue }));
      toast.success(`İstatistikleriniz artık ${newValue ? 'herkese açık' : 'gizli'}!`);
    } catch {
      toast.error('Gizlilik ayarı güncellenemedi.');
    }
  };

  const handleUsernameEditStart = () => {
    setUsernameDraft(profile.username);
    setEditingUsername(true);
  };

  const handleUsernameChange = async (event) => {
    event.preventDefault();
    const username = usernameDraft.trim();

    if (username === profile.username) {
      setEditingUsername(false);
      return;
    }

    setSavingUsername(true);
    try {
      const { data } = await api.put('/auth/profile', { username });
      setProfile(prev => ({
        ...prev,
        username: data.username,
        usernameChangedAt: data.usernameChangedAt,
      }));
      updateUser({ username: data.username, usernameChangedAt: data.usernameChangedAt });
      setEditingUsername(false);
      toast.success('Kullanıcı adınız güncellendi.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Kullanıcı adı güncellenemedi.');
    } finally {
      setSavingUsername(false);
    }
  };

  // ── Kullanıcı arama (debounce 400ms) ─────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${searchQuery}`);
        setSearchResults(data);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Arkadaşlık isteği yolla ──────────────────────────────────────────────
  const handleAddFriend = async (targetId) => {
    setActionId(targetId);
    try {
      await api.post(`/users/friends/${targetId}`);
      toast.success('Arkadaşlık isteği gönderildi');
    } catch (e) {
      toast.error(e.response?.data?.message || 'İstek gönderilemedi');
    } finally { setActionId(null); }
  };

  // ── Avatar Yükle ────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Dosya boyutu en fazla 5MB olabilir.');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(data.message);
      // Profil verisini ve Context'i güncelle
      setProfile(prev => ({ ...prev, profilePic: data.avatarUrl }));
      updateUser({ profilePic: data.avatarUrl });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  // ── Avatar Sil ────────────────────────────────────────────────────────
  const handleAvatarRemove = async () => {
    try {
      setUploading(true);
      await api.delete('/upload/avatar');
      toast.success('Profil fotoğrafı kaldırıldı');
      setProfile(prev => ({ ...prev, profilePic: '' }));
      updateUser({ profilePic: '' });
    } catch (err) {
      toast.error('Fotoğraf kaldırılamadı');
    } finally {
      setUploading(false);
    }
  };

  // ── Arkadaşlık isteği gönder ──────────────────────────────────────────────
  const handleSendRequest = async (friendId) => {
    setActionId(friendId);
    try {
      await api.post(`/users/friends/${friendId}`);
      toast.success('Arkadaşlık isteği gönderildi! 📨');
      // Arama sonuçlarında "İstek Gönderildi" olarak güncelle
      setSearchResults(prev =>
        prev.map(u => u._id === friendId ? { ...u, isPending: true } : u)
      );
      
      const socket = getSocket();
      if (socket) {
        socket.emit('friend_request_notify', { toUserId: friendId, fromUsername: user.username });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'İstek gönderilemedi');
    } finally { setActionId(null); }
  };

  const handleCancelRequest = async (friendId) => {
    setActionId(friendId);
    try {
      await api.delete(`/users/friends/${friendId}/cancel`);
      toast.success('İstek geri çekildi');
      setSearchResults(prev =>
        prev.map(u => u._id === friendId ? { ...u, isPending: false } : u)
      );
    } catch (e) {
      toast.error('İstek iptal edilemedi');
    } finally { setActionId(null); }
  };

  // ── Arkadaşlık isteği kabul et ───────────────────────────────────────────────
  const handleAccept = async (fromId) => {
    setActionId(fromId);
    try {
      const { data } = await api.put(`/users/friends/${fromId}/accept`);
      toast.success(`Arkadaşlık kabul edildi! 🎉 Uyum: %${data.compatibilityScore}`);
      await loadProfile();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Kabul edilemedi');
    } finally { setActionId(null); }
  };

  // ── Arkadaşlık isteği reddet ──────────────────────────────────────────────
  const handleDecline = async (fromId) => {
    setActionId(fromId);
    try {
      await api.delete(`/users/friends/${fromId}/decline`);
      toast.info('İstek reddedildi');
      setProfile(prev => ({
        ...prev,
        pendingFriendRequests: prev.pendingFriendRequests.filter(r => r._id !== fromId),
        pendingCount: prev.pendingCount - 1,
      }));
    } catch { toast.error('İşlem başarısız'); }
    finally { setActionId(null); }
  };

  // ── Arkadaşı çıkar ────────────────────────────────────────────────────────
  const handleRemoveFriend = async (friendId) => {
    setActionId(friendId);
    try {
      await api.delete(`/users/friends/${friendId}`);
      toast.success('Arkadaş listeden çıkarıldı');
      setProfile(prev => ({
        ...prev,
        friends: prev.friends.filter(f => f._id !== friendId),
        friendCount: prev.friendCount - 1,
      }));
    } catch { toast.error('Çıkarılamadı'); }
    finally { setActionId(null); }
  };

  // ── Yükleniyor ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="pulse-primary" style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--surface)' }} />
      <p style={{ color: 'var(--text-muted)' }}>Profil yükleniyor...</p>
    </div>
  );

  if (!profile) return null;

  const { stats, friends, pendingFriendRequests, pendingCount } = profile;
  const localXp = (stats?.totalSwipes || 0) + ((stats?.completedRooms || 0) * 15);
  const xp = Number.isFinite(Number(profile.gamification?.xp)) ? Number(profile.gamification.xp) : localXp;
  // Rütbe her zaman güncel XP'den hesaplanır. Böylece API/PWA eski bir
  // currentRank cevabı döndürse bile kullanıcı açtığı rütbede kalmaz.
  const currentRankIndex = RANK_PATH.reduce((currentIndex, rank, index) => (xp >= rank.minXp ? index : currentIndex), 0);
  const currentRank = RANK_PATH[currentRankIndex];
  const nextRank = RANK_PATH[currentRankIndex + 1] || null;
  const progress = nextRank ? Math.min(100, Math.round(((xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100)) : 100;
  const gamification = {
    xp,
    progress,
    xpToNext: nextRank ? Math.max(0, nextRank.minXp - xp) : 0,
    currentRank,
    nextRank,
    ranks: RANK_PATH,
  };
  const joinDate = new Date(profile.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  const categoryEntries = Object.entries(stats?.categoryBreakdown || {}).sort((a, b) => b[1] - a[1]);
  const nextUsernameChangeAt = profile.usernameChangedAt
    ? new Date(new Date(profile.usernameChangedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const canChangeUsername = !nextUsernameChangeAt || nextUsernameChangeAt <= new Date();

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '0 1rem', paddingTop: '2rem', boxSizing: 'border-box' }}>

      {/* ── Hero Profil Kartı ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,75,75,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Avatar Yükleme Alanı */}
          <div style={{ position: 'relative' }}>
            <Avatar src={profile.profilePic} username={profile.username} size={80} />
            
            <label style={{
              position: 'absolute', bottom: -5, right: -5,
              background: 'var(--primary)', color: 'white',
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
              border: '2px solid var(--glass-border)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={14} />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: 'none' }} 
                disabled={uploading}
              />
            </label>
            
            {profile.profilePic && (
              <button
                onClick={handleAvatarRemove}
                disabled={uploading}
                style={{
                  position: 'absolute', top: -5, right: -5,
                  background: 'var(--danger)', color: 'white',
                  width: 24, height: 24, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                  border: 'none',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                }}
                title="Fotoğrafı Kaldır"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{profile.name || profile.username}</h2>
            <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0.6rem' }}>@{profile.username}</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={13} /> {joinDate}'dan beri
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={13} /> {profile.friendCount} Arkadaş
              </span>
              {pendingCount > 0 && (
                <span
                  onClick={() => setActiveTab('pending')}
                  style={{ fontSize: '0.82rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  🔔 {pendingCount} bekleyen istek
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            style={{
              alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '0.55rem 0.75rem',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
            }}
          >
            <Settings size={15} /> Ayarlar
          </button>

          <button
            type="button"
            onClick={() => setShowRanks(true)}
            aria-label="Rütbeler ve XP ilerlemesini görüntüle"
            style={{
              background: 'linear-gradient(145deg, rgba(255,75,75,.14), rgba(139,92,246,.14))', border: '1px solid rgba(196,181,253,.36)',
              borderRadius: '12px', padding: '.65rem .85rem', textAlign: 'left', color: 'white', cursor: 'pointer', minWidth: 132,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontSize: '.76rem', color: '#ddd6fe', fontWeight: 800 }}><Sparkles size={13} /> RÜTBE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontWeight: 800, marginTop: '.3rem', fontSize: '.9rem' }}><span style={{ fontSize: '1.2rem' }}>{gamification.currentRank.icon}</span>{gamification.currentRank.title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.7rem', marginTop: '.28rem' }}>{gamification.xp} XP · Sev. {gamification.currentRank.level}</div>
          </button>
        </div>
      </motion.div>

      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>Kullanıcı Adı</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>@{profile.username} · Kullanıcı adı 7 günde bir değiştirilebilir.</div>
          </div>
          {!editingUsername && (
            <button
              type="button"
              onClick={handleUsernameEditStart}
              disabled={!canChangeUsername}
              title={!canChangeUsername ? `Tekrar değiştirebileceğiniz tarih: ${nextUsernameChangeAt.toLocaleDateString('tr-TR')}` : 'Kullanıcı adını değiştir'}
              style={{
                border: '1px solid var(--primary)', borderRadius: '9px', padding: '0.55rem 0.85rem',
                background: canChangeUsername ? 'rgba(255,75,75,0.1)' : 'rgba(255,255,255,0.04)',
                color: canChangeUsername ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700,
                cursor: canChangeUsername ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <Pencil size={14} /> {canChangeUsername ? 'Değiştir' : nextUsernameChangeAt.toLocaleDateString('tr-TR')}
            </button>
          )}
        </div>

        {editingUsername && (
          <form onSubmit={handleUsernameChange} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <input
              value={usernameDraft}
              onChange={(event) => setUsernameDraft(event.target.value)}
              maxLength={15}
              autoComplete="username"
              autoFocus
              aria-label="Yeni kullanıcı adı"
              style={{ flex: '1 1 180px', minWidth: 0, padding: '0.65rem 0.8rem', borderRadius: '9px', border: '1px solid var(--glass-border)', background: 'var(--surface)', color: 'white' }}
            />
            <button type="submit" disabled={savingUsername} style={{ border: 'none', borderRadius: '9px', padding: '0.65rem 0.95rem', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: savingUsername ? 'wait' : 'pointer' }}>
              {savingUsername ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button type="button" onClick={() => setEditingUsername(false)} disabled={savingUsername} style={{ border: '1px solid var(--glass-border)', borderRadius: '9px', padding: '0.65rem 0.95rem', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Vazgeç
            </button>
          </form>
        )}

        {!canChangeUsername && !editingUsername && (
          <p style={{ margin: '0.75rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Bir sonraki değişiklik: {nextUsernameChangeAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

      </div>

      {/* ── Sekmeler ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: '12px', flexWrap: 'wrap' }}>
        <Tab id="stats"   label="İstatistikler" icon={BarChart2}   active={activeTab === 'stats'}   onClick={setActiveTab} />
        <Tab id="friends" label="Arkadaşlar"    icon={Users}       active={activeTab === 'friends'} onClick={setActiveTab} />
        <Tab id="pending" label="İstekler"      icon={Clock}       active={activeTab === 'pending'} onClick={setActiveTab} badge={pendingCount} />
        <Tab id="add"     label="Arkadaş Bul"   icon={UserPlus}    active={activeTab === 'add'}     onClick={setActiveTab} />
      </div>

      <AnimatePresence mode="wait">

        {/* ══ İstatistikler ═══════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            
            {/* Gizlilik Ayarı Toggle Kartı */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>İstatistiklerimi Profilimde Göster</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>İstatistiklerinizi profilinizde herkese görünür kılın.</span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer', flexShrink: 0 }}>
                <input 
                  type="checkbox" 
                  checked={profile.isStatsPublic}
                  onChange={handleTogglePrivacy}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '24px',
                  background: profile.isStatsPublic ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  transition: 'background-color 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', bottom: '3px', left: profile.isStatsPublic ? '27px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }} />
                </span>
              </label>
            </div>

            {!profile.isStatsPublic ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,75,75,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 800 }}>İstatistikleriniz Gizlidir</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '340px', lineHeight: 1.5 }}>
                  Profilinizde istatistiklerin gösterilmesini kapattınız. Tekrar görüntülemek için yukarıdaki seçeneği aktif edebilirsiniz.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { icon: '👆', label: 'Toplam Swipe', value: stats.totalSwipes, color: 'var(--primary)' },
                    { icon: '❤️', label: 'Beğeni',       value: stats.totalLikes,  color: 'var(--success)' },
                    { icon: '📊', label: 'Beğeni Oranı', value: `%${stats.likeRatio}`, color: 'var(--accent)' },
                    { icon: '🏠', label: 'Oda',          value: stats.totalRooms,  color: 'gold' },
                    { icon: '✅', label: 'Tamamlanan',   value: stats.completedRooms, color: 'var(--success)' },
                  ].map(s => (
                    <motion.div key={s.label} whileHover={{ y: -3 }} className="glass-card" style={{ textAlign: 'center', padding: '1.2rem 0.8rem' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value ?? '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                {categoryEntries.length > 0 ? (
                  <div className="glass-card">
                    <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Trophy size={18} color="gold" /> Kategori Dağılımı
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {categoryEntries.map(([cat, pct]) => {
                        return (
                          <div key={cat}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                              <span>{CATEGORY_ICONS[cat] || '📦'} {cat}</span>
                              <span style={{ color: 'var(--text-muted)' }}>%{pct}</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                                style={{ height: '100%', background: 'linear-gradient(135deg,var(--primary),var(--secondary))', borderRadius: '4px' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                    <p style={{ color: 'var(--text-muted)' }}>Oda katıl ve kaydırmaya başla!</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ Arkadaşlar ═══════════════════════════════════════════════════ */}
        {activeTab === 'friends' && (
          <motion.div key="friends" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            {friends.length === 0 ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem' }}>
                <Users size={64} style={{ opacity: 0.2, marginBottom: '1.5rem', color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '300px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Henüz hiç arkadaşın yok. Sosyalleşmeye başlamak için ilk adımını at!
                </p>
                <button onClick={() => setActiveTab('add')} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                  <UserPlus size={16} style={{ marginRight: '8px' }} /> Arkadaş Bul
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {friends.map((f, i) => (
                  <motion.div
                    key={f._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card"
                    style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                  >
                    <div 
                      onClick={() => navigate(`/profile/${f._id}`)}
                      style={{
                        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,var(--surface-hover),var(--surface))',
                        border: '2px solid rgba(255,75,75,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Avatar src={f.profilePic} username={f.username} size={42} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div 
                        onClick={() => navigate(`/profile/${f._id}`)}
                        style={{ fontWeight: 600, cursor: 'pointer' }}
                      >
                        @{f.username}
                      </div>
                      <div style={{ marginTop: '0.3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <span>Uyum</span>
                          <span style={{ color: scoreColor(f.compatibilityScore), fontWeight: 700 }}>%{f.compatibilityScore}</span>
                        </div>
                        <ScoreBar score={f.compatibilityScore} />
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveFriend(f._id)}
                      disabled={actionId === f._id}
                      title="Arkadaşlıktan çıkar"
                      style={{
                        width: 34, height: 34, borderRadius: '50%', border: 'none',
                        background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s', opacity: actionId === f._id ? 0.5 : 1,
                      }}
                    >
                      <UserMinus size={15} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ Bekleyen İstekler ════════════════════════════════════════════ */}
        {activeTab === 'pending' && (
          <motion.div key="pending" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            {pendingFriendRequests.length === 0 ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem' }}>
                <Inbox size={64} style={{ opacity: 0.2, marginBottom: '1.5rem', color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '300px', lineHeight: 1.6 }}>
                  Şu an hiç arkadaşlık isteğin yok. Hemen <strong>'Arkadaş Bul'</strong> sekmesinden çevreni genişlet!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  {pendingFriendRequests.length} kişi sana arkadaşlık isteği gönderdi
                </p>
                {pendingFriendRequests.map((req, i) => (
                  <motion.div
                    key={req._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-card"
                    style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderColor: 'rgba(255,75,75,0.2)' }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--primary),var(--secondary))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: 700, color: 'white',
                    }}>
                      {req.username?.[0]?.toUpperCase()}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>@{req.username}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        sana arkadaşlık isteği gönderdi
                      </div>
                    </div>

                    {/* Kabul / Reddet */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleAccept(req._id)}
                        disabled={actionId === req._id}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', gap: '0.3rem' }}
                      >
                        <CheckCircle size={14} />
                        {actionId === req._id ? '...' : 'Kabul'}
                      </button>
                      <button
                        onClick={() => handleDecline(req._id)}
                        disabled={actionId === req._id}
                        style={{
                          padding: '0.4rem 0.9rem', borderRadius: '10px', border: '1px solid var(--danger)',
                          background: 'rgba(239,68,68,0.08)', color: 'var(--danger)',
                          cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                          opacity: actionId === req._id ? 0.5 : 1,
                        }}
                      >
                        <XCircle size={14} />
                        Reddet
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ Arkadaş Bul ══════════════════════════════════════════════════ */}
        {activeTab === 'add' && (
          <motion.div key="add" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="glass-card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} color="var(--accent)" /> Kullanıcı Ara
              </h3>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  className="input-field"
                  placeholder="Kullanıcı adıyla ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.6rem' }}
                />
              </div>
            </div>

            <AnimatePresence>
              {searching && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Aranıyor...</div>
              )}

              {!searching && searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {searchResults.map((u, i) => (
                    <motion.div
                      key={u._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card"
                      style={{ padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,var(--accent),#60efff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', fontWeight: 700, color: '#0f172a',
                      }}>
                        {u.username?.[0]?.toUpperCase()}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>@{u.username}</div>
                        {u.name && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.name}</div>}
                      </div>

                      {u.isFriend ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Heart size={13} fill="var(--success)" /> Arkadaşsınız
                        </span>
                      ) : u.isPending ? (
                        <button
                          onClick={() => handleCancelRequest(u._id)}
                          disabled={actionId === u._id}
                          className="btn"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                        >
                          {actionId === u._id ? '...' : <><Clock size={14} style={{ marginRight: 6 }} /> İstek Gönderildi</>}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u._id)}
                          disabled={actionId === u._id}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                          {actionId === u._id ? '...' : <><UserPlus size={14} /> İstek Gönder</>}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                  <p>"{searchQuery}" için kullanıcı bulunamadı</p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showRanks && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={() => setShowRanks(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(2,6,23,.78)', backdropFilter: 'blur(7px)' }}
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }}
              onMouseDown={(event) => event.stopPropagation()}
              className="glass-card"
              role="dialog" aria-modal="true" aria-labelledby="rank-dialog-title"
              style={{ width: '100%', maxWidth: 520, maxHeight: '82vh', overflowY: 'auto', padding: '1.15rem', border: '1px solid rgba(196,181,253,.35)', background: 'linear-gradient(145deg, rgba(30,41,59,.99), rgba(15,23,42,.99))' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#c4b5fd', fontSize: '.74rem', fontWeight: 800, letterSpacing: '.07em' }}>BITEMATCH İLERLEMEN</div>
                  <h2 id="rank-dialog-title" style={{ margin: '.25rem 0 0', color: 'white', fontSize: '1.3rem' }}>Rütbeler ve XP</h2>
                </div>
                <button type="button" onClick={() => setShowRanks(false)} aria-label="Rütbeleri kapat" style={{ border: 0, width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.08)', color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={18} /></button>
              </div>

              <div style={{ margin: '1rem 0', padding: '1rem', borderRadius: 14, background: 'linear-gradient(135deg, rgba(255,75,75,.16), rgba(139,92,246,.16))', border: '1px solid rgba(196,181,253,.22)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}><span style={{ fontSize: '2rem' }}>{gamification.currentRank.icon}</span><div><div style={{ color: 'white', fontWeight: 800 }}>{gamification.currentRank.title}</div><div style={{ color: 'var(--text-muted)', fontSize: '.76rem', marginTop: '.15rem' }}>{gamification.currentRank.description}</div></div></div>
                  <div style={{ color: '#fef3c7', fontWeight: 900, whiteSpace: 'nowrap' }}>{gamification.xp} XP</div>
                </div>
                {gamification.nextRank ? <><div style={{ height: 7, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,.1)', marginTop: '.9rem' }}><div style={{ width: `${gamification.progress}%`, height: '100%', background: 'linear-gradient(90deg,#fb7185,#a78bfa)', borderRadius: 99 }} /></div><div style={{ marginTop: '.4rem', color: 'var(--text-muted)', fontSize: '.73rem' }}>{gamification.nextRank.title} için {gamification.xpToNext} XP kaldı</div></> : <div style={{ marginTop: '.65rem', color: '#fef3c7', fontSize: '.78rem', fontWeight: 700 }}>Zirvedesin. Karar Efsanesi rütbesi açıldı!</div>}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '.76rem', lineHeight: 1.45, margin: '0 0 .8rem' }}>Her kaydırma +1 XP verir. Tamamlanan her grup odası +15 XP bonus kazandırır.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                {gamification.ranks.map((rank) => {
                  const unlocked = gamification.xp >= rank.minXp;
                  const active = rank.level === gamification.currentRank.level;
                  return <div key={rank.level} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.72rem .78rem', borderRadius: 12, border: `1px solid ${active ? 'rgba(251,113,133,.7)' : unlocked ? 'rgba(134,239,172,.22)' : 'rgba(255,255,255,.08)'}`, background: active ? 'rgba(255,75,75,.11)' : unlocked ? 'rgba(34,197,94,.05)' : 'rgba(255,255,255,.025)', opacity: unlocked ? 1 : .56 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: unlocked ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)', fontSize: '1.05rem' }}>{unlocked ? rank.icon : <Lock size={15} color="#94a3b8" />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: 'white', fontWeight: 800, fontSize: '.86rem' }}>Seviye {rank.level} · {rank.title}</div><div style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginTop: '.12rem' }}>{rank.description}</div></div>
                    <div style={{ color: unlocked ? '#86efac' : 'var(--text-muted)', fontSize: '.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{unlocked ? 'Açıldı' : `${rank.minXp} XP`}</div>
                  </div>;
                })}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
