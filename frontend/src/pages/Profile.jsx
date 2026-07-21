import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  User, Users, BarChart2, Search, UserPlus, UserMinus,
  Heart, Zap, Trophy, Calendar, ChevronRight, X,
} from 'lucide-react';
import api from '../api';

// ── Kategori emoji haritası ──────────────────────────────────────────────────
const CATEGORY_ICONS = {
  yemek: '🍔', restoran: '🍽️', film: '🎬', dizi: '📺',
  aktivite: '🎯', mekan: '📍', muzik: '🎵', oyun: '🎮', custom: '✨',
};

// ── Sekme bileşeni ───────────────────────────────────────────────────────────
const Tab = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none',
      background: active ? 'linear-gradient(135deg,var(--primary),var(--secondary))' : 'transparent',
      color: active ? 'white' : 'var(--text-muted)',
      fontWeight: active ? 700 : 500, fontSize: '0.9rem',
      cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: active ? '0 4px 14px rgba(255,75,75,0.3)' : 'none',
    }}
  >
    <Icon size={15} />
    {label}
  </button>
);

// ── Uyum skoru rengi ─────────────────────────────────────────────────────────
const scoreColor = (s) =>
  s >= 70 ? 'var(--success)' : s >= 40 ? 'gold' : 'var(--text-muted)';

// ── Uyum skoru çubuğu ────────────────────────────────────────────────────────
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

  // Arkadaş arama
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friendAction, setFriendAction] = useState(null); // işlem yapılan kullanıcı id'si

  // ── Profil yükle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/users/profile');
        setProfile(data);
      } catch {
        toast.error('Profil yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Kullanıcı arama ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${searchQuery}`);
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Arkadaş ekle ─────────────────────────────────────────────────────────
  const handleAddFriend = async (friendId) => {
    setFriendAction(friendId);
    try {
      const { data } = await api.post(`/users/friends/${friendId}`);
      toast.success(`Arkadaş eklendi! Uyum: %${data.compatibilityScore}`);
      // Profili yenile
      const { data: updated } = await api.get('/users/profile');
      setProfile(updated);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Eklenemedi');
    } finally {
      setFriendAction(null);
    }
  };

  // ── Arkadaş çıkar ────────────────────────────────────────────────────────
  const handleRemoveFriend = async (friendId) => {
    setFriendAction(friendId);
    try {
      await api.delete(`/users/friends/${friendId}`);
      toast.success('Arkadaş listeden çıkarıldı');
      setProfile(prev => ({ ...prev, friends: prev.friends.filter(f => f._id !== friendId), friendCount: prev.friendCount - 1 }));
    } catch {
      toast.error('Çıkarılamadı');
    } finally {
      setFriendAction(null);
    }
  };

  // ── Arkadaş mı kontrolü ───────────────────────────────────────────────────
  const isFriend = (id) => profile?.friends?.some(f => f._id === id);

  if (loading) return (
    <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="pulse-primary" style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--surface)' }} />
      <p style={{ color: 'var(--text-muted)' }}>Profil yükleniyor...</p>
    </div>
  );

  if (!profile) return null;

  const { stats, friends } = profile;
  const joinDate = new Date(profile.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  const categoryEntries = Object.entries(stats?.categoryDistribution || {}).sort((a, b) => b[1] - a[1]);
  const topCategory = categoryEntries[0];

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', paddingTop: '2rem' }}>

      {/* ── Hero Profil Kartı ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}
      >
        {/* Arka plan dekor */}
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

          {/* Bilgiler */}
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: '12px' }}>
        <Tab id="stats"   label="İstatistikler" icon={BarChart2} active={activeTab === 'stats'}   onClick={setActiveTab} />
        <Tab id="friends" label="Arkadaşlar"    icon={Users}     active={activeTab === 'friends'} onClick={setActiveTab} />
        <Tab id="add"     label="Arkadaş Bul"   icon={UserPlus}  active={activeTab === 'add'}     onClick={setActiveTab} />
      </div>

      <AnimatePresence mode="wait">

        {/* ══ İstatistikler Sekmesi ══════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

            {/* Özet kartlar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { icon: '👆', label: 'Toplam Swipe', value: stats.totalSwipes, color: 'var(--primary)' },
                { icon: '❤️', label: 'Beğeni', value: stats.totalLikes, color: 'var(--success)' },
                { icon: '📊', label: 'Beğeni Oranı', value: `%${stats.likeRatio}`, color: 'var(--accent)' },
                { icon: '🏠', label: 'Katıldığı Oda', value: stats.totalRooms, color: 'gold' },
                { icon: '✅', label: 'Tamamlanan', value: stats.completedRooms, color: 'var(--success)' },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  whileHover={{ y: -3 }}
                  className="glass-card"
                  style={{ textAlign: 'center', padding: '1.2rem 0.8rem' }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value ?? '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Kategori dağılımı */}
            {categoryEntries.length > 0 && (
              <div className="glass-card">
                <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} color="gold" /> Kategori Dağılımı
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {categoryEntries.map(([cat, count]) => {
                    const maxCount = categoryEntries[0][1];
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                          <span>{CATEGORY_ICONS[cat] || '📦'} {cat}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{count} beğeni</span>
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
            )}

            {categoryEntries.length === 0 && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <p style={{ color: 'var(--text-muted)' }}>Henüz istatistik oluşmadı. Oda katıl ve kaydırmaya başla!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══ Arkadaşlar Sekmesi ════════════════════════════════════════ */}
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
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--surface-hover),var(--surface))',
                      border: '2px solid rgba(255,75,75,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)',
                    }}>
                      {f.username?.[0]?.toUpperCase()}
                    </div>

                    {/* Bilgi */}
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

                    {/* Çıkar */}
                    <button
                      onClick={() => handleRemoveFriend(f._id)}
                      disabled={friendAction === f._id}
                      style={{
                        width: 34, height: 34, borderRadius: '50%', border: 'none',
                        background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s',
                      }}
                      title="Arkadaşlıktan çıkar"
                    >
                      <UserMinus size={15} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ Arkadaş Bul Sekmesi ═══════════════════════════════════════ */}
        {activeTab === 'add' && (
          <motion.div key="add" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="glass-card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} color="var(--accent)" /> Kullanıcı Ara
              </h3>

              {/* Arama kutusu */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  placeholder="Kullanıcı adıyla ara... (min 2 karakter)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.6rem' }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Sonuçlar */}
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

                      {isFriend(u._id) ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Heart size={13} fill="var(--success)" /> Arkadaşsınız
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(u._id)}
                          disabled={friendAction === u._id}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                          {friendAction === u._id ? '...' : <><UserPlus size={14} /> Ekle</>}
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
