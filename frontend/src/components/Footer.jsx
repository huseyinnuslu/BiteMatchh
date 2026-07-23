import { Link } from 'react-router-dom';

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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.8rem',
        fontSize: '0.9rem'
      }}>
        <span>Created by Hüseyin Uslu. All rights reserved. 2026</span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/terms" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem' }}>Kullanıcı Sözleşmesi ve KVKK</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
