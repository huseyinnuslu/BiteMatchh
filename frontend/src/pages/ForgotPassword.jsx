import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// 3 adımlı akış:
// Step 1 → Email gir
// Step 2 → Güvenlik sorusu göster, cevap gir
// Step 3 → Yeni şifre belirle

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { getSecurityQuestion, resetPasswordWithAnswer } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

  // --- ADIM 1: Email ile güvenlik sorusunu getir ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await getSecurityQuestion(email);
    setLoading(false);
    if (result.success) {
      setSecurityQuestion(result.securityQuestion);
      setStep(2);
    }
  };

  // --- ADIM 2: Güvenlik cevabını doğrula ve adım 3'e geç ---
  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!securityAnswer.trim()) return;
    // Cevabın doğruluğunu backend'e göndermeden önce kontrol etmiyoruz
    // (Gerçek doğrulama adım 3'te şifre ile birlikte yapılır)
    setStep(3);
  };

  // --- ADIM 3: Yeni şifreyi kaydet ---
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor!');
      return;
    }
    if (!validatePassword(newPassword)) {
      setPasswordError('Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir!');
      return;
    }

    setLoading(true);
    const result = await resetPasswordWithAnswer(email, securityAnswer, newPassword);
    setLoading(false);

    if (result.success) {
      setTimeout(() => navigate('/login'), 2000);
    } else {
      // Cevap yanlışsa step 2'ye geri dön
      setStep(2);
      setSecurityAnswer('');
    }
  };

  // --- ADIM GÖSTERGELERI ---
  const StepIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
      {[1, 2, 3].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700,
            background: s < step ? 'var(--primary)' : s === step ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.07)',
            border: s <= step ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
            color: s <= step ? (s < step ? '#fff' : 'var(--primary)') : 'var(--text-muted)',
            transition: 'all 0.3s ease',
          }}>
            {s < step ? '✓' : s}
          </div>
          {s < 3 && (
            <div style={{
              width: '40px', height: '2px',
              background: s < step ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );

  const stepLabels = ['E-posta', 'Güvenlik Sorusu', 'Yeni Şifre'];

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '60vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px' }}>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {step === 1 ? '🔑' : step === 2 ? '🛡️' : '🔒'}
          </div>
          <h2 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Şifremi Unuttum</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Adım {step}/3 — {stepLabels[step - 1]}
          </p>
        </div>

        <StepIndicator />

        {/* ======== ADIM 1: Email ======== */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Hesabınıza kayıtlı <strong style={{ color: 'var(--text)' }}>e-posta adresinizi</strong> girin.
              Size ait güvenlik sorusunu göstereceğiz.
            </p>
            <div className="input-group">
              <label>E-posta Adresi</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.25rem' }}
              disabled={loading}
            >
              {loading ? '⏳ Kontrol ediliyor...' : 'Devam Et →'}
            </button>
          </form>
        )}

        {/* ======== ADIM 2: Güvenlik Sorusu ======== */}
        {step === 2 && (
          <form onSubmit={handleAnswerSubmit}>
            <div style={{
              background: 'rgba(255,107,107,0.06)',
              border: '1px solid rgba(255,107,107,0.2)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                🔐 Güvenlik Sorunuz:
              </p>
              <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                {securityQuestion}
              </p>
            </div>

            <div className="input-group">
              <label>Güvenlik Cevabı</label>
              <input
                type="text"
                className="input-field"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Cevabınızı girin (büyük/küçük harf önemsiz)"
                required
                autoFocus
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.35rem', display: 'block' }}>
                💡 Kayıt sırasında girdiğiniz cevabı hatırlayın.
              </small>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setStep(1); setSecurityQuestion(''); setSecurityAnswer(''); }}
              >
                ← Geri
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={!securityAnswer.trim()}
              >
                Doğrula →
              </button>
            </div>
          </form>
        )}

        {/* ======== ADIM 3: Yeni Şifre ======== */}
        {step === 3 && (
          <form onSubmit={handlePasswordReset}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Güvenlik sorunuz doğrulandı. Şimdi yeni şifrenizi belirleyin.
            </p>

            <div className="input-group">
              <label>Yeni Şifre</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 8 karakter"
                required
                autoFocus
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.35rem', display: 'block' }}>
                En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam içermelidir.
              </small>
            </div>

            <div className="input-group" style={{ marginTop: '0.75rem' }}>
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

            {/* Şifre eşleşme göstergesi */}
            {newPassword && confirmPassword && (
              <div style={{
                borderRadius: '8px', padding: '0.5rem 0.75rem', marginTop: '0.5rem', fontSize: '0.82rem',
                background: newPassword === confirmPassword && validatePassword(newPassword)
                  ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                color: newPassword === confirmPassword && validatePassword(newPassword) ? '#4ade80' : '#f87171',
                border: `1px solid ${newPassword === confirmPassword && validatePassword(newPassword) ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {newPassword === confirmPassword && validatePassword(newPassword)
                  ? '✅ Şifreler eşleşiyor ve yeterince güçlü'
                  : newPassword !== confirmPassword ? '❌ Şifreler eşleşmiyor' : '❌ Şifre yeterince güçlü değil'}
              </div>
            )}

            {passwordError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '0.6rem 0.75rem', marginTop: '0.5rem',
                color: '#f87171', fontSize: '0.82rem',
              }}>
                ⚠️ {passwordError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setStep(2); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}
              >
                ← Geri
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? '⏳ Kaydediliyor...' : '✅ Şifremi Güncelle'}
              </button>
            </div>
          </form>
        )}

        {/* Alt Link */}
        <p style={{ textAlign: 'center', marginTop: '1.75rem', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.88rem' }}>
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
