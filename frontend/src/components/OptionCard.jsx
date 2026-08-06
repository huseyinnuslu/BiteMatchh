import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Tv, Calendar } from 'lucide-react';

// Tarih formatlayıcı — "23 Tem, Çrş 20:00" formatı
const formatEventDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', weekday: 'short',
  }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// Kalan süre hesabı — "3 gün sonra" / "Bugün!"
const timeUntilEvent = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diff < 0) return 'Geçti';
  if (days === 0 && hours === 0) return 'Az kaldı!';
  if (days === 0) return `${hours} saat sonra`;
  if (days === 1) return 'Yarın!';
  return `${days} gün sonra`;
};

const OptionCard = ({ option, direction, currentIndex, category }) => {
  if (!option) return null;

  const isCustom    = category === 'custom';
  const isFilm      = category === 'film' || category === 'movie';
  const isMekan     = category === 'mekan' || category === 'food';
  const isRestaurant = category === 'restaurant';
  const isAktivite  = category === 'aktivite' || category === 'activity';
  const isLive      = option.isLiveEvent === true;

  return (
    <motion.div
      key={currentIndex}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: direction !== 0 ? 0 : 1,
        x: direction !== 0 ? direction * 300 : 0,
        rotate: direction !== 0 ? direction * 20 : 0,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-card"
      style={{
        width: '100%',
        height: '480px',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        overflow: 'hidden',
        justifyContent: isCustom ? 'center' : 'flex-start',
        // Canlı etkinliklerde hafif kırmızı border glow
        boxShadow: isLive
          ? '0 0 0 2px rgba(239,68,68,0.6), 0 8px 32px rgba(0,0,0,0.3)'
          : '0 8px 32px 0 rgba(0,0,0,0.3)',
      }}
    >
      {/* ── Görsel Alan ────────────────────────────────────────────────── */}
      {!isCustom && (
        option.imageUrl ? (
          <div style={{
            height: '55%', width: '100%',
            backgroundImage: `url(${option.imageUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            position: 'relative',
          }}>
            {/* 🔴 CANLI ETKİNLİK rozeti */}
            {isLive && (
              <div style={{
                position: 'absolute', top: '10px', left: '10px',
                background: 'rgba(220,38,38,0.92)',
                backdropFilter: 'blur(4px)',
                color: 'white', padding: '0.3rem 0.7rem',
                borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(220,38,38,0.5)',
                letterSpacing: '0.03em',
              }}>
                {/* Yanıp sönen nokta */}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'white', display: 'inline-block',
                  animation: 'livePulse 1.2s ease-in-out infinite',
                }} />
                CANLI ETKİNLİK
              </div>
            )}

            {/* Kaynak rozeti (Biletix / Passo) */}
            {isLive && option.eventSource && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                color: '#94a3b8', padding: '0.25rem 0.6rem',
                borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
              }}>
                via {option.eventSource}
              </div>
            )}

            {/* Platform rozeti (Film kategorisi) */}
            {isFilm && !isLive && option.platform && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                background: option.platform.toLowerCase() === 'netflix' ? '#E50914' : '#00A8E1',
                color: 'white', padding: '0.3rem 0.6rem',
                borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <Tv size={14} /> {option.platform}
              </div>
            )}

            {isRestaurant && (
              option.imageSourceUrl ? (
                <a
                  href={option.imageSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    position: 'absolute', left: '10px', bottom: '10px',
                    background: 'rgba(2,6,23,.78)', color: 'white',
                    padding: '.28rem .55rem', borderRadius: '7px',
                    fontSize: '.68rem', fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  {option.imageAttribution || 'Görsel kaynağı'}
                </a>
              ) : (
                <div style={{
                  position: 'absolute', left: '10px', bottom: '10px',
                  background: 'rgba(2,6,23,.78)', color: '#e2e8f0',
                  padding: '.28rem .55rem', borderRadius: '7px',
                  fontSize: '.68rem', fontWeight: 700,
                }}>
                  Temsili görsel
                </div>
              )
            )}
          </div>
        ) : (
          <div style={{
            height: '55%', width: '100%',
            background: isLive
              ? 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(15,23,42,1))'
              : 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isRestaurant ? <MapPin size={52} color="var(--primary)" /> : <span style={{ fontSize: '4rem' }}>{isLive ? '🎫' : '❓'}</span>}
          </div>
        )
      )}

      {/* ── İçerik Alan ────────────────────────────────────────────────── */}
      <div style={{
        padding: '1.5rem', flex: isCustom ? 'none' : 1,
        display: 'flex', flexDirection: 'column',
        textAlign: isCustom ? 'center' : 'left',
      }}>
        {isCustom ? (
          <h1 style={{ fontSize: '2.5rem', color: 'white', margin: 0, wordBreak: 'break-word' }}>
            {option.name}
          </h1>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{
                margin: 0, fontSize: '1.4rem', color: 'white',
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {option.name}
              </h2>

              {(option.rating || option.imdbScore) && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.3rem 0.6rem', borderRadius: '12px',
                  flexShrink: 0, marginLeft: '0.5rem',
                }}>
                  <Star size={16} color="#fbbf24" fill="#fbbf24" style={{ marginRight: '4px' }} />
                  <span style={{ fontWeight: 'bold' }}>{option.imdbScore || option.rating}</span>
                </div>
              )}
            </div>

            {/* Canlı etkinlik: tarih + "X gün sonra" satırı */}
            {isLive && option.eventDate && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.6rem',
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.25)',
                borderRadius: '8px', padding: '0.4rem 0.7rem',
              }}>
                <Calendar size={14} color="#f87171" />
                <span style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600 }}>
                  {formatEventDate(option.eventDate)}
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.72rem',
                  background: 'rgba(220,38,38,0.2)', color: '#fca5a5',
                  padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700,
                }}>
                  {timeUntilEvent(option.eventDate)}
                </span>
              </div>
            )}

            {/* Bilgi satırı: süre / konum / bütçe */}
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '0.8rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {option.duration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={16} /> {option.duration}
                </div>
              )}
              {option.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={16} /> {option.location}
                </div>
              )}
              {isRestaurant && option.distanceFromYouKm !== null && option.distanceFromYouKm !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#86efac', fontWeight: 700 }}>
                  <MapPin size={16} /> Sana {option.distanceFromYouKm} km
                </div>
              )}
              {option.budget && (
                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {option.budget}
                </span>
              )}
            </div>

            {option.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginTop: 'auto' }}>
                {option.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Yanıp sönen animasyon için global keyframe (inline) */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </motion.div>
  );
};

export default OptionCard;
