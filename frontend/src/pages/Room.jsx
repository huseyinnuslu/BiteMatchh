import { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomContext } from '../context/RoomContext';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Link as LinkIcon, Check, Flame, RotateCcw, LogOut } from 'lucide-react';
import MatchModal from '../components/MatchModal';
import OptionCard from '../components/OptionCard';
import WaitingRoom from './WaitingRoom';
import ChatDrawer from '../components/ChatDrawer';
import Avatar from '../components/Avatar';
import RestaurantRecommendations from '../components/RestaurantRecommendations';
import { connectSocket, getSocket } from '../socket/socketClient';
import { toast } from 'react-toastify';
import api from '../api';

const Room = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRoom, setCurrentRoom, matchResult, fetchRoomStatus, swipe, joinRoom, resetRoom } =
    useContext(RoomContext);
  const { user } = useContext(AuthContext);

  const roomRef = useRef(currentRoom);
  useEffect(() => {
    roomRef.current = currentRoom;
  }, [currentRoom]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [socketMatch, setSocketMatch] = useState(null); // Socket'tan gelen anlık eşleşme
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatMatchItem, setChatMatchItem] = useState(null);
  const [matchModalDismissed, setMatchModalDismissed] = useState(false);
  const [showRestaurantFlow, setShowRestaurantFlow] = useState(false);
  const [restaurantRecommendationsEnabled, setRestaurantRecommendationsEnabled] = useState(false);
  const pollingRef = useRef(null);
  const autoOpenedChatForMatchRef = useRef(null);
  const socketMatchFired = useRef(false); // Tekrar tetiklenmeyi önle

  useEffect(() => {
    let active = true;
    api.get('/places/status')
      .then(({ data }) => { if (active) setRestaurantRecommendationsEnabled(Boolean(data.enabled)); })
      .catch(() => { if (active) setRestaurantRecommendationsEnabled(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const isThisRoomFinished =
      String(currentRoom?._id) === String(id) &&
      currentRoom?.status === 'finished' &&
      currentRoom?.matchResult;

    if (!isThisRoomFinished) {
      autoOpenedChatForMatchRef.current = null;
      return;
    }

    setChatMatchItem(currentRoom.matchResult);

    // Room status polling returns a fresh matchResult object every few seconds.
    // Auto-opening on that object would reopen a chat the user already closed.
    const matchKey = `${id}:${currentRoom.matchResult?._id || currentRoom.matchResult?.name || 'result'}`;
    if (autoOpenedChatForMatchRef.current !== matchKey) {
      autoOpenedChatForMatchRef.current = matchKey;
      setChatOpen(true);
    }
  }, [currentRoom?._id, currentRoom?.status, currentRoom?.matchResult?._id, currentRoom?.matchResult?.name, id]);
  useEffect(() => {
    // Yeni bir oda/sonuç geldiğinde modal ve devam akışını sıfırdan başlat.
    setMatchModalDismissed(false);
    setShowRestaurantFlow(false);
  }, [id, currentRoom?.matchResult?._id, currentRoom?.matchResult?.name]);

  // ── Geri sayım ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      currentRoom &&
      currentRoom.status === 'voting' &&
      currentRoom.timeLimit > 0 &&
      currentRoom.votingStartedAt
    ) {
      const calc = () => {
        const elapsed = Math.floor(
          (Date.now() - new Date(currentRoom.votingStartedAt)) / 1000
        );
        const remaining = Math.max(0, currentRoom.timeLimit - elapsed);
        setTimeLeft(remaining);
        if (remaining === 0) fetchRoomStatus(id);
      };
      calc();
      const timer = setInterval(calc, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(null);
    }
  }, [currentRoom?.status, currentRoom?.timeLimit, currentRoom?.votingStartedAt, id]);

  // ── Socket + Oda Başlangıcı ────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let socket;
    let handleConnect;
    const init = async () => {
      socketMatchFired.current = false;
      autoOpenedChatForMatchRef.current = null;

      // 1. REST: oda durumunu al
      const room = await fetchRoomStatus(id);
      if (disposed) return;
      setSocketMatch(null);
      setChatMatchItem(null);
      setChatOpen(false);
      if (room) {
        if (!room.participants.some((p) => (p._id || p) === user._id)) {
          await joinRoom(id);
          if (disposed) return;
        }
        if (room.userSwipes) setCurrentIndex(room.userSwipes.length);
      }

      // 2. Socket bağlantısı
      const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
      socket = connectSocket(token);

      handleConnect = () => {
        socket.emit('join_room', {
          roomCode: id,
          userId: user._id,
          username: user.username,
        });
      };

      if (socket.connected) {
        handleConnect();
      }
      socket.on('connect', handleConnect);

      // user_swiped: diğer katılımcı kaydırdı → UI güncelle (opsiyonel bilgi)
      socket.on('user_swiped', ({ userId, username, direction: dir }) => {
        if (userId === user._id) return; // kendi aksiyonumuzu yoksay
        console.log(`👆 ${username} → ${dir === 'right' ? '💚' : '❌'}`);
      });

      // match_success: eşleşme socket'tan geldi → anlık modal aç
      socket.on('match_success', ({ itemId }) => {
        // En güncel odayı ref'ten al
        const latestRoom = roomRef.current;
        if (!latestRoom || String(latestRoom._id) !== String(id)) return;
        
        // Eşleşen seçeneğin BU ODANIN seçenekleri arasında olduğunu doğrula
        const matched = latestRoom?.options?.find((o) => String(o._id) === String(itemId));
        if (!matched) return; // Eski odanın id'si ise yoksay
        
        if (socketMatchFired.current) return;
        socketMatchFired.current = true;
        
        setSocketMatch(matched);
        setChatMatchItem(matched);
        setTimeout(() => setChatOpen(true), 1200);

        // Arka planda DB state'ini senkronize et
        fetchRoomStatus(id);
      });

      // participant_joined / left
      socket.on('participant_joined', ({ username: uname, count }) => {
        toast.info(`👥 ${uname} odaya katıldı! (${count} kişi)`);
        fetchRoomStatus(id); // Katılımcı listesini güncellemek için DB'den tekrar çek
      });
      socket.on('participant_left', ({ username: uname }) => {
        toast.warning(`👋 ${uname} odadan ayrıldı`);
        fetchRoomStatus(id);
      });

      // Oda başlama anlık bildirimi (gecikmeyi sıfırlar)
      socket.on('room_started', (roomData) => {
        console.log('Oda başladı:', roomData);
        // Anında arayüzü güncelle, REST gecikmesini bekleme!
        if (roomData) setCurrentRoom(roomData);
        fetchRoomStatus(id); // arka planda yedek senkronizasyon
      });
    };

    init();

    // Hafif polling: status=finished kontrolü için (3sn → 5sn, socket varken yük azalt)
    pollingRef.current = setInterval(() => {
      const latestRoom = roomRef.current;
      if (
        !latestRoom ||
        String(latestRoom._id) !== String(id) ||
        latestRoom.status !== 'finished'
      ) {
        fetchRoomStatus(id);
      }
    }, 5000);

    return () => {
      disposed = true;
      clearInterval(pollingRef.current);
      const socket = getSocket();
      if (socket) {
        // Eski odadan tamamen ayrıl (match_success vs. sızmasını önlemek için)
        socket.emit('leave_room', { roomCode: id, userId: user?._id, username: user?.username });
        
        socket.off('connect', handleConnect);
        socket.off('user_swiped');
        socket.off('match_success');
        socket.off('participant_joined');
        socket.off('participant_left');
        socket.off('room_started');
      }
      resetRoom();
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRestaurantMatchChat = useCallback((restaurant) => {
    setChatMatchItem(restaurant);
    window.setTimeout(() => setChatOpen(true), 1200);
  }, []);

  if (!currentRoom) {
    return <div className="flex-center" style={{ height: '70vh' }}>Oda Yükleniyor...</div>;
  }

  if (currentRoom.status === 'expired') {
    return (
      <div className="flex-center animate-slide-up" style={{ minHeight: '70vh', flexDirection: 'column' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⏰</div>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Davet Süresi Doldu</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5, fontSize: '0.95rem' }}>
            Bu odaya katılım için tanınan 15 dakikalık süre doldu ve oda otomatik olarak kapatıldı.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
            Keşfet Sayfasına Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (currentRoom.status === 'waiting') {
    return <WaitingRoom />;
  }

  // ── Swipe işlemi ───────────────────────────────────────────────────────────
  const handleSwipe = async (decision) => {
    if (currentIndex >= currentRoom.options.length) return;

    const option = currentRoom.options[currentIndex];
    setDirection(decision === 'like' ? 1 : -1);

    // Socket'a anlık bildir
    const socket = getSocket();
    if (socket) {
      socket.emit('swipe_action', {
        roomCode: id,
        userId: user._id,
        itemId: option._id,
        direction: decision === 'like' ? 'right' : 'left',
      });
    }

    // REST swipe kaydı (DB'ye yaz + server-side eşleşme kontrolü)
    await swipe(id, option._id, decision);

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setDirection(0);
    }, 300);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const optionsFinished = currentIndex >= currentRoom.options.length;
  const isFinished = String(currentRoom._id) === String(id) && currentRoom.status === 'finished';
  const showResults = isFinished && !matchResult && !socketMatch;
  const isHost = currentRoom.host._id === user._id || currentRoom.host === user._id;

  // Socket match → RoomContext match önceliği
  // A result may only be rendered when it belongs to the room in the URL.
  // Do not use the context-wide/socket value here: either may belong to an
  // earlier room while navigation or a socket update is in progress.
  const socketMatchBelongsToCurrentRoom = !!socketMatch && (currentRoom.options || []).some(
    (option) => String(option._id) === String(socketMatch._id)
  );
  const contextMatchBelongsToCurrentRoom = !!matchResult && (currentRoom.options || []).some(
    (option) => String(option._id) === String(matchResult._id)
  );
  const activeMatch = isFinished
    ? currentRoom.matchResult
    : socketMatchBelongsToCurrentRoom
      ? socketMatch
      : contextMatchBelongsToCurrentRoom ? matchResult : null;
  const isFoodMatch = ['mekan', 'food'].includes(currentRoom.category) && !!activeMatch;
  const isFilmMatch = ['film', 'movie'].includes(currentRoom.category) && !!activeMatch;
  // Film kartları canlı vizyon/streaming kaynağından gelmeden sinema salonu
  // akışını açmayız; statik bir filme gerçek seans/salon vaat etmek yanıltıcıdır.
  // TMDb tabanlı film havuzu eklendiğinde film tarafı burada ayrıca açılacak.
  const isVenueMatch = isFoodMatch;
  const isRestaurantRound = currentRoom.category === 'restaurant';
  const isCinemaRound = currentRoom.category === 'cinema';
  const closeMatchModal = () => {
    if (isVenueMatch && restaurantRecommendationsEnabled) {
      setMatchModalDismissed(true);
      setShowRestaurantFlow(true);
      setChatOpen(false);
      return;
    }
    navigate('/dashboard');
  };
  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '85vh',
        paddingBottom: '2rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{currentRoom.name}</h3>
        <button
          onClick={copyLink}
          className="btn"
          style={{ background: 'var(--surface)', color: 'white', padding: '0.5rem 1rem' }}
        >
          {copied ? <Check size={18} color="var(--success)" /> : <LinkIcon size={18} />}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            background: 'var(--primary)',
            width: `${(currentIndex / currentRoom.options.length) * 100}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Geri Sayım */}
      {timeLeft !== null && currentRoom.status === 'voting' && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', color: timeLeft <= 10 ? 'var(--danger)' : 'var(--text-muted)' }}>
            <span>⏰ Kalan Süre</span>
            <span style={{ fontWeight: 'bold' }}>{timeLeft} Saniye</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: timeLeft <= 10 ? 'var(--danger)' : timeLeft <= currentRoom.timeLimit / 2 ? 'gold' : 'var(--success)',
                width: `${(timeLeft / currentRoom.timeLimit) * 100}%`,
                transition: 'width 1s linear, background-color 0.5s ease',
                boxShadow: timeLeft <= 10 ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
              }}
            />
          </div>
        </div>
      )}

      {!showRestaurantFlow && (
        <>
      {/* Swipe Area */}
      <div style={{ height: '480px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <AnimatePresence mode="wait">
          {showResults ? (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-center" style={{ flexDirection: 'column', textAlign: 'center', width: '100%' }}>
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
                        {opt.imageUrl && <img src={opt.imageUrl} alt={opt.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />}
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>{opt.name}</h4>
                          <small style={{ color: 'var(--success)' }}>{opt.likeCount} Beğeni</small>
                          {opt.location && (
                            <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {opt.location}</div>
                          )}
                        </div>
                        {opt.location && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opt.name + ' ' + opt.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '0.4rem 0.7rem', background: 'rgba(66,133,244,0.2)', color: '#93c5fd', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            🗺 Harita
                          </a>
                        )}
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
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn"
                  style={{
                    width: '100%', marginTop: isHost ? '0.75rem' : 0, padding: '0.85rem',
                    color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  <LogOut size={17} /> Odadan Çık & Keşfete Dön
                </button>
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
            <motion.div key="waiting-others" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-center" style={{ flexDirection: 'column', textAlign: 'center', width: '100%' }}>
              <div className="pulse-primary" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Flame size={40} color="var(--primary)" />
              </div>
              <h3>Seçimlerini Yaptın!</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '2rem' }}>
                Diğer arkadaşların seçim yapmasını bekliyoruz. Eşleşme sağlandığında ekrana düşecek.
              </p>
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
            style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '2px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(239,68,68,0.2)' }}
          >
            <X size={35} />
          </button>
          <button
            onClick={() => handleSwipe('like')}
            className="btn"
            style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(34,197,94,0.2)' }}
          >
            <Heart size={35} fill="var(--success)" />
          </button>
        </div>
      )}

      {/* Katılımcı durumları */}
      {!optionsFinished && !isFinished && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Katılımcı Durumları</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {currentRoom.participantStatuses ? (
              currentRoom.participantStatuses.map((p, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  {p.status === 'finished' ? (
                    <><Avatar src={p.user.profilePic} username={p.user.username} size={28} /><span style={{ color: 'var(--success)' }}>🟢</span> {p.user.username} (Oylamayı Bitirdi)</>
                  ) : (
                    <><Avatar src={p.user.profilePic} username={p.user.username} size={28} /><span style={{ color: 'gold' }}>🟡</span> {p.user.username} (Seçim yapıyor...)</>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Odada {currentRoom.participants.length} Kişi Oyluyor
              </p>
            )}
          </div>
        </div>
      )}

        </>
      )}

      {restaurantRecommendationsEnabled && showRestaurantFlow && isVenueMatch && (
        <RestaurantRecommendations
          roomId={id}
          cuisine={activeMatch?.name}
          venueKind={isFilmMatch ? 'cinema' : 'restaurant'}
          participantCount={currentRoom.participants.length}
          onStartRestaurantRound={(restaurantRoomId) => navigate(`/room/${restaurantRoomId}`)}
          onRestaurantMatched={openRestaurantMatchChat}
          onExit={() => navigate('/dashboard')}
        />
      )}

      {/* Match Modal – REST veya Socket'tan gelen eşleşme */}
      <MatchModal
        isOpen={!!activeMatch && !matchModalDismissed}
        matchResult={activeMatch}
        onClose={closeMatchModal}
        onExitRoom={() => navigate('/dashboard')}
        title={isRestaurantRound ? 'RESTORAN BELİRLENDİ!' : isCinemaRound ? 'SİNEMA SALONU BELİRLENDİ!' : undefined}
        subtitle={isRestaurantRound ? 'Grubunuz nerede yiyeceğine karar verdi.' : isCinemaRound ? 'Grubunuz filmi nerede izleyeceğine karar verdi.' : undefined}
        closeLabel={isRestaurantRound || isCinemaRound ? 'Kararı Tamamla & Keşfete Dön' : undefined}
      />
      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        roomCode={id}
        roomId={id}
        matchedItem={chatMatchItem || matchResult || socketMatch}
      />
    </div>
  );
};

export default Room;
