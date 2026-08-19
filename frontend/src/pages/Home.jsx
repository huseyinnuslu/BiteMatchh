import { Link } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

const Home = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      minHeight: '80vh',
      padding: '0 1.5rem',
      boxSizing: 'border-box'
    }}>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 5.5rem)',
          fontWeight: 900,
          marginBottom: '1rem',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.18em' }}>
            Bana Fark Eder
            <Flame
              aria-label="BiteMatch"
              size="0.72em"
              strokeWidth={2.6}
              style={{ color: 'var(--primary)', filter: 'drop-shadow(0 4px 10px rgba(255, 75, 75, .3))', flexShrink: 0 }}
            />
          </span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          fontWeight: 700,
          marginBottom: '2rem',
          minHeight: '3.5rem',
          color: 'var(--accent)'
        }}
      >
        <TypeAnimation
          sequence={[
            '"Ne yiyelim?"', 1500,
            '"Nereye gidelim?"', 1500,
            '"Hangi filmi izleyelim?"', 1500,
          ]}
          wrapper="span"
          speed={50}
          repeat={Infinity}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          color: 'var(--text-muted)',
          maxWidth: '700px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.7,
          fontWeight: 400
        }}>
          Herkesin <strong style={{ color: '#fff' }}>'Fark etmez'</strong> dediği anlarda inisiyatif BiteMatch'te. Karmaşayı filtrele, oylamayı başlat. Herkes beğendiğini kaydırsın ve o nihai karar saniyeler içinde <strong style={{ color: 'var(--primary)' }}>EŞLEŞSİN!</strong>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <Link to="/register" className="btn btn-primary pulse-primary" style={{
          fontSize: '1.2rem',
          padding: '1.2rem 3rem',
          borderRadius: '50px',
          fontWeight: 600,
          boxShadow: '0 8px 25px rgba(255, 75, 75, 0.4)'
        }}>
          Hemen Başla
        </Link>
      </motion.div>

    </div>
  );
};

export default Home;
