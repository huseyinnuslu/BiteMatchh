import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{
      padding: '2rem 1rem',
      marginTop: 'auto',
      borderTop: '1px solid var(--border)',
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(10px)',
      textAlign: 'center',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem'
      }}>
        <span>BiteMatch &copy; {new Date().getFullYear()}</span>
        <span>•</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          Made with <Heart size={14} color="var(--primary)" style={{ fill: 'var(--primary)' }} /> by Hüseyin Uslu
        </span>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
        BLG330 – Web Programlama Dönem Projesi
      </div>
    </footer>
  );
};

export default Footer;
