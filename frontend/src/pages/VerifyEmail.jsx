import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const VerifyEmail = () => {
  const { verifyRegistrationEmail, resendRegistrationVerification } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const fromLocation = location.state?.from;
  const destination = fromLocation
    ? `${fromLocation.pathname || '/dashboard'}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '/dashboard';

  const verify = async (event) => {
    event.preventDefault();
    setLoading(true);
    const result = await verifyRegistrationEmail(email, otp);
    setLoading(false);
    if (result.success) navigate(destination, { replace: true });
  };

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const resend = async () => {
    if (!email || resendCountdown > 0) return;
    setResending(true);
    const result = await resendRegistrationVerification(email);
    if (result.retryAfterSeconds > 0) setResendCountdown(result.retryAfterSeconds);
    setResending(false);
  };

  return (
    <div className="flex-center animate-slide-up" style={{ minHeight: '80vh', padding: '2rem 0' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <MailCheck size={36} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
          <h2 className="text-gradient" style={{ marginBottom: '0.4rem' }}>E-postanı doğrula</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
            Hesabını etkinleştirmek için e-posta adresine gönderdiğimiz 6 haneli kodu gir.
          </p>
        </div>

        <form onSubmit={verify}>
          <div className="input-group">
            <label>E-posta adresi</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@email.com"
              autoComplete="email"
              required
              autoFocus={!email}
            />
          </div>
          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>6 haneli doğrulama kodu</label>
            <input
              type="text"
              className="input-field"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="_ _ _ _ _ _"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus={Boolean(email)}
              style={{ letterSpacing: '0.5rem', fontSize: '1.35rem', textAlign: 'center', fontWeight: 700 }}
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.45rem' }}>Kod 10 dakika geçerlidir. Gelen kutusu ve spam klasörünü kontrol et.</small>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading || otp.length !== 6}>
            {loading ? 'Doğrulanıyor...' : 'Hesabımı Doğrula'}
          </button>
        </form>

        <button type="button" className="btn btn-outline" onClick={resend} disabled={!email || resending || resendCountdown > 0} style={{ width: '100%', marginTop: '0.75rem' }}>
          {resending ? 'Kod gönderiliyor...' : resendCountdown > 0 ? `Yeni kod için ${resendCountdown} sn bekle` : 'Kodu yeniden gönder'}
        </button>
        {resendCountdown > 0 && (
          <small style={{ display: 'block', textAlign: 'center', marginTop: '0.55rem', color: 'var(--text-muted)' }}>
            Yeni kod gönderilirse önceki kod otomatik olarak geçersiz olur.
          </small>
        )}
        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Giriş sayfasına dön</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
