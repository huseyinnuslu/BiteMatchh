import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState({ username: '', email: '', password: '' });
  const [touched, setTouched] = useState({ username: false, email: false, password: false });

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Validasyon Kuralları
  const validateUsername = (val) => {
    if (!val) return 'Kullanıcı adı alanı boş bırakılamaz';
    const regex = /^[a-zA-Z0-9._]{3,15}$/;
    if (!regex.test(val)) {
      return 'Kullanıcı adı 3-15 karakter arasında olmalı, sadece harf, rakam, alt çizgi (_) veya nokta (.) içerebilir.';
    }
    return '';
  };

  const validateEmail = (val) => {
    if (!val) return 'E-posta alanı boş bırakılamaz';
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(val)) {
      return 'Lütfen geçerli bir e-posta adresi girin (örn: ornek@domain.com)';
    }
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Şifre alanı boş bırakılamaz';
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(val)) {
      return 'Şifre en az 8 karakter olmalı, en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.';
    }
    return '';
  };

  // Input Değişiklikleri & Blur
  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    if (touched.username) {
      setErrors(prev => ({ ...prev, username: validateUsername(val) }));
    }
  };

  const handleUsernameBlur = () => {
    setTouched(prev => ({ ...prev, username: true }));
    setErrors(prev => ({ ...prev, username: validateUsername(username) }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(val) }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(val) }));
    }
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  };

  // Buton aktiflik kontrolü
  const isFormValid = 
    username && 
    email && 
    password && 
    !validateUsername(username) && 
    !validateEmail(email) && 
    !validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Her ihtimale karşı form geçerliliğini son kez kontrol et
    const uErr = validateUsername(username);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    if (uErr || eErr || pErr) {
      setErrors({ username: uErr, email: eErr, password: pErr });
      setTouched({ username: true, email: true, password: true });
      toast.error('Lütfen formdaki hataları düzeltin.');
      return;
    }

    const result = await register(username, email, password);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '60vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}>Kayıt Ol</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label>Kullanıcı Adı</label>
            <input 
              type="text" 
              className="input-field" 
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              placeholder="kullanici_adi"
              style={touched.username && errors.username ? { borderColor: 'var(--danger)', boxShadow: '0 0 5px rgba(220, 53, 69, 0.3)' } : {}}
              required 
            />
            {touched.username && errors.username && (
              <span className="error-message" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block', lineHeight: '1.2' }}>
                {errors.username}
              </span>
            )}
          </div>

          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="ornek@domain.com"
              style={touched.email && errors.email ? { borderColor: 'var(--danger)', boxShadow: '0 0 5px rgba(220, 53, 69, 0.3)' } : {}}
              required 
            />
            {touched.email && errors.email && (
              <span className="error-message" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block', lineHeight: '1.2' }}>
                {errors.email}
              </span>
            )}
          </div>

          <div className="input-group">
            <label>Şifre</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              placeholder="••••••••"
              style={touched.password && errors.password ? { borderColor: 'var(--danger)', boxShadow: '0 0 5px rgba(220, 53, 69, 0.3)' } : {}}
              required 
            />
            {touched.password && errors.password && (
              <span className="error-message" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block', lineHeight: '1.2' }}>
                {errors.password}
              </span>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              marginTop: '1.5rem',
              opacity: isFormValid ? 1 : 0.6,
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease'
            }}
            disabled={!isFormValid}
          >
            Kayıt Ol
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          Zaten hesabın var mı? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
