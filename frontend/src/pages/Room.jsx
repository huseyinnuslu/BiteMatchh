import { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { RoomContext } from '../context/RoomContext';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Link as LinkIcon, Check, CheckCircle2, Circle, Flame, RotateCcw, LogOut, AlertTriangle, Map } from 'lucide-react';
import MatchModal from '../components/MatchModal';
import OptionCard from '../components/OptionCard';
import WaitingRoom from './WaitingRoom';
import ChatDrawer from '../components/ChatDrawer';
import Avatar from '../components/Avatar';
import RestaurantRecommendations from '../components/RestaurantRecommendations';
import { connectSocket, getSocket } from '../socket/socketClient';
import { toast } from 'react-toastify';
import api from '../api';
import { preloadImages } from '../utils/imageCache';

const Room = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRoom, setCurrentRoom, matchResult, fetchRoomStatus, swipe, joinRoom, leaveRoom, resetRoom } =
    useContext(RoomContext);
  const { user } = useContext(AuthContext);

  const roomRef = useRef(currentRoom);
  useEffect(() => {
    roomRef.current = currentRoom;
  }, [currentRoom]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Görünür kart tarayıcı tarafından doğrudan yüklenirken, sıradaki birkaç
  // kartı arka planda hazırlarız. Böylece kart değişimi ağ yanıtına bağlı
  // kalmaz ve özellikle mobilde "görsel hazırlanıyor" görünmez.
  useEffect(() => {
    if (!currentRoom?.options?.length) return;
    preloadImages(
      currentRoom.options
        .slice(currentIndex + 1, currentIndex + 6)
        .flatMap((option) => [option.imageUrl, option.fallbackImageUrl])
    );
  }, [currentRoom?._id, currentRoom?.options, currentIndex]);

  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [socketMatch, setSocketMatch] = useState(null); // Socket'tan gelen anlık eşleşme
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatMatchItem, setChatMatchItem] = useState(null);
  const [matchModalDismissed, setMatchModalDismissed] = useState(false);
  const [showRestaurantFlow, setShowRestaurantFlow] = useState(false);
  const [restaurantRecommendationsEnabled, setRestaurantRecommendationsEnabled] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  // Oda URL'si açıldığında önce sunucudaki gerçek katılımcı kaydını kontrol
  // ederiz. Böylece başka hesap/önceki oda bellekteyken bekleme salonu
  // yanlışlıkla çizilmez.
  const [roomAccessReady, setRoomAccessReady] = useState(false);
  const pollingRef = useRef(null);
  // Bir kart karar kaydedilirken ikinci bir buton/gesture tetiklemesini engeller.
  const decisionInFlightRef = useRef(false);
  const chatNotificationRequestedRef = useRef(new URLSearchParams(location.search).get('chat') === '1');
  const autoOpenedChatForMatchRef = useRef(null);
  const socketMatchFired = useRef(false); // Tekrar tetiklenmeyi önle

  useEffect(() => {
    let active = true;
    api.get('/places/status')
      .then(({ data }) => { if (active) setRestaurantRecommendationsEnabled(Boolean(data.enabled)); })
      .catch(() => { if (active) setRestaurantRecommendationsEnabled(false); });
    return () => { active = false; };
  }, []);

  // Oda içi mesaj bildiriminden gelindiyse sonuç modalını değil sohbeti aç.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('chat') !== '1') return;
    chatNotificationRequestedRef.current = true;
    setMatchModalDismissed(true);
    setChatOpen(true);
  }, [location.search]);

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
    // Ancak oda sohbeti bildiriminden dönüldüyse, kullanıcı zaten bu yemek
    // eşleşmesinin "Nerede Yiyelim?" adımındaydı. Sohbeti açarken bu adımı
    // gizlemek, konum/öneri ekranını kaybolmuş gibi gösteriyordu.
    const openedFromRoomChat = new URLSearchParams(location.search).get('chat') === '1';
    const isFinishedFoodMatch =
      currentRoom?.status === 'finished' &&
      ['mekan', 'food'].includes(currentRoom?.category) &&
      Boolean(currentRoom?.matchResult);

    setMatchModalDismissed(openedFromRoomChat || chatNotificationRequestedRef.current);
    setShowRestaurantFlow(Boolean(openedFromRoomChat && isFinishedFoodMatch));
  }, [
    id,
    location.search,
    currentRoom?.status,
    currentRoom?.category,
    currentRoom?.matchResult?._id,
    currentRoom?.matchResult?.name,
  ]);

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
      setRoomAccessReady(false);
      socketMatchFired.current = false;
      autoOpenedChatForMatchRef.current = null;

      // 1. REST: oda durumunu al
      let room = await fetchRoomStatus(id);
      if (disposed) return;
      if (!room) {
        resetRoom();
        navigate('/dashboard', { replace: true });
        return;
      }
      // Bildirimden `?chat=1` ile gelindiyse bu oda, kullanıcı seçim ekranına
      // dönmüş olsa bile önce oda sohbetini açmalıdır.
      const shouldOpenRoomChat = chatNotificationRequestedRef.current || new URLSearchParams(location.search).get('chat') === '1';
      setSocketMatch(null);
      setChatMatchItem(shouldOpenRoomChat ? (room?.matchResult || null) : null);
      setMatchModalDismissed(shouldOpenRoomChat);
      setChatOpen(shouldOpenRoomChat);
      if (room) {
        // API aynı kullanıcıyı bazen ObjectId, bazen string olarak döndürür.
        // Referans eşitliği yerine değer eşitliği kullanılmazsa ikinci cihazda
        // kullanıcı odada olmasına rağmen tekrar katılma isteği atılıyordu.
        if (!room.participants.some((p) => String(p._id || p) === String(user._id))) {
          const joinResult = await joinRoom(id);
          if (disposed) return;
          if (!joinResult.success) {
            resetRoom();
            navigate('/dashboard', { replace: true });
            return;
          }
          // Katıldıktan sonra host/katılımcı bilgisini aynı token ile tekrar
          // al; eski odanın sahibi ekranda kalmasın.
          room = await fetchRoomStatus(id);
          if (disposed || !room) {
            resetRoom();
            navigate('/dashboard', { replace: true });
            return;
          }
        }
        if (room.userSwipes) setCurrentIndex(room.userSwipes.length);
      }

      setRoomAccessReady(true);

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
      socket.on('user_swiped', ({ userId, username, direction: dir, completed }) => {
        if (userId === user._id) return; // kendi aksiyonumuzu yoksay
        console.log(`${username}: ${dir === 'right' ? 'beğendi' : 'geçti'}`);
        // Katılımcı durumu polling'i beklemeden hemen güncellensin. Bu yalnız
        // görsel ilerleme bilgisidir; gerçek eşleşme kararı yine backend'dedir.
        if (completed) {
          setCurrentRoom((previous) => previous ? {
            ...previous,
            participantStatuses: (previous.participantStatuses || []).map((participant) =>
              String(participant.user?._id || participant.user) === String(userId)
                ? { ...participant, status: 'finished' }
                : participant
            ),
          } : previous);
        }
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
        toast.info(`${uname} odaya katıldı. (${count} kişi)`);
        fetchRoomStatus(id); // Katılımcı listesini güncellemek için DB'den tekrar çek
      });
      socket.on('participant_left', ({ username: uname }) => {
        toast.warning(`${uname} odadan ayrıldı.`);
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
  }, [id, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRestaurantMatchChat = useCallback((restaurant) => {
    setChatMatchItem(restaurant);
    window.setTimeout(() => setChatOpen(true), 1200);
  }, []);

  if (!roomAccessReady || !currentRoom || String(currentRoom._id) !== String(id)) {
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
    if (decisionInFlightRef.current || currentIndex >= currentRoom.options.length) return;

    const option = currentRoom.options[currentIndex];
    if (!option?._id) return;
    const isLastOption = currentIndex + 1 >= currentRoom.options.length;

    decisionInFlightRef.current = true;
    setDirection(decision === 'like' ? 1 : -1);

    // Socket'a anlık bildir
    const socket = getSocket();
    if (socket) {
      socket.emit('swipe_action', {
        roomCode: id,
        userId: user._id,
        itemId: option._id,
        direction: decision === 'like' ? 'right' : 'left',
        completed: isLastOption,
      });
    }

    // REST kaydı arka planda sürerken kartı kısa bir çıkış animasyonundan
    // sonra ilerlet. Önceden ağ yanıtı + 300ms bekleniyor, bu da Render'da
    // swipe'ın gözle görülür biçimde ağırlaşmasına yol açıyordu.
    let hasAdvanced = false;
    const advanceCard = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      setCurrentIndex((prev) => prev + 1);
      if (isLastOption) {
        setCurrentRoom((previous) => previous ? {
          ...previous,
          participantStatuses: (previous.participantStatuses || []).map((participant) =>
            String(participant.user?._id || participant.user) === String(user._id)
              ? { ...participant, status: 'finished' }
              : participant
          ),
        } : previous);
      }
      setDirection(0);
    };
    const advanceTimer = window.setTimeout(advanceCard, 160);

    try {
      // DB kaydı ve server-side eşleşme kontrolü güvenlik için aynen devam
      // eder; yalnızca kullanıcı arayüzü bunun cevabını beklemez.
      const saved = await swipe(id, option._id, decision);
      if (!saved) {
        window.clearTimeout(advanceTimer);
        setDirection(0);
        const refreshedRoom = await fetchRoomStatus(id);
        setCurrentIndex(refreshedRoom?.userSwipes?.length ?? currentIndex);
      } else {
        // Sunucu çok hızlı yanıt verirse bile kartın sıradaki halini bekletme.
        advanceCard();
      }
    } finally {
      window.clearTimeout(advanceTimer);
      decisionInFlightRef.current = false;
    }
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
    // Karar zaten tamamlandı; ikinci bir çıkış onayı kullanıcıyı gereksiz
    // durduruyordu. Sonucu kaydedilmiş odada güvenle Keşfet'e dönüyoruz.
    setMatchModalDismissed(true);
    resetRoom();
    navigate('/dashboard');
  };

  const requestRoomExit = () => setExitDialogOpen(true);
  const confirmRoomExit = async () => {
    setExitDialogOpen(false);
    const result = await leaveRoom(id);
    if (result.success) navigate('/dashboard');
  };
  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '85vh',
        paddingTop: '1.2rem',
        paddingBottom: '2rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.65rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, textTransform: 'capitalize', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentRoom.name}</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            type="button"
            onClick={copyLink}
            className="btn"
            aria-label="Oda bağlantısını kopyala"
            style={{ background: 'var(--surface)', color: 'white', padding: '0.5rem .7rem' }}
          >
            {copied ? <Check size={18} color="var(--success)" /> : <LinkIcon size={18} />}
          </button>
          <button
            type="button"
            onClick={requestRoomExit}
            className="btn"
            style={{ flexShrink: 0, background: 'rgba(255,75,75,.12)', color: '#ff8b8b', border: '1px solid rgba(255,75,75,.72)', padding: '0.58rem .82rem', gap: '.4rem', fontSize: '.82rem', fontWeight: 800, boxShadow: '0 4px 14px rgba(255,75,75,.16)' }}
          >
            <LogOut size={17} /> Odadan Çık
          </button>
        </div>
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
                  Grup uyumu: %{currentRoom.compatibilityPercentage || 0}
                </h3>
                {currentRoom.timeLimit > 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem', fontWeight: 'bold' }}>
                    Süre sınırı dolduğu için oylama kapandı.
                  </p>
                )}
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Tam eşleşme sağlayamadık ama grubun en çok beğendiği ortak seçenekler aşağıda:
                </p>
                {currentRoom.topOptions && currentRoom.topOptions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    {currentRoom.topOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {opt.imageUrl && <img src={opt.imageUrl} alt={opt.name} loading="eager" fetchPriority="high" decoding="sync" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />}
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>{opt.name}</h4>
                          <small style={{ color: 'var(--success)' }}>{opt.likeCount} Beğeni</small>
                          {opt.location && (
                            <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Map size={12} /> {opt.location}</div>
                          )}
                        </div>
                        {opt.location && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opt.name + ' ' + opt.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '0.4rem 0.7rem', background: 'rgba(66,133,244,0.2)', color: '#93c5fd', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            <Map size={13} /> Harita
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
                  onClick={requestRoomExit}
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
            <motion.div
              key={`swipe-card-${currentIndex}`}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              dragSnapToOrigin
              whileDrag={{ scale: 0.985 }}
              onDragEnd={(_, info) => {
                // Telefonlarda parmakla, webde de istenirse fareyle: sola geç, sağa beğen.
                // Dikey sayfa kaydırması için yalnızca belirgin yatay hareketi karar sayıyoruz.
                if (Math.abs(info.offset.x) < 110 || decisionInFlightRef.current) return;
                handleSwipe(info.offset.x > 0 ? 'like' : 'dislike');
              }}
              style={{
                position: 'absolute', width: '100%', height: '100%',
                cursor: 'grab', touchAction: 'pan-y',
              }}
              whileTap={{ cursor: 'grabbing' }}
            >
              <OptionCard
                currentIndex={currentIndex}
                direction={direction}
                option={currentRoom.options[currentIndex]}
                category={currentRoom.category}
              />
            </motion.div>
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
                    <><Avatar src={p.user.profilePic} username={p.user.username} size={28} /><CheckCircle2 size={15} color="var(--success)" /> {p.user.username} (Oylamayı bitirdi)</>
                  ) : (
                    <><Avatar src={p.user.profilePic} username={p.user.username} size={28} /><Circle size={12} fill="#fbbf24" color="#fbbf24" /> {p.user.username} (Seçim yapıyor…)</>
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
          onComplete={() => {
            resetRoom();
            navigate('/dashboard');
          }}
          onExit={requestRoomExit}
        />
      )}

      {/* Match Modal – REST veya Socket'tan gelen eşleşme */}
      <MatchModal
        isOpen={!!activeMatch && !matchModalDismissed}
        matchResult={activeMatch}
        onClose={closeMatchModal}
        title={isRestaurantRound ? 'RESTORAN BELİRLENDİ!' : isCinemaRound ? 'SİNEMA SALONU BELİRLENDİ!' : undefined}
        subtitle={isRestaurantRound ? 'Grubunuz nerede yiyeceğine karar verdi.' : isCinemaRound ? 'Grubunuz filmi nerede izleyeceğine karar verdi.' : undefined}
        closeLabel={isVenueMatch && restaurantRecommendationsEnabled ? 'Nerede Yiyelim’e Devam Et' : 'Oylamayı Bitir & Keşfete Dön'}
      />
      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        roomCode={id}
        roomId={id}
        matchedItem={chatMatchItem || matchResult || socketMatch}
      />
      <AnimatePresence>
        {exitDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(2,6,23,.72)', backdropFilter: 'blur(5px)' }}
            onMouseDown={() => setExitDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: .96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 12 }}
              onMouseDown={(event) => event.stopPropagation()}
              className="glass-card"
              style={{ width: '100%', maxWidth: 410, padding: '1.35rem', border: '1px solid rgba(248,113,113,.32)', background: 'rgba(30,41,59,.98)' }}
              role="dialog" aria-modal="true" aria-labelledby="leave-room-title"
            >
              <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(248,113,113,.12)', color: '#fca5a5', marginBottom: '.9rem' }}><AlertTriangle size={22} /></div>
              <h2 id="leave-room-title" style={{ fontSize: '1.2rem', margin: 0, color: 'white' }}>Odadan çıkmak istiyor musun?</h2>
              <p style={{ margin: '.55rem 0 1.15rem', color: 'var(--text-muted)', fontSize: '.88rem', lineHeight: 1.5 }}>Keşfet sayfasına döneceksin. Bu oda açık kaldığı sürece davet bağlantısıyla tekrar katılabilirsin; ancak mevcut seçim ekranın sıfırlanır.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                <button type="button" onClick={() => setExitDialogOpen(false)} className="btn" style={{ minHeight: 46, background: 'rgba(255,255,255,.06)', color: 'white', border: '1px solid rgba(255,255,255,.13)' }}>Kal</button>
                <button type="button" onClick={confirmRoomExit} className="btn" style={{ minHeight: 46, background: 'rgba(239,68,68,.14)', color: '#fecaca', border: '1px solid rgba(248,113,113,.42)' }}>Odadan çık</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Room;
