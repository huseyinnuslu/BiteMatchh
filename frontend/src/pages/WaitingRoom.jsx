import { useState, useEffect, useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import { RoomContext } from '../context/RoomContext';
import { Loader, Play, Users, Link, UserPlus, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { getSocket } from '../socket/socketClient';
import api from '../api';

const WaitingRoom = () => {
  const { currentRoom, startRoom, fetchRoomStatus } = useContext(RoomContext);
  const { user } = useContext(AuthContext);

  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);

  const isHost = currentRoom.host._id === user._id || currentRoom.host === user._id;
  const inviteLink = window.location.href;

  // 1. Arkadaş listesini çek
  useEffect(() => {
    if (!isHost) return;
    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const { data } = await api.get('/users/friends');
        setFriends(data);
      } catch (err) {
        console.error('Arkadaşlar yüklenemedi:', err);
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriends();
  }, [isHost]);

  // 2. Geri sayım sayacını yönet
  useEffect(() => {
    if (!currentRoom.inviteExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const calcTime = () => {
      const remaining = Math.max(0, new Date(currentRoom.inviteExpiresAt).getTime() - Date.now());
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Süre dolduğunda odayı 'expired' durumuna çekmek için statü sorgula
        fetchRoomStatus(currentRoom._id);
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [currentRoom.inviteExpiresAt, currentRoom._id, fetchRoomStatus]);

  const handleStart = async () => {
    await startRoom(currentRoom._id);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast.success('Katılım bağlantısı panoya kopyalandı! 🔗');
      })
      .catch(() => {
        toast.error('Bağlantı kopyalanamadı!');
      });
  };

  const handleInviteFriend = async (friendId, friendUsername) => {
    try {
      await api.put(`/rooms/${currentRoom._id}/invite`, { friendId });

      // Socket üzerinden davet fırlat
      const socket = getSocket();
      if (socket) {
        socket.emit('invite_to_room', {
          friendId,
          roomCode: currentRoom.name,
          roomId: currentRoom._id,
          inviterName: user.username,
        });
      }

      setInvitedIds(prev => new Set([...prev, friendId]));
      toast.success(`@${friendUsername} odaya davet edildi! 📩`);
      fetchRoomStatus(currentRoom._id); // Sayaç başlaması için odayı yenile
    } catch (err) {
      toast.error(err.response?.data?.message || 'Davet gönderilemedi.');
    }
  };

  const formatTimeLeft = (ms) => {
    if (ms === null || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '70vh', flexDirection: 'column' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'capitalize' }}>{currentRoom.name}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Bekleme Salonu</p>

        {/* Canlı Sayaç Göstergesi */}
        {currentRoom.inviteExpiresAt && timeLeft !== null && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 0.8rem', borderRadius: '20px',
            background: timeLeft < 60000 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${timeLeft < 60000 ? 'var(--danger)' : 'rgba(255,255,255,0.1)'}`,
            color: timeLeft < 60000 ? 'var(--danger)' : 'var(--primary)',
            fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '1.5rem',
          }}>
            <Clock size={14} /> Davet Süresi: {formatTimeLeft(timeLeft)}
          </div>
        )}

        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
          <QRCodeSVG value={inviteLink} size={150} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button 
            onClick={handleCopyLink} 
            className="btn btn-outline" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1.2rem', 
              borderColor: 'var(--primary)', 
              color: 'var(--primary)',
              transition: 'all 0.3s',
              backgroundColor: 'rgba(99, 102, 241, 0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
          >
            <Link size={18} /> Bağlantıyı Kopyala
          </button>
        </div>

        {/* Arkadaşlarımı Davet Et Bölümü */}
        {isHost && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
            <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '0.92rem', fontWeight: 800 }}>
              <UserPlus size={16} style={{ color: 'var(--primary)' }} /> Arkadaşlarımı Odaya Çağır
            </h4>
            {loadingFriends ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader className="spin" size={20} /></div>
            ) : friends.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0' }}>Arkadaş listeniz boş.</p>
            ) : (
              <div style={{
                maxHeight: '140px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '0.6rem', borderRadius: '12px'
              }}>
                {friends.map(f => {
                  const isInvited = invitedIds.has(f._id);
                  return (
                    <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>@{f.username}</span>
                      <button
                        onClick={() => handleInviteFriend(f._id, f.username)}
                        disabled={isInvited}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none',
                          background: isInvited ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                          color: isInvited ? 'var(--text-muted)' : 'black',
                          fontSize: '0.72rem', fontWeight: 'bold', cursor: isInvited ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isInvited ? 'Davet Edildi' : 'Odaya Çağır'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 800 }}>
            <Users size={18} /> Katılımcılar ({currentRoom.participants.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {currentRoom.participants.map((p, i) => (
              <span key={i} style={{ padding: '0.4rem 0.9rem', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                {p.username || 'Katılımcı'}
              </span>
            ))}
          </div>
        </div>

        {isHost ? (
          <button onClick={handleStart} className="btn btn-primary pulse-primary" style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}>
            <Play size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Herkes Hazır, Oylamayı Başlat!
          </button>
        ) : (
          <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
            <Loader className="spin" size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem' }}>Oda kurucusunun başlatması bekleniyor...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
