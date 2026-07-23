import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Users, BarChart2, UserPlus, UserMinus, Clock, ArrowLeft,
  UserCheck, UserX
} from 'lucide-react';
import api from '../api';
import Avatar from '../components/Avatar';
import { getSocket } from '../socket/socketClient';

const CATEGORY_ICONS = {
  yemek: '🍔', restoran: '🍽️', film: '🎬', dizi: '📺',
  aktivite: '🏃', mekan: '📍', muzik: '🎵', oyun: '🎮', custom: '🎯',
};

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    if (id === currentUser?._id) {
      navigate('/profile');
      return;
    }
    const loadProfile = async () => {
      try {
        const { data } = await api.get(`/users/profile/${id}`);
        setProfile(data);
      } catch (err) {
        toast.error('Kullanıcı bulunamadı');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [id, currentUser, navigate]);

  const handleSendRequest = async () => {
    setActionId(id);
    try {
      await api.post(`/users/friends/${id}`);
      toast.success('Arkadaşlık isteği gönderildi! 🤝');
      setProfile(prev => ({ ...prev, isPending: true }));
      const socket = getSocket();
      if (socket) {
        socket.emit('friend_request_notify', { toUserId: id, fromUsername: currentUser.username });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'İstek gönderilemedi');
    } finally { setActionId(null); }
  };

  const handleCancelRequest = async () => {
    setActionId(id);
    try {
      await api.delete(`/users/friends/${id}/cancel`);
      toast.success('İstek geri çekildi');
      setProfile(prev => ({ ...prev, isPending: false }));
    } catch (e) {
      toast.error('İstek iptal edilemedi');
    } finally { setActionId(null); }
  };

  const handleRemoveFriend = async () => {
    setActionId(id);
    try {
      await api.delete(`/users/friends/${id}`);
      toast.success('Arkadaşlıktan çıkarıldı');
      setProfile(prev => ({ ...prev, isFriend: false, friendCount: Math.max(0, prev.friendCount - 1) }));
    } catch { toast.error('Çıkarılamadı'); }
    finally { setActionId(null); }
  };

  const handleFollow = async () => {
    setActionId('follow');
    try {
      await api.post(`/users/follow/${id}`);
      toast.success('Takip ediliyor');
      setProfile(prev => ({ ...prev, isFollowing: true, followersCount: (prev.followersCount || 0) + 1 }));
    } catch { toast.error('Takip edilemedi'); }
    finally { setActionId(null); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>Yükleniyor...</div>;
  }

  if (!profile) return null;

  const joinDate = new Date(profile.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  const categoryEntries = profile.stats?.categoryBreakdown ? Object.entries(profile.stats.categoryBreakdown).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="animate-slide-up" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1rem', paddingBottom: '4rem' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', marginBottom: '1.5rem', transition: 'all 0.2s' }}
      >
        <ArrowLeft size={20} />
      </button>

      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Avatar src={profile.profilePic} username={profile.name || profile.username} size={80} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.6rem' }}>{profile.name}</h2>
            <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem' }}>@{profile.username}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={13} /> {joinDate}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={13} /> {profile.friendCount} arkadaş
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {profile.isFriend ? (
              <button onClick={handleRemoveFriend} disabled={actionId === id} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '0.6rem 1rem' }}>
                <UserMinus size={16} style={{ marginRight: 6 }} /> Çıkar
              </button>
            ) : profile.isPending ? (
              <button onClick={handleCancelRequest} disabled={actionId === id} className="btn" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.6rem 1rem' }}>
                <Clock size={16} style={{ marginRight: 6 }} /> İstek Gönderildi
              </button>
            ) : (
              <button onClick={handleSendRequest} disabled={actionId === id} className="btn btn-primary" style={{ padding: '0.6rem 1rem' }}>
                <UserPlus size={16} style={{ marginRight: 6 }} /> Ekle
              </button>
            )}
          </div>
        </div>
      </div>

      {profile.isStatsPublic && profile.stats ? (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            <BarChart2 size={18} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>İstatistikler</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>{profile.stats.totalSwipes}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Oylama</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.25rem' }}>{profile.stats.totalLikes}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Beğeni (Sağa Kaydırma)</div>
            </div>
          </div>
          {categoryEntries.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Favori Kategoriler</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {categoryEntries.slice(0, 5).map(([cat, percentage]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {CATEGORY_ICONS[cat] || '✨'} {cat}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>%{percentage}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Gizli Profil</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Bu kullanıcı istatistiklerini herkese açık olarak paylaşmıyor.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
