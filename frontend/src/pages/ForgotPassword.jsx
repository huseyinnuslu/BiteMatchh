import { useState, useContext } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ─── Adım 1: E-posta gir → Kod gönder
// ─── Adım 2: Kod + Yeni şifre → Sıfırla

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

  // ── Adım 1: Kodu e-postaya gönder ─────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) {
      setStep(2);
    }
  };

  // ── Adım 2: Kodu + yeni şifreyi doğrula ───────────────────────────────────
  const handleResetPassword = async (e) => {
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
    const result = await resetPassword(email, otp, newPassword);
    setLoading(false);

    if (result.success) {
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  // ── Adım gösterge bileşeni ─────────────────────────────────────────────────
  const StepIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
      {[1, 2].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700,
            background: s < step ? 'var(--primary)' : s === step ? 'rgba(255,75,75,0.15)' : 'rgba(255,255,255,0.06)',
            border: s <= step ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
            color: s < step ? '#fff' : s === step ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'all 0.3s ease',
          }}>
            {s < step ? '✓' : s}
          </div>
          {s < 2 && (
            <div style={{
              width: '60px', height: '2px',
              background: s < step ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );

  const stepLabels = ['E-posta Doğrulama', 'Yeni Şifre Belirleme'];

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '80vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px' }}>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '0.6rem', color: 'var(--primary)' }}>
            {step === 1 ? <Mail size={34} /> : <KeyRound size={34} />}
          </div>
          <h2 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Şifremi Unuttum</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Adım {step}/2 — {stepLabels[step - 1]}
          </p>
        </div>

        <StepIndicator />

        {/* ══════════ ADIM 1: E-posta ══════════ */}
        {step === 1 && (
          <form onSubmit={handleSendCode}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Hesabınıza kayıtlı <strong style={{ color: 'var(--text-main)' }}>e-posta adresinizi</strong> girin.
              Size 6 haneli bir doğrulama kodu göndereceğiz.
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
              {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
            </button>
          </form>
        )}

        {/* ══════════ ADIM 2: Kod + Yeni Şifre ══════════ */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            {/* Bilgi bandı */}
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.83rem',
              color: '#7dd3fc',
              lineHeight: 1.5,
            }}>
              <strong>{email}</strong> adresine 6 haneli bir kod gönderdik.
              Gelen kutunuzu (ve spam klasörünüzü) kontrol edin.
            </div>

            {/* OTP giriş alanı */}
            <div className="input-group">
              <label>6 Haneli Doğrulama Kodu</label>
              <input
                type="text"
                className="input-field"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                required
                autoFocus
                style={{ letterSpacing: '0.5rem', fontSize: '1.4rem', textAlign: 'center', fontWeight: 700 }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.35rem', display: 'block' }}>
                Kod 10 dakika geçerlidir.
              </small>
            </div>

            {/* Yeni şifre */}
            <div className="input-group" style={{ marginTop: '0.75rem' }}>
              <label>Yeni Şifre</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 8 karakter"
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.35rem', display: 'block' }}>
                En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam içermelidir.
              </small>
            </div>

            {/* Şifre tekrar */}
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

            {/* Şifre uyum göstergesi */}
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
                  : newPassword !== confirmPassword
                    ? '❌ Şifreler eşleşmiyor'
                    : '❌ Şifre yeterince güçlü değil'}
              </div>
            )}

            {/* Hata mesajı */}
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
                onClick={() => { setStep(1); setOtp(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}
              >
                ← Geri
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={loading || otp.length !== 6}
              >
                {loading ? '⏳ Güncelleniyor...' : '✅ Şifremi Güncelle'}
              </button>
            </div>

            {/* Yeniden kod gönder */}
            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Kod gelmedi mi?{' '}
              <button
                type="button"
                onClick={() => handleSendCode({ preventDefault: () => {} })}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', padding: 0, textDecoration: 'underline' }}
              >
                Tekrar gönder
              </button>
            </p>
          </form>
        )}

        {/* Alt link */}
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
