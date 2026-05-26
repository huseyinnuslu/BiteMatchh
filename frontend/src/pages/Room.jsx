import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomContext } from '../context/RoomContext';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Link as LinkIcon, Check, Flame, RotateCcw } from 'lucide-react';
import MatchModal from '../components/MatchModal';
import OptionCard from '../components/OptionCard';
import WaitingRoom from './WaitingRoom';

const Room = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRoom, matchResult, fetchRoomStatus, swipe, joinRoom, resetRoom } = useContext(RoomContext);
  const { user } = useContext(AuthContext);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for right, -1 for left
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  // Geri sayım sayacı efekti
  useEffect(() => {
    if (currentRoom && currentRoom.status === 'voting' && currentRoom.timeLimit > 0 && currentRoom.votingStartedAt) {
      const calculateTimeLeft = () => {
        const startedAt = new Date(currentRoom.votingStartedAt);
        const limitSeconds = currentRoom.timeLimit;
        const now = new Date();
        const elapsedSeconds = Math.floor((now - startedAt) / 1000);
        const remaining = Math.max(0, limitSeconds - elapsedSeconds);
        setTimeLeft(remaining);
        
        // Sayaç bittiğinde backend'e oylamayı bitirmesi için sinyal gönder (odanın durumunu güncelle)
        if (remaining === 0) {
          fetchRoomStatus(id);
        }
      };

      calculateTimeLeft(); // İlk yüklemede çalıştır
      const timerId = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timerId);
    } else {
      setTimeLeft(null);
    }
  }, [currentRoom?.status, currentRoom?.timeLimit, currentRoom?.votingStartedAt, id]);

  // Polling mechanism
  useEffect(() => {
    let intervalId;
    const initRoom = async () => {
      const room = await fetchRoomStatus(id);
      if (room) {
        if (!room.participants.some(p => p._id === user._id)) {
          await joinRoom(id);
        }
        // Backend'den gelen userSwipes (oylanan kartlar) sayısına göre currentIndex'i belirle
        if (room.userSwipes) {
          setCurrentIndex(room.userSwipes.length);
        }
      }
    };
    initRoom();

    intervalId = setInterval(() => {
      if (!matchResult) {
        fetchRoomStatus(id);
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
      resetRoom();
    };
  }, [id]);

  if (!currentRoom) return <div className="flex-center" style={{ height: '70vh' }}>Oda Yükleniyor...</div>;

  if (currentRoom.status === 'waiting') {
    return <WaitingRoom />;
  }

  const handleSwipe = async (decision) => {
    if (currentIndex >= currentRoom.options.length) return;
    
    const option = currentRoom.options[currentIndex];
    setDirection(decision === 'like' ? 1 : -1);
    
    await swipe(id, option._id, decision);
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setDirection(0);
    }, 300);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const optionsFinished = currentIndex >= currentRoom.options.length;
  const isFinished = currentRoom.status === 'finished';
  const showResults = isFinished && !matchResult;
  const isHost = currentRoom.host._id === user._id || currentRoom.host === user._id;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '85vh', paddingBottom: '2rem' }}>
      
      {/* Header & Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{currentRoom.name}</h3>
        <button onClick={copyLink} className="btn" style={{ background: 'var(--surface)', color: 'white', padding: '0.5rem 1rem' }}>
          {copied ? <Check size={18} color="var(--success)" /> : <LinkIcon size={18} />}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          background: 'var(--primary)', 
          width: `${(currentIndex / currentRoom.options.length) * 100}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Geri Sayım Progress Barı */}
      {timeLeft !== null && currentRoom.status === 'voting' && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', color: timeLeft <= 10 ? 'var(--danger)' : 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>⏰ Kalan Süre</span>
            <span style={{ fontWeight: 'bold' }}>{timeLeft} Saniye</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: timeLeft <= 10 
                ? 'var(--danger)' 
                : timeLeft <= (currentRoom.timeLimit / 2) 
                  ? 'gold' 
                  : 'var(--success)', 
              width: `${(timeLeft / currentRoom.timeLimit) * 100}%`,
              transition: 'width 1s linear, background-color 0.5s ease',
              boxShadow: timeLeft <= 10 ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
            }} />
          </div>
        </div>
      )}

      {/* Swipe Area */}
      <div style={{ height: '480px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <AnimatePresence mode="wait">
          {showResults ? (
            <motion.div 
              key="results" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="flex-center" 
              style={{ flexDirection: 'column', textAlign: 'center', width: '100%' }}
            >
              <div className="glass-card animate-slide-up" style={{ width: '100%', borderColor: 'var(--primary)', background: 'rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.4rem' }}>
                  Grup Uyum Yüzdeniz: %{currentRoom.compatibilityPercentage || 0}! 🤝
                </h3>
                {currentRoom.timeLimit > 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem', fontWeight: 'bold' }}>
                    ⏰ Süre Sınırı Dolduğu İçin Oylama Kapanmıştır!
                  </p>
                )}
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Tam eşleşme sağlayamadık ama grubun en çok beğendiği ortak seçenekler aşağıda:
                </p>
                
                {currentRoom.topOptions && currentRoom.topOptions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    {currentRoom.topOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {opt.imageUrl && (
                          <img src={opt.imageUrl} alt={opt.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                        )}
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>{opt.name}</h4>
                          <small style={{ color: 'var(--success)' }}>{opt.likeCount} Beğeni</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--danger)', marginBottom: '1.5rem' }}>Hiçbir seçeneği beğenmediniz!</p>
                )}

                {isHost && (
                  <button onClick={() => navigate('/dashboard')} className="btn btn-primary pulse-primary" style={{ width: '100%' }}>
                    <RotateCcw size={18} style={{ marginRight: '0.5rem' }} /> Yeni Bir Oylama Başlat
                  </button>
                )}
              </div>
            </motion.div>
          ) : !optionsFinished ? (
            <OptionCard 
              key="card"
              currentIndex={currentIndex}
              direction={direction}
              option={currentRoom.options[currentIndex]}
              category={currentRoom.category}
            />
          ) : (
            <motion.div 
              key="waiting-others" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex-center" 
              style={{ flexDirection: 'column', textAlign: 'center', width: '100%' }}
            >
              <div className="pulse-primary" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Flame size={40} color="var(--primary)" />
              </div>
              <h3>Seçimlerini Yaptın!</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '2rem' }}>Diğer arkadaşların seçim yapmasını bekliyoruz. Eşleşme sağlandığında ekrana düşecek.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {!optionsFinished && !isFinished && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
          <button 
            onClick={() => handleSwipe('dislike')}
            className="btn"
            style={{ 
              width: '70px', height: '70px', borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
              border: '2px solid var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.2)'
            }}
          >
            <X size={35} />
          </button>
          <button 
            onClick={() => handleSwipe('like')}
            className="btn"
            style={{ 
              width: '70px', height: '70px', borderRadius: '50%', 
              background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)',
              border: '2px solid var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.2)'
            }}
          >
            <Heart size={35} fill="var(--success)" />
          </button>
        </div>
      )}

      {/* Participants List Bottom */}
      {!optionsFinished && !isFinished && (
         <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Katılımcı Durumları</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {currentRoom.participantStatuses ? currentRoom.participantStatuses.map((p, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                {p.status === 'finished' ? (
                  <><span style={{ color: 'var(--success)' }}>🟢</span> {p.user.username} (Oylamayı Bitirdi)</>
                ) : (
                  <><span style={{ color: 'gold' }}>🟡</span> {p.user.username} (Seçim yapıyor...)</>
                )}
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Odada {currentRoom.participants.length} Kişi Oyluyor</p>
            )}
          </div>
         </div>
      )}

      <MatchModal 
        isOpen={!!matchResult} 
        matchResult={matchResult} 
        onClose={() => navigate('/dashboard')} 
      />
    </div>
  );
};

export default Room;
