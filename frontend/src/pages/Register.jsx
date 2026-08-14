import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

// Google butonu sadece Client ID tanımlıysa gösterilir
const GOOGLE_ENABLED = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [errors, setErrors] = useState({ username: '', email: '', password: '' });
  const [touched, setTouched] = useState({ username: false, email: false, password: false });

  const { register, googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = location.state?.from;
  const from = fromLocation
    ? `${fromLocation.pathname || '/dashboard'}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '/dashboard';

  const validateUsername = (val) => {
    if (!val) return 'Kullanıcı adı boş bırakılamaz';
    if (!/^[a-zA-Z0-9._]{3,15}$/.test(val))
      return 'Kullanıcı adı 3-15 karakter, harf/rakam/nokta/alt çizgi içerebilir.';
    return '';
  };

  const validateEmail = (val) => {
    if (!val) return 'E-posta boş bırakılamaz';
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val))
      return 'Geçerli bir e-posta adresi girin.';
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Şifre boş bırakılamaz';
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(val))
      return 'En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam içermelidir.';
    return '';
  };

  const makeChangeHandler = (setter, validator, field) => (e) => {
    const val = e.target.value;
    setter(val);
    if (touched[field]) setErrors(prev => ({ ...prev, [field]: validator(val) }));
  };

  const makeBlurHandler = (getter, validator, field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validator(getter) }));
  };

  const isFormValid =
    username && email && password && termsAccepted &&
    !validateUsername(username) && !validateEmail(email) && !validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uErr = validateUsername(username);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    if (uErr || eErr || pErr) {
      setErrors({ username: uErr, email: eErr, password: pErr });
      setTouched({ username: true, email: true, password: true });
      toast.error('Lütfen formdaki hataları düzeltin.');
      return;
    }

    const result = await register(username, email, password, termsAccepted);
    if (result.success) navigate(from, { replace: true });
  };

  // Google ile hızlı kayıt / giriş
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        const result = await googleLogin(tokenResponse.access_token, userInfo, termsAccepted);
        if (result.success) {
          if (result.requiresUsernameSetup) {
            sessionStorage.setItem('bitematch_post_onboarding_path', from);
            navigate('/choose-username', { state: { from }, replace: true });
          } else {
            navigate(from, { replace: true });
          }
        }
      } catch {
        // hata AuthContext'te toast ile gösterilir
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setGoogleLoading(false),
  });

  const inputStyle = (field) =>
    touched[field] && errors[field]
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 5px rgba(220,53,69,0.3)' }
      : {};

  const ErrorMsg = ({ field }) =>
    touched[field] && errors[field] ? (
      <span style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.35rem', display: 'block' }}>
        ⚠️ {errors[field]}
      </span>
    ) : null;

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '80vh', padding: '2rem 0' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Kayıt Ol</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Hesap oluşturmak için formu doldurun
        </p>

        {/* Google ile Hızlı Kayıt – sadece Client ID varsa göster */}
        {GOOGLE_ENABLED && <button
          type="button"
          onClick={() => handleGoogleLogin()}
          disabled={googleLoading || !termsAccepted}
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
            cursor: googleLoading || !termsAccepted ? 'not-allowed' : 'pointer',
            opacity: googleLoading || !termsAccepted ? 0.7 : 1,
            transition: 'all 0.2s ease',
            marginBottom: '1.25rem',
          }}
          onMouseEnter={(e) => { if (!googleLoading && termsAccepted) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {googleLoading ? 'Devam ediliyor...' : 'Google ile Devam Et'}
        </button>}
        {GOOGLE_ENABLED && !termsAccepted && (
          <p style={{ margin: '-.7rem 0 1.15rem', color: 'var(--text-muted)', fontSize: '.76rem', textAlign: 'center', lineHeight: 1.45 }}>
            Google ile devam etmeden önce aşağıdaki sözleşme ve KVKK onayını ver.
          </p>
        )}

        {/* Ayırıcı – sadece Google butonu varsa göster */}
        {GOOGLE_ENABLED && <div style={{ position: 'relative', textAlign: 'center', margin: '0 0 1.5rem' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <span style={{
            position: 'absolute', top: '-10px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)', padding: '0 10px',
            color: 'var(--text-muted)', fontSize: '0.82rem',
          }}>veya e-posta ile</span>
        </div>}

        <form onSubmit={handleSubmit}>
          {/* Kullanıcı Adı */}
          <div className="input-group">
            <label>Kullanıcı Adı</label>
            <input type="text" className="input-field" value={username}
              onChange={makeChangeHandler(setUsername, validateUsername, 'username')}
              onBlur={makeBlurHandler(username, validateUsername, 'username')}
              placeholder="kullanici_adi" style={inputStyle('username')} required />
            <ErrorMsg field="username" />
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email</label>
            <input type="email" className="input-field" value={email}
              onChange={makeChangeHandler(setEmail, validateEmail, 'email')}
              onBlur={makeBlurHandler(email, validateEmail, 'email')}
              placeholder="ornek@domain.com" style={inputStyle('email')} required />
            <ErrorMsg field="email" />
          </div>

          {/* Şifre */}
          <div className="input-group">
            <label>Şifre</label>
            <input type="password" className="input-field" value={password}
              onChange={makeChangeHandler(setPassword, validatePassword, 'password')}
              onBlur={makeBlurHandler(password, validatePassword, 'password')}
              placeholder="••••••••" style={inputStyle('password')} required />
            <ErrorMsg field="password" />
          </div>

          {/* KVKK Bilgilendirmesi (Checkbox) */}
          <div style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.8rem', cursor: 'pointer' }} onClick={() => setTermsAccepted(!termsAccepted)}>
            <div style={{
              minWidth: '20px', height: '20px', borderRadius: '4px',
              border: `2px solid ${termsAccepted ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
              background: termsAccepted ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '0.1rem', transition: 'all 0.2s'
            }}>
              {termsAccepted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <Link to="/terms" onClick={e => e.stopPropagation()} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Kullanıcı Sözleşmesi ve KVKK Aydınlatma Metni</Link>'ni okudum ve kabul ediyorum.
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              opacity: isFormValid ? 1 : 0.55,
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
            }}
            disabled={!isFormValid}
          >
            ✅ Kayıt Ol
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          Zaten hesabın var mı?{' '}
          <Link to="/login" state={{ from: fromLocation }} style={{ color: 'var(--primary)', textDecoration: 'none' }}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
