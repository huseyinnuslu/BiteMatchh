import { motion, AnimatePresence } from 'framer-motion';
import { Flame, MapPin, Share2, ExternalLink, Navigation } from 'lucide-react';
import Confetti from 'react-confetti';

// ── Yardımcı: URL oluşturucular ──────────────────────────────────────────────

const googleMapsUrl = (name, location) => {
  const q = encodeURIComponent(location ? `${name} ${location}` : name);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

const yandexMapsUrl = (name, location) => {
  const q = encodeURIComponent(location ? `${name} ${location}` : name);
  return `https://yandex.com.tr/maps/?text=${q}`;
};

// Web Share API — destekleyen tarayıcılarda native paylaşım, desteklememede fallback
const handleShare = async (name, location) => {
  const text = location
    ? `BiteMatch'te eşleştik! 🎉 "${name}" — ${location}`
    : `BiteMatch'te eşleştik! 🎉 "${name}"`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'BiteMatch Eşleşmesi!', text, url: window.location.href });
    } catch (e) { /* kullanıcı iptal etti */ }
  } else {
    // Fallback: metni kopyala
    navigator.clipboard.writeText(text);
    alert('Link panoya kopyalandı! 📋');
  }
};

// ── Buton bileşeni ───────────────────────────────────────────────────────────
const ActionBtn = ({ href, onClick, icon, label, color, bg }) => {
  const style = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    padding: '0.75rem 1rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.9rem', color, background: bg,
    textDecoration: 'none', flex: 1, minWidth: 0,
    transition: 'opacity 0.2s, transform 0.15s',
  };

  const handlers = {
    onMouseEnter: e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; },
    onMouseLeave: e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)'; },
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style} {...handlers}>
        {icon} {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={style} {...handlers}>
      {icon} {label}
    </button>
  );
};

// ── Ana Modal ─────────────────────────────────────────────────────────────────
const MatchModal = ({ isOpen, matchResult, onClose }) => {
  const name     = matchResult?.name     || '';
  const location = matchResult?.location || '';
  const isPlace  = !!(matchResult?.location || matchResult?.budget || matchResult?.rating);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(15px)',
              zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem',
              overflowY: 'auto',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="glass-card flex-center"
              style={{
                flexDirection: 'column', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                minWidth: '320px', maxWidth: '420px', width: '100%',
              }}
            >
              {/* Arka plan ışıması */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px', height: '200px',
                background: 'var(--primary)', filter: 'blur(100px)',
                opacity: 0.4, zIndex: -1,
              }} />

              {/* Başlık */}
              <h1 style={{
                fontSize: '2rem', marginBottom: '0.4rem', color: 'white',
                textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}>
                <Flame color="var(--primary)" /> EŞLEŞME! <Flame color="var(--primary)" />
              </h1>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Grubunuz ortak karara vardı 🎉
              </p>

              {/* Eşleşme kartı */}
              {matchResult && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
                  padding: '1.25rem', width: '100%', marginBottom: '1.5rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}>
                  {matchResult.imageUrl && (
                    <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                      <img src={matchResult.imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <h2 style={{ fontSize: '1.7rem', color: 'white', margin: '0 0 0.5rem 0' }}>{name}</h2>

                  {/* Lokasyon varsa göster */}
                  {location && (
                    <p style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                      color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 0.75rem 0',
                    }}>
                      <MapPin size={14} /> {location}
                    </p>
                  )}

                  {/* Badge'ler */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {matchResult.rating    && <span style={{ background: 'rgba(255,215,0,0.2)',  color: 'gold',            padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>⭐ {matchResult.rating}</span>}
                    {matchResult.budget    && <span style={{ background: 'rgba(34,197,94,0.2)', color: 'var(--success)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{matchResult.budget}</span>}
                    {matchResult.imdbScore && <span style={{ background: 'rgba(255,215,0,0.2)',  color: 'gold',            padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>IMDb: {matchResult.imdbScore}</span>}
                    {matchResult.duration  && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white',          padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>⏱ {matchResult.duration}</span>}
                  </div>
                </div>
              )}

              {/* ── Entegrasyon Butonları ─────────────────────────────────── */}
              {name && (
                <div style={{ width: '100%', marginBottom: '1.25rem' }}>

                  {/* Harita butonları — sadece mekan/yemek/aktivite kategorilerinde göster */}
                  {isPlace && (
                    <>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📍 Nerede?
                      </p>
                      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
                        <ActionBtn
                          href={googleMapsUrl(name, location)}
                          icon={<Navigation size={15} />}
                          label="Google Maps"
                          color="white"
                          bg="rgba(66,133,244,0.85)"
                        />
                        <ActionBtn
                          href={yandexMapsUrl(name, location)}
                          icon={<MapPin size={15} />}
                          label="Yandex Maps"
                          color="white"
                          bg="rgba(252,68,0,0.85)"
                        />
                      </div>
                    </>
                  )}

                  {/* Paylaş */}
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🔗 Paylaş
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <ActionBtn
                      onClick={() => handleShare(name, location)}
                      icon={<Share2 size={15} />}
                      label="Arkadaşlara Gönder"
                      color="white"
                      bg="rgba(99,102,241,0.85)"
                    />
                  </div>
                </div>
              )}

              {/* Kapat butonu */}
              <button
                onClick={onClose}
                className="btn btn-primary pulse-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
              >
                Oylamayı Bitir & Kapat
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MatchModal;
