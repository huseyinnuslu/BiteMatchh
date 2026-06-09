import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const SECURITY_QUESTIONS = [
  'İlk evcil hayvanınızın adı neydi?',
  'Annenizin kızlık soyadı nedir?',
  'İlk okulunuzun adı neydi?',
  'Çocukluğunuzdaki en iyi arkadaşınızın adı neydi?',
  'En sevdiğiniz filmin adı nedir?',
  'Doğduğunuz şehrin adı nedir?',
  'İlk arabanızın markası neydi?',
  'En sevdiğiniz öğretmeninizin soyadı neydi?',
];

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const [errors, setErrors] = useState({ username: '', email: '', password: '', securityAnswer: '' });
  const [touched, setTouched] = useState({ username: false, email: false, password: false, securityAnswer: false });

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

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

  const validateSecurityAnswer = (val) => {
    if (!val) return 'Güvenlik cevabı boş bırakılamaz';
    if (val.trim().length < 2) return 'Cevap en az 2 karakter olmalıdır';
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
    username && email && password && securityQuestion && securityAnswer &&
    !validateUsername(username) && !validateEmail(email) &&
    !validatePassword(password) && !validateSecurityAnswer(securityAnswer);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uErr = validateUsername(username);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const sErr = validateSecurityAnswer(securityAnswer);

    if (!securityQuestion) { toast.error('Lütfen bir güvenlik sorusu seçin.'); return; }
    if (uErr || eErr || pErr || sErr) {
      setErrors({ username: uErr, email: eErr, password: pErr, securityAnswer: sErr });
      setTouched({ username: true, email: true, password: true, securityAnswer: true });
      toast.error('Lütfen formdaki hataları düzeltin.');
      return;
    }

    const result = await register(username, email, password, securityQuestion, securityAnswer);
    if (result.success) navigate(from, { replace: true });
  };

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
    <div className="flex-center animate-slide-up" style={{ minHeight: '70vh', padding: '2rem 0' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Kayıt Ol</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Hesap oluşturmak için formu doldurun
        </p>

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

          {/* Güvenlik Sorusu Bölüm Başlığı */}
          <div style={{ margin: '1.5rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
              🔐 Güvenlik Sorusu
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Şifrenizi unutursanız kimliğinizi doğrulamak için kullanılır.
          </p>

          {/* Güvenlik Sorusu Select */}
          <div className="input-group">
            <label>Güvenlik Sorusu</label>
            <select
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: securityQuestion ? 'var(--text)' : 'var(--text-muted)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" disabled style={{ background: '#1a1a2e' }}>— Bir soru seçin —</option>
              {SECURITY_QUESTIONS.map((q, i) => (
                <option key={i} value={q} style={{ background: '#1a1a2e' }}>{q}</option>
              ))}
            </select>
          </div>

          {/* Güvenlik Cevabı */}
          <div className="input-group">
            <label>Güvenlik Cevabı</label>
            <input type="text" className="input-field" value={securityAnswer}
              onChange={makeChangeHandler(setSecurityAnswer, validateSecurityAnswer, 'securityAnswer')}
              onBlur={makeBlurHandler(securityAnswer, validateSecurityAnswer, 'securityAnswer')}
              placeholder="Cevabınızı girin (büyük/küçük harf önemsiz)"
              style={inputStyle('securityAnswer')} required />
            <ErrorMsg field="securityAnswer" />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '1.5rem',
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
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
