import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Users, BarChart2, Search, UserPlus, UserMinus,
  Heart, Trophy, Calendar, Clock, CheckCircle, XCircle,
  UserCircle,
} from 'lucide-react';
import api from '../api';
import { getSocket } from '../socket/socketClient';

// ── Kategori emoji haritası ──────────────────────────────────────────────────
const CATEGORY_ICONS = {
  yemek: '🍔', restoran: '🍽️', film: '🎬', dizi: '📺',
  aktivite: '🎯', mekan: '📍', muzik: '🎵', oyun: '🎮', custom: '✨',
};

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
  const [activeTab, setActiveTab] = useState('stats');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState(null);

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

  // ── Arkadaşlık isteği kabul et ────────────────────────────────────────────
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
  const joinDate = new Date(profile.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  const categoryEntries = Object.entries(stats?.categoryBreakdown || {}).sort((a, b) => b[1] - a[1]);
  const topCategory = categoryEntries[0];

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
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,var(--primary),var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: 'white',
            boxShadow: '0 4px 20px rgba(255,75,75,0.35)',
          }}>
            {profile.username?.[0]?.toUpperCase() || '?'}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{profile.name || profile.username}</h2>
            <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0.6rem' }}>@{profile.username}</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={13} /> {joinDate}'dan beri
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={13} /> {profile.friendCount} arkadaş
              </span>
              {pendingCount > 0 && (
                <span
                  onClick={() => setActiveTab('pending')}
                  style={{ fontSize: '0.82rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  🔔 {pendingCount} bekleyen istek
                </span>
              )}
              {topCategory && (
                <span style={{ fontSize: '0.82rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {CATEGORY_ICONS[topCategory[0]] || '⭐'} {topCategory[0]} ustası
                </span>
              )}
            </div>
          </div>

          {/* Rozet */}
          <div style={{
            background: 'rgba(255,75,75,0.1)', border: '1px solid rgba(255,75,75,0.2)',
            borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem' }}>
              {stats.totalSwipes > 100 ? '🔥' : stats.totalSwipes > 50 ? '⚡' : '🌱'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {stats.totalSwipes > 100 ? 'Ateşli' : stats.totalSwipes > 50 ? 'Aktif' : 'Yeni'}
            </div>
          </div>
        </div>
      </motion.div>

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
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <h3 style={{ marginBottom: '0.5rem' }}>Henüz arkadaşın yok</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Arkadaş ekleyerek uyum skorlarını gör!</p>
                <button onClick={() => setActiveTab('add')} className="btn btn-primary" style={{ width: '100%' }}>
                  <UserPlus size={16} /> Arkadaş Bul
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
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--surface-hover),var(--surface))',
                      border: '2px solid rgba(255,75,75,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)',
                    }}>
                      {f.username?.[0]?.toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>@{f.username}</div>
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
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <h3 style={{ marginBottom: '0.5rem' }}>Bekleyen istek yok</h3>
                <p style={{ color: 'var(--text-muted)' }}>Başkalarına arkadaşlık isteği gönderebilirsin.</p>
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
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} /> İstek Gönderildi
                        </span>
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
    </div>
  );
};

export default Profile;
