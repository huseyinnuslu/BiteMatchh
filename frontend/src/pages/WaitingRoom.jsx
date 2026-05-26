import { useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import { RoomContext } from '../context/RoomContext';
import { Loader, Play, Users, Link } from 'lucide-react';
import { toast } from 'react-toastify';

const WaitingRoom = () => {
  const { currentRoom, startRoom } = useContext(RoomContext);
  const { user } = useContext(AuthContext);

  const isHost = currentRoom.host._id === user._id || currentRoom.host === user._id;
  const inviteLink = window.location.href;

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

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '70vh', flexDirection: 'column' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'capitalize' }}>{currentRoom.name}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Bekleme Salonu</p>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
          <QRCodeSVG value={inviteLink} size={150} />
        </div>

        <div style={{ marginBottom: '2rem' }}>
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

        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Users size={20} /> Katılımcılar ({currentRoom.participants.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {currentRoom.participants.map((p, i) => (
              <span key={i} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.9rem' }}>
                {p.username || 'Katılımcı'}
              </span>
            ))}
          </div>
        </div>

        {isHost ? (
          <button onClick={handleStart} className="btn btn-primary pulse-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>
            <Play size={20} style={{ marginRight: '0.5rem' }} /> Herkes Hazır, Oylamayı Başlat!
          </button>
        ) : (
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
            <Loader className="spin" size={24} color="var(--primary)" />
            <span>Oda kurucusunun başlatması bekleniyor...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
