import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import Confetti from 'react-confetti';

const MatchModal = ({ isOpen, matchResult, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />
          <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(15px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <motion.div 
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="glass-card flex-center"
            style={{ flexDirection: 'column', textAlign: 'center', position: 'relative', overflow: 'hidden', minWidth: '350px', maxWidth: '90vw' }}
          >
            {/* Background glowing effect */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.5, zIndex: -1 }}></div>
            
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: 'white', textShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Flame color="var(--primary)" /> EŞLEŞME SAĞLANDI! <Flame color="var(--primary)" />
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Grubunuz ortak karara vardı!
            </p>

            {matchResult && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', width: '100%', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)' }}>
                {matchResult.imageUrl && (
                  <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <img src={matchResult.imageUrl} alt={matchResult.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <h2 style={{ fontSize: '2rem', color: 'white', margin: '0 0 0.5rem 0' }}>{matchResult.name}</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {matchResult.rating && <span style={{ background: 'rgba(255, 215, 0, 0.2)', color: 'gold', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>⭐ {matchResult.rating}</span>}
                  {matchResult.budget && <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>{matchResult.budget}</span>}
                  {matchResult.imdbScore && <span style={{ background: 'rgba(255, 215, 0, 0.2)', color: 'gold', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>IMDb: {matchResult.imdbScore}</span>}
                  {matchResult.duration && <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem' }}>⏱ {matchResult.duration}</span>}
                </div>
              </div>
            )}
            
            <button onClick={onClose} className="btn btn-primary pulse-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
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
