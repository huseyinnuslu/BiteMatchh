import { useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useContext(AuthContext);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (pw) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pw);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor!');
      return;
    }

    if (!validatePassword(password)) {
      setError('Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir!');
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (result.success) {
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '60vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <h2 className="text-gradient">Yeni Şifre Belirle</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Güçlü bir şifre oluşturun.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Yeni Şifre</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam içermelidir.
            </small>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Şifre Tekrar</label>
            <input
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginTop: '0.75rem',
              color: '#f87171',
              fontSize: '0.85rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          {password && confirmPassword && password === confirmPassword && validatePassword(password) && (
            <div style={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem',
              marginTop: '0.5rem',
              color: '#4ade80',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}>
              ✅ Şifreler eşleşiyor
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            disabled={loading}
          >
            {loading ? '⏳ Güncelleniyor...' : '✅ Şifremi Güncelle'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
