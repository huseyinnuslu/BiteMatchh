import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) {
      setSent(true);
    }
  };

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '60vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
          <h2 className="text-gradient">Şifremi Unuttum</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
          </p>
        </div>

        {sent ? (
          <div style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✉️</div>
            <h3 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Email Gönderildi!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <strong style={{ color: 'var(--text)' }}>{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
              Gelen kutunuzu ve spam klasörünüzü kontrol edin.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              Bağlantı 15 dakika süreyle geçerlidir.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>E-posta Adresi</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? '⏳ Gönderiliyor...' : '📧 Sıfırlama Linki Gönder'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
