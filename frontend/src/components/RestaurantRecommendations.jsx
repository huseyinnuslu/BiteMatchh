import { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Navigation, Route, Sparkles, Users, UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { getSocket } from '../socket/socketClient';

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
  const [showRestaurantMatch, setShowRestaurantMatch] = useState(false);
  const [restaurantRoomId, setRestaurantRoomId] = useState(null);
  const loadingRecommendationsRef = useRef(false);

  const loadRecommendations = useCallback(async () => {
    if (loadingRecommendationsRef.current) return;
    loadingRecommendationsRef.current = true;
    setStatus('loading');
    try {
      const { data } = await api.get(`/places/rooms/${roomId}/recommendations`);
      setRecommendations(data.recommendations || []);
      setStatus(data.recommendations?.length ? 'ready' : 'empty');
    } catch (error) {
      if (error.response?.status === 409) {
        setSharedCount(error.response.data.sharedCount || 0);
        setStatus('waiting');
      } else {
        setStatus('error');
        toast.error(error.response?.data?.message || 'Restoran önerileri alınamadı.');
      }
    } finally {
      loadingRecommendationsRef.current = false;
    }
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();
    const onLocationUpdated = (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      setSharedCount(payload.sharedCount || 0);
      if (hasSharedLocation && payload.ready) loadRecommendations();
    };
    const onRestaurantRoundReady = (payload) => {
      if (String(payload.parentRoomId) !== String(roomId)) return;
      setRestaurantRoomId(payload.roomId);
      setShowRestaurantMatch(true);
      toast.info('Arkadaşın restoran oylamasını hazırladı. Katılabilirsin.');
    };
    socket?.on('recommendation_location_updated', onLocationUpdated);
    socket?.on('restaurant_round_ready', onRestaurantRoundReady);
    return () => {
      socket?.off('recommendation_location_updated', onLocationUpdated);
      socket?.off('restaurant_round_ready', onRestaurantRoundReady);
    };
  }, [hasSharedLocation, loadRecommendations, roomId]);

  useEffect(() => {
    if (!hasSharedLocation || status !== 'waiting') return undefined;
    const timer = window.setInterval(() => loadRecommendations(), 2500);
    return () => window.clearInterval(timer);
  }, [hasSharedLocation, loadRecommendations, status]);

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
      if (data.ready) {
        await loadRecommendations();
      } else {
        setStatus('waiting');
      }
    } catch (error) {
      setStatus('intro');
      const message = error.code === 1
        ? 'Konum izni verilmedi. Önerileri hazırlamak için konum izni gerekli.'
        : error.response?.data?.message || error.message || 'Konum alınamadı.';
      toast.error(message);
    }
  };

  const startRestaurantRound = async () => {
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
      setStatus('ready');
      toast.error(error.response?.data?.message || 'Restoran oylaması başlatılamadı.');
    }
  };

  const isBusy = ['locating', 'loading', 'creating-round'].includes(status);

  return (
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
            Herkes konumunu paylaşınca gruba adil uzaklıktaki üç gerçek restoranı önereceğiz.
          </p>
          <button onClick={shareLocation} className="btn btn-primary" style={{ width: '100%', minHeight: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.55rem' }}>
            <LocateFixed size={18} /> Konumumu Paylaş ve Önerileri Gör
          </button>
        </>
      )}

      {(status === 'locating' || status === 'loading') && (
        <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>
          <Sparkles size={24} color="var(--primary)" style={{ marginBottom: '.5rem' }} />
          <div>{status === 'locating' ? 'Konumun alınıyor…' : 'Gerçek restoranlar hazırlanıyor…'}</div>
        </div>
      )}

      {status === 'waiting' && (
        <div style={{ padding: '1rem', borderRadius: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', color: '#fcd34d', fontWeight: 800 }}><Users size={18} /> Arkadaşın bekleniyor</div>
          <p style={{ margin: '.55rem 0 0', color: 'var(--text-muted)', fontSize: '.87rem', lineHeight: 1.45 }}>
            Konum paylaşıldı ({sharedCount}/{participantCount}). Diğer kişi de izin verince öneriler otomatik açılacak.
          </p>
        </div>
      )}

      {status === 'empty' && (
        <div style={{ padding: '1rem', borderRadius: 14, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '.9rem', lineHeight: 1.5 }}>
          Yakın çevrede yeterli restoran bulunamadı. Biraz sonra tekrar denemeyi deneyebilirsiniz.
        </div>
      )}

      {status === 'error' && (
        <button onClick={loadRecommendations} className="btn" style={{ width: '100%', border: '1px solid rgba(255,255,255,.2)', color: 'white' }}>
          Tekrar Dene
        </button>
      )}

      {status === 'ready' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
            {recommendations.map((place, index) => (
              <article key={place.id} style={{ padding: '.9rem', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '.65rem', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#a5b4fc', fontSize: '.72rem', fontWeight: 800 }}>ÖNERİ {index + 1}</div>
                    <h3 style={{ margin: '.15rem 0 .3rem', color: 'white', fontSize: '1rem' }}>{place.name}</h3>
                    {place.address && <div style={{ display: 'flex', gap: '.25rem', color: 'var(--text-muted)', fontSize: '.78rem', lineHeight: 1.35 }}><MapPin size={14} style={{ flexShrink: 0 }} />{place.address}</div>}
                  </div>
                  <a href={place.mapsUrl} target="_blank" rel="noreferrer" title="Haritada aç" style={{ alignSelf: 'center', color: '#93c5fd', padding: '.5rem' }}><Navigation size={19} /></a>
                </div>
                <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', marginTop: '.7rem' }}>
                  {place.distanceFromYouKm !== null && <span style={{ fontSize: '.75rem', color: '#bbf7d0', background: 'rgba(34,197,94,.12)', padding: '.24rem .5rem', borderRadius: 99 }}><Route size={12} style={{ verticalAlign: 'middle' }} /> Sana {place.distanceFromYouKm} km</span>}
                  <span style={{ fontSize: '.75rem', color: '#c4b5fd', background: 'rgba(99,102,241,.14)', padding: '.24rem .5rem', borderRadius: 99 }}>Grubun en uzağı {place.maxGroupDistanceKm} km</span>
                </div>
              </article>
            ))}
          </div>
          <p style={{ margin: '.85rem 0 0', color: 'var(--text-muted)', fontSize: '.72rem', textAlign: 'center' }}>Gerçek mekan verisi: OpenStreetMap katkıcıları</p>
          <button onClick={() => setShowRestaurantMatch((value) => !value)} className="btn" style={{ width: '100%', marginTop: '1rem', border: '1px solid rgba(167,139,250,.55)', color: '#ddd6fe', background: 'rgba(99,102,241,.12)' }}>
            Beğenmedik, Restoranları Birlikte Seçelim
          </button>
        </>
      )}

      {showRestaurantMatch && (
        <div style={{ marginTop: '.85rem', padding: '.9rem', borderRadius: 14, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(2,6,23,.35)' }}>
          <div style={{ color: 'white', fontWeight: 800, marginBottom: '.35rem' }}>Restoran oylaması</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.83rem', lineHeight: 1.45, margin: '0 0 .8rem' }}>Gerçek mekan kartlarını tekrar kaydırarak ortak restoranı seçin.</p>
          <button disabled={isBusy} onClick={startRestaurantRound} className="btn btn-primary" style={{ width: '100%', minHeight: 44, opacity: isBusy ? .7 : 1 }}>
            {status === 'creating-round' ? 'Oylama hazırlanıyor…' : restaurantRoomId ? 'Restoran Oylamasına Katıl' : 'Gruba En Yakın Restoranlarla Başla'}
          </button>
          <div style={{ color: 'var(--text-muted)', fontSize: '.73rem', marginTop: '.65rem', textAlign: 'center' }}>Yüksek puan filtresi, ücretsiz veri kaynağında doğrulanmış puan bulunmadığı için beta aşamasında kapalıdır.</div>
        </div>
      )}

      <button onClick={onExit} className="btn" style={{ width: '100%', marginTop: '1rem', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,.12)', background: 'transparent' }}>
        Bu adımı geç ve Keşfete dön
      </button>
    </section>
  );
};

export default RestaurantRecommendations;
