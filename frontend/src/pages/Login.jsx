import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, guestLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '60vh' }}>
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
          
          <div style={{ position: 'relative', textAlign: 'center', margin: '1.5rem 0' }}>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', color: 'var(--text-muted)' }}>veya</span>
          </div>

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
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          Hesabın yok mu? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
