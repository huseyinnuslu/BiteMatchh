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
  const [platforms, setPlatforms] = useState([]);
  const [savingPlatforms, setSavingPlatforms] = useState(false);

  const isHost = currentRoom.host._id === user._id || currentRoom.host === user._id;
  const inviteLink = window.location.href;
  const isStreamingFilmRoom = currentRoom.category === 'film' && currentRoom.watchMode === 'streaming';
  const streamingSetup = currentRoom.streamingSetup || {};

  useEffect(() => {
    if (isStreamingFilmRoom) setPlatforms(streamingSetup.myPlatforms || []);
  }, [isStreamingFilmRoom, currentRoom._id, JSON.stringify(streamingSetup.myPlatforms || [])]);

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

  // 2b. Real-time katılımcı güncellemesi
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleJoined = () => {
      // Katılımcı listesini backend'den taze çek
      fetchRoomStatus(currentRoom._id);
    };
    const handleLeft = () => {
      fetchRoomStatus(currentRoom._id);
    };

    socket.on('participant_joined', handleJoined);
    socket.on('participant_left', handleLeft);
    socket.on('streaming_platforms_updated', handleJoined);

    return () => {
      socket.off('participant_joined', handleJoined);
      socket.off('participant_left', handleLeft);
      socket.off('streaming_platforms_updated', handleJoined);
    };
  }, [currentRoom._id, fetchRoomStatus]);

  // 3. Geri sayım sayacını yönet
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
    if (currentRoom.participants.length < 2) {
      toast.error('Odayı başlatmak için en az 1 kişi daha davet etmelisiniz (Toplam en az 2 kişi).');
      return;
    }
    await startRoom(currentRoom._id);
  };

  const savePlatforms = async () => {
    if (!platforms.length) return toast.error('En az bir platform seçmelisin.');
    setSavingPlatforms(true);
    try {
      const { data } = await api.put(`/rooms/${currentRoom._id}/streaming-platforms`, { platforms });
      fetchRoomStatus(currentRoom._id);
      toast.success(data.streamingSetup?.completedCount === data.streamingSetup?.participantCount ? 'Platform tercihleri tamamlandı.' : 'Platform tercihin kaydedildi.');
    } catch (error) { toast.error(error.response?.data?.message || 'Platform tercihi kaydedilemedi.'); }
    finally { setSavingPlatforms(false); }
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', width: '100%' }}>
          {/* Davet Süresi (En Üstte) */}
          {currentRoom.inviteExpiresAt && timeLeft !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '20px',
              background: timeLeft < 60000 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${timeLeft < 60000 ? 'var(--danger)' : 'rgba(255,255,255,0.1)'}`,
              color: timeLeft < 60000 ? 'var(--danger)' : 'var(--primary)',
              fontSize: '0.9rem', fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              <Clock size={16} /> Davet Süresi: {formatTimeLeft(timeLeft)}
            </div>
          )}
          
          {/* QR Kod (Ortada) */}
          <div style={{ background: 'white', padding: '0.5rem', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <QRCodeSVG value={inviteLink} size={140} />
          </div>

          {/* Kopyala Butonu (En Altta) */}
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
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              whiteSpace: 'nowrap'
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

        {isStreamingFilmRoom && (
          <div style={{ marginBottom: '1.35rem', textAlign: 'left', padding: '1rem', borderRadius: 12, background: 'rgba(99,102,241,.1)', border: '1px solid rgba(129,140,248,.32)' }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '.92rem' }}>Streaming erişimin</div>
            <p style={{ margin: '.35rem 0 .75rem', color: 'var(--text-muted)', fontSize: '.77rem', lineHeight: 1.45 }}>Sadece ikinizin de erişebildiği platformlardaki film ve diziler gelir. Diğer katılımcılar seçimini göremez.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem', marginBottom: '.75rem' }}>
              {(currentRoom.streamingPlatforms || []).map((platform) => {
                const selected = platforms.includes(platform);
                return <button key={platform} type="button" onClick={() => setPlatforms(prev => selected ? prev.filter(item => item !== platform) : [...prev, platform])} style={{ padding: '.48rem .62rem', borderRadius: 20, border: `1px solid ${selected ? 'var(--primary)' : 'rgba(255,255,255,.16)'}`, background: selected ? 'rgba(255,75,75,.17)' : 'transparent', color: selected ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>{platform}</button>;
              })}
            </div>
            <button type="button" onClick={savePlatforms} disabled={savingPlatforms} className="btn" style={{ width: '100%', padding: '.62rem', background: 'rgba(255,75,75,.88)', color: 'white', fontWeight: 800 }}>{savingPlatforms ? 'Kaydediliyor...' : 'Platformlarımı Kaydet'}</button>
            <div style={{ color: '#c4b5fd', fontSize: '.73rem', fontWeight: 700, textAlign: 'center', marginTop: '.65rem' }}>{streamingSetup.completedCount || 0}/{streamingSetup.participantCount || currentRoom.participants.length} katılımcı tercihini tamamladı</div>
          </div>
        )}

        {isHost ? (
          <button 
            onClick={handleStart} 
            disabled={currentRoom.participants.length < 2 || (isStreamingFilmRoom && streamingSetup.completedCount < currentRoom.participants.length)}
            className={`btn ${currentRoom.participants.length < 2 || (isStreamingFilmRoom && streamingSetup.completedCount < currentRoom.participants.length) ? 'btn-outline' : 'btn-primary pulse-primary'}`}
            style={{ 
              width: '100%', fontSize: '1rem', padding: '0.85rem', 
              opacity: currentRoom.participants.length < 2 || (isStreamingFilmRoom && streamingSetup.completedCount < currentRoom.participants.length) ? 0.6 : 1,
              cursor: currentRoom.participants.length < 2 || (isStreamingFilmRoom && streamingSetup.completedCount < currentRoom.participants.length) ? 'not-allowed' : 'pointer'
            }}
          >
            <Play size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> 
            {currentRoom.participants.length < 2 ? 'Odayı Başlatmak İçin Arkadaş Davet Edin' : isStreamingFilmRoom && streamingSetup.completedCount < currentRoom.participants.length ? 'Platform Tercihleri Bekleniyor' : 'Herkes Hazır, Oylamayı Başlat!'}
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
