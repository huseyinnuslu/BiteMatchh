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
        <span>Created by Hüseyin Uslu. All rights reserved. 2026</span>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
        BLG330 – Web Programlama Dönem Projesi
      </div>
    </footer>
  );
};

export default Footer;
