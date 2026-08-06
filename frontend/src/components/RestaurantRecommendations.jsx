import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Heart, LocateFixed, MapPin, Navigation, Route, ShieldCheck, Sparkles, Users, UtensilsCrossed, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { getSocket } from '../socket/socketClient';
import MatchModal from './MatchModal';

const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Tarayıcınız konum paylaşımını desteklemiyor.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: 12000,
    maximumAge: 5 * 60 * 1000,
  });
});

const panelStyle = {
  width: '100%',
  padding: '1.25rem',
  borderRadius: '18px',
  background: 'linear-gradient(145deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))',
  border: '1px solid rgba(99,102,241,0.38)',
  boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
};

const RestaurantRecommendations = ({ roomId, cuisine, participantCount, onStartRestaurantRound, onExit }) => {
  const [sharedCount, setSharedCount] = useState(0);
  const [hasSharedLocation, setHasSharedLocation] = useState(false);
  const [status, setStatus] = useState('intro');
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [likedVenueIds, setLikedVenueIds] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [decisionStatus, setDecisionStatus] = useState('pending');
  const [decisionResult, setDecisionResult] = useState(null);
  const [restaurantRoomId, setRestaurantRoomId] = useState(null);
  const loadingRecommendationsRef = useRef(false);
  const automaticRoundStartedRef = useRef(false);
  const hasQuickVotedRef = useRef(false);

  const applyDecisionState = useCallback((data) => {
    const nextDecisionStatus = data.decisionStatus || 'pending';
    setDecisionStatus(nextDecisionStatus);
    setCompletedCount(data.completedCount || 0);
    setDecisionResult(data.decisionResult || null);
    if (typeof data.hasVoted === 'boolean') hasQuickVotedRef.current = data.hasVoted;

    if (nextDecisionStatus === 'matched') {
      setStatus('matched');
    } else if (nextDecisionStatus === 'no_match') {
      setStatus('starting-round');
    } else if (hasQuickVotedRef.current) {
      setStatus('quick-waiting');
    } else {
      setStatus(data.recommendations?.length || recommendations.length ? 'ready' : 'empty');
    }
  }, [recommendations.length]);

  const startRestaurantRound = useCallback(async () => {
    if (restaurantRoomId) {
      onStartRestaurantRound(restaurantRoomId);
      return;
    }
    setStatus('creating-round');
    try {
      const { data } = await api.post(`/places/rooms/${roomId}/restaurant-room`, { sortBy: 'distance' });
      setRestaurantRoomId(data.room._id);
      onStartRestaurantRound(data.room._id);
    } catch (error) {
      automaticRoundStartedRef.current = false;
      setStatus('round-error');
      toast.error(error.response?.data?.message || 'Restoran oylaması başlatılamadı.');
    }
  }, [onStartRestaurantRound, restaurantRoomId, roomId]);

  const loadRecommendations = useCallback(async (silent = false) => {
    if (loadingRecommendationsRef.current) return;
    loadingRecommendationsRef.current = true;
    if (!silent) setStatus('loading');
    try {
      const { data } = await api.get(`/places/rooms/${roomId}/recommendations`);
      setRecommendations(data.recommendations || []);
      applyDecisionState(data);
    } catch (error) {
      if (error.response?.status === 409) {
        setSharedCount(error.response.data.sharedCount || 0);
        setStatus('waiting');
      } else if (!silent) {
        setStatus('error');
        toast.error(error.response?.data?.message || 'Restoran önerileri alınamadı.');
      }
    } finally {
      loadingRecommendationsRef.current = false;
    }
  }, [applyDecisionState, roomId]);

  useEffect(() => {
    const socket = getSocket();
    const onLocationUpdated = (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      setSharedCount(payload.sharedCount || 0);
      if (hasSharedLocation && payload.ready) loadRecommendations();
    };
    const onQuickVoteUpdated = (payload) => {
      if (String(payload.parentRoomId) !== String(roomId)) return;
      applyDecisionState(payload);
    };
    const onRestaurantRoundReady = (payload) => {
      if (String(payload.parentRoomId) !== String(roomId)) return;
      setRestaurantRoomId(payload.roomId);
    };

    socket?.on('recommendation_location_updated', onLocationUpdated);
    socket?.on('restaurant_quick_vote_updated', onQuickVoteUpdated);
    socket?.on('restaurant_round_ready', onRestaurantRoundReady);
    return () => {
      socket?.off('recommendation_location_updated', onLocationUpdated);
      socket?.off('restaurant_quick_vote_updated', onQuickVoteUpdated);
      socket?.off('restaurant_round_ready', onRestaurantRoundReady);
    };
  }, [applyDecisionState, hasSharedLocation, loadRecommendations, roomId]);

  useEffect(() => {
    if (!hasSharedLocation || !['waiting', 'quick-waiting'].includes(status)) return undefined;
    const timer = window.setInterval(() => loadRecommendations(true), 2500);
    return () => window.clearInterval(timer);
  }, [hasSharedLocation, loadRecommendations, status]);

  useEffect(() => {
    if (decisionStatus !== 'no_match' || automaticRoundStartedRef.current) return;
    automaticRoundStartedRef.current = true;
    startRestaurantRound();
  }, [decisionStatus, startRestaurantRound]);

  const shareLocation = async () => {
    setStatus('locating');
    try {
      const position = await getCurrentPosition();
      const { data } = await api.post(`/places/rooms/${roomId}/location`, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setHasSharedLocation(true);
      setSharedCount(data.sharedCount || 0);
      if (data.ready) await loadRecommendations();
      else setStatus('waiting');
    } catch (error) {
      setStatus('intro');
      const message = error.code === 1
        ? 'Konum izni verilmedi. Önerileri hazırlamak için konum izni gerekli.'
        : error.response?.data?.message || error.message || 'Konum alınamadı.';
      toast.error(message);
    }
  };

  const submitQuickVote = async (venueIds) => {
    setStatus('submitting-vote');
    try {
      const { data } = await api.post(`/places/rooms/${roomId}/quick-vote`, { likedVenueIds: venueIds });
      applyDecisionState({ ...data, hasVoted: true });
    } catch (error) {
      setStatus('ready');
      toast.error(error.response?.data?.message || 'Gizli tercihlerin kaydedilemedi.');
    }
  };

  const decideCurrentRecommendation = (liked) => {
    const currentVenue = recommendations[recommendationIndex];
    if (!currentVenue) return;
    const nextLikedVenueIds = liked
      ? [...new Set([...likedVenueIds, currentVenue.id])]
      : likedVenueIds;
    setLikedVenueIds(nextLikedVenueIds);

    if (recommendationIndex < recommendations.length - 1) {
      setRecommendationIndex((index) => index + 1);
    } else {
      submitQuickVote(nextLikedVenueIds);
    }
  };

  const isBusy = ['locating', 'loading', 'submitting-vote', 'creating-round', 'starting-round'].includes(status);
  const currentPlace = recommendations[recommendationIndex];

  return (
    <>
      <section style={{ ...panelStyle, marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.2)', color: '#c4b5fd' }}>
            <UtensilsCrossed size={21} />
          </div>
          <div>
            <div style={{ color: '#c4b5fd', fontSize: '.78rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Şimdi nerede yiyelim?</div>
            <h2 style={{ margin: '.2rem 0 0', color: 'white', fontSize: '1.35rem' }}>{cuisine} için ortak noktayı bulalım</h2>
          </div>
        </div>

        {status === 'intro' && (
          <>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, fontSize: '.92rem', margin: '0 0 1rem' }}>
              Herkes konumunu paylaşınca gruba adil uzaklıktaki üç gerçek restoranı gizlice değerlendirecek.
            </p>
            <button onClick={shareLocation} className="btn btn-primary" style={{ width: '100%', minHeight: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.55rem' }}>
              <LocateFixed size={18} /> Konumumu Paylaş ve Başla
            </button>
          </>
        )}

        {(['locating', 'loading', 'submitting-vote'].includes(status)) && (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>
            <Sparkles size={24} color="var(--primary)" style={{ marginBottom: '.5rem' }} />
            <div>{status === 'locating' ? 'Konumun alınıyor…' : status === 'submitting-vote' ? 'Gizli tercihlerin kaydediliyor…' : 'Gerçek restoranlar hazırlanıyor…'}</div>
          </div>
        )}

        {status === 'waiting' && (
          <div style={{ padding: '1rem', borderRadius: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', color: '#fcd34d', fontWeight: 800 }}><Users size={18} /> Arkadaşın bekleniyor</div>
            <p style={{ margin: '.55rem 0 0', color: 'var(--text-muted)', fontSize: '.87rem', lineHeight: 1.45 }}>
              Konum paylaşıldı ({sharedCount}/{participantCount}). Diğer kişi de izin verince gizli seçim otomatik açılacak.
            </p>
          </div>
        )}

        {status === 'ready' && currentPlace && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.65rem', color: 'var(--text-muted)', fontSize: '.75rem' }}>
              <span>Öneri {recommendationIndex + 1}/{recommendations.length}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><ShieldCheck size={14} color="#86efac" /> Tercihin gizli</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,.08)', marginBottom: '.85rem' }}>
              <div style={{ width: `${((recommendationIndex + 1) / recommendations.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#a855f7)', transition: 'width .25s ease' }} />
            </div>
            <article style={{ padding: '.9rem', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {currentPlace.imageUrl && (
                <div style={{ height: 190, margin: '-.25rem -.25rem .85rem', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                  <img src={currentPlace.imageUrl} alt={currentPlace.imageIsRepresentative ? `${cuisine} temsili görseli` : currentPlace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {currentPlace.imageSourceUrl ? (
                    <a href={currentPlace.imageSourceUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', left: 8, bottom: 8, padding: '.22rem .45rem', borderRadius: 6, background: 'rgba(2,6,23,.8)', color: 'white', fontSize: '.65rem', textDecoration: 'none', fontWeight: 700 }}>{currentPlace.imageAttribution || 'Görsel kaynağı'}</a>
                  ) : (
                    <span style={{ position: 'absolute', left: 8, bottom: 8, padding: '.22rem .45rem', borderRadius: 6, background: 'rgba(2,6,23,.8)', color: '#e2e8f0', fontSize: '.65rem', fontWeight: 700 }}>Temsili görsel</span>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '.65rem', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 .35rem', color: 'white', fontSize: '1.15rem' }}>{currentPlace.name}</h3>
                  {currentPlace.address && <div style={{ display: 'flex', gap: '.3rem', color: 'var(--text-muted)', fontSize: '.8rem', lineHeight: 1.4 }}><MapPin size={14} style={{ flexShrink: 0 }} />{currentPlace.address}</div>}
                </div>
                <a href={currentPlace.mapsUrl} target="_blank" rel="noreferrer" title="Haritada aç" style={{ alignSelf: 'center', color: '#93c5fd', padding: '.5rem' }}><Navigation size={20} /></a>
              </div>
              <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
                {currentPlace.distanceFromYouKm !== null && <span style={{ fontSize: '.75rem', color: '#bbf7d0', background: 'rgba(34,197,94,.12)', padding: '.25rem .5rem', borderRadius: 99 }}><Route size={12} style={{ verticalAlign: 'middle' }} /> Sana {currentPlace.distanceFromYouKm} km</span>}
                <span style={{ fontSize: '.75rem', color: '#c4b5fd', background: 'rgba(99,102,241,.14)', padding: '.25rem .5rem', borderRadius: 99 }}>Grubun en uzağı {currentPlace.maxGroupDistanceKm} km</span>
              </div>
            </article>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem', marginTop: '.85rem' }}>
              <button onClick={() => decideCurrentRecommendation(false)} className="btn" style={{ minHeight: 48, border: '1px solid rgba(248,113,113,.35)', color: '#fca5a5', background: 'rgba(239,68,68,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}><X size={18} /> Geç</button>
              <button onClick={() => decideCurrentRecommendation(true)} className="btn btn-primary" style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}><Heart size={18} /> Bunu Seçerim</button>
            </div>
            <p style={{ margin: '.7rem 0 0', color: 'var(--text-muted)', fontSize: '.7rem', textAlign: 'center' }}>Diğer katılımcılar hangi seçeneği işaretlediğini göremez.</p>
          </>
        )}

        {status === 'quick-waiting' && (
          <div style={{ padding: '1.15rem', borderRadius: 15, background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.22)', textAlign: 'center' }}>
            <CheckCircle2 size={30} color="#86efac" style={{ marginBottom: '.55rem' }} />
            <div style={{ color: 'white', fontWeight: 800 }}>Gizli tercihin kaydedildi</div>
            <p style={{ margin: '.45rem 0 0', color: 'var(--text-muted)', fontSize: '.84rem', lineHeight: 1.45 }}>{completedCount}/{participantCount} kişi tamamladı. Ortak karar bulununca sonuç otomatik açılacak.</p>
          </div>
        )}

        {(['starting-round', 'creating-round'].includes(status)) && (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}><Sparkles size={24} color="var(--primary)" style={{ marginBottom: '.5rem' }} /><div>Hızlı önerilerde ortak seçim çıkmadı. Restoran kartları hazırlanıyor…</div></div>
        )}

        {status === 'round-error' && (
          <button disabled={isBusy} onClick={startRestaurantRound} className="btn btn-primary" style={{ width: '100%', minHeight: 46 }}>Restoran Kartlarını Tekrar Hazırla</button>
        )}

        {status === 'empty' && <div style={{ padding: '1rem', borderRadius: 14, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '.9rem' }}>Yakın çevrede yeterli gerçek restoran bulunamadı.</div>}
        {status === 'error' && <button onClick={() => loadRecommendations()} className="btn" style={{ width: '100%', border: '1px solid rgba(255,255,255,.2)', color: 'white' }}>Tekrar Dene</button>}

        <button onClick={onExit} className="btn" style={{ width: '100%', marginTop: '1rem', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,.12)', background: 'transparent' }}>
          Bu adımı geç ve Keşfete dön
        </button>
      </section>

      <MatchModal
        isOpen={status === 'matched' && !!decisionResult}
        matchResult={decisionResult}
        title="RESTORAN BELİRLENDİ!"
        subtitle="Gizli tercihleriniz ortak bir kararda buluştu."
        closeLabel="Kararı Tamamla & Keşfete Dön"
        onClose={onExit}
        onExitRoom={onExit}
      />
    </>
  );
};

export default RestaurantRecommendations;
