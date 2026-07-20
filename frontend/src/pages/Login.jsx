import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';

// Google butonu sadece Client ID tanımlıysa gösterilir
const GOOGLE_ENABLED = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, guestLogin, googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // E-posta + Şifre ile giriş
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) navigate(from, { replace: true });
  };

  // Google ile giriş – access_token alıp Google userinfo endpoint'inden idToken benzeri bilgi çek
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        // access_token → Google UserInfo endpoint → kullanıcı bilgileri
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        // Backend'e email ve name gönder (idToken yerine access_token flow)
        const result = await googleLogin(tokenResponse.access_token, userInfo);
        if (result.success) navigate(from, { replace: true });
      } catch {
        // hata AuthContext'te toast ile gösterilir
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setGoogleLoading(false);
    },
  });

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '80vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}>Giriş Yap</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Şifre</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem' }}>
              Şifremi Unuttum?
            </Link>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Giriş Yap
          </button>
        </form>

        {/* Ayırıcı */}
        <div style={{ position: 'relative', textAlign: 'center', margin: '1.5rem 0' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <span style={{
            position: 'absolute', top: '-10px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)', padding: '0 10px',
            color: 'var(--text-muted)', fontSize: '0.82rem',
          }}>veya</span>
        </div>

        {/* Google ile Giriş Yap – sadece Client ID varsa göster */}
        {GOOGLE_ENABLED && <button
          type="button"
          onClick={() => handleGoogleLogin()}
          disabled={googleLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            padding: '0.8rem 1rem',
            background: '#ffffff',
            color: '#3c4043',
            border: '1px solid #dadce0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
            marginBottom: '0.75rem',
          }}
          onMouseEnter={(e) => { if (!googleLoading) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          {/* Resmi Google SVG logosu */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {googleLoading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
        </button>}

        {/* Misafir girişi */}
        <button
          type="button"
          onClick={async () => {
            const res = await guestLogin();
            if (res.success) navigate(from, { replace: true });
          }}
          className="btn btn-outline"
          style={{ width: '100%' }}
        >
          👤 Misafir Olarak Devam Et
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          Hesabın yok mu? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
