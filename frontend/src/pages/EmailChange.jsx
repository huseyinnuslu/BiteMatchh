import { useContext, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

const EMAIL_CHANGE_STORAGE_KEY = 'bitematch-email-change';

const readPendingEmail = () => {
  try {
    return JSON.parse(sessionStorage.getItem(EMAIL_CHANGE_STORAGE_KEY) || 'null')?.email || '';
  } catch {
    return '';
  }
};

const EmailChange = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useContext(AuthContext);
  const [currentEmail, setCurrentEmail] = useState(user?.email || '');
  const [newEmail, setNewEmail] = useState(readPendingEmail);
  const [step, setStep] = useState(() => readPendingEmail() ? 'verify' : 'email');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [completedEmail, setCompletedEmail] = useState('');

  useEffect(() => {
    api.get('/users/profile').then(({ data }) => setCurrentEmail(data.email || '')).catch(() => undefined);
  }, []);

  const cancel = () => {
    sessionStorage.removeItem(EMAIL_CHANGE_STORAGE_KEY);
    navigate('/settings');
  };

  const requestCode = async (event) => {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || email === currentEmail.toLowerCase()) {
      toast.error('Mevcut adresinden farklı bir e-posta gir.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/email-change/request', { email });
      sessionStorage.setItem(EMAIL_CHANGE_STORAGE_KEY, JSON.stringify({ email }));
      setNewEmail(email);
      setOtp('');
      setStep('verify');
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Doğrulama kodu gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/email-change/confirm', { otp });
      sessionStorage.removeItem(EMAIL_CHANGE_STORAGE_KEY);
      updateUser({ email: data.email });
      setCompletedEmail(data.email);
      setStep('complete');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Kod doğrulanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    sessionStorage.removeItem(EMAIL_CHANGE_STORAGE_KEY);
    setOtp('');
    setNewEmail('');
    setStep('email');
  };

  const steps = [{ label: 'Yeni adres' }, { label: 'Doğrulama' }];

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1rem', boxSizing: 'border-box' }}>
      <button type="button" onClick={cancel} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: '1.1rem', fontSize: '.85rem' }}><ArrowLeft size={16} /> Ayarlara dön</button>

      <section className="glass-card" style={{ padding: 'clamp(1.2rem, 5vw, 2rem)', background: 'linear-gradient(145deg, rgba(30,41,59,.96), rgba(15,23,42,.98))', border: '1px solid rgba(99,102,241,.32)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 15, display: 'grid', placeItems: 'center', color: '#c4b5fd', background: 'rgba(99,102,241,.15)', marginBottom: '1rem' }}><MailCheck size={24} /></div>
        <h1 style={{ margin: 0, fontSize: '1.55rem' }}>Giriş e-postanı değiştir</h1>
        <p style={{ margin: '.45rem 0 1.4rem', color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '.9rem' }}>Hesabının güvenliği için yeni adresi değiştirmeden önce doğrulayacağız.</p>

        {step !== 'complete' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.55rem', marginBottom: '1.5rem' }}>{steps.map((item, index) => {
          const active = step === 'verify' ? index <= 1 : index === 0;
          return <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '.45rem', color: active ? '#e0e7ff' : 'var(--text-muted)', fontSize: '.78rem', fontWeight: 750 }}><span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: active ? '#4f46e5' : 'rgba(255,255,255,.08)', color: 'white', fontSize: '.7rem' }}>{index + 1}</span>{item.label}</div>;
        })}</div>}

        {step === 'email' && <form onSubmit={requestCode}>
          <div style={{ padding: '.8rem .9rem', borderRadius: 11, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.09)', marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '.73rem', marginBottom: '.22rem' }}>Mevcut giriş e-postası</div>
            <div style={{ color: 'white', fontWeight: 700, wordBreak: 'break-word' }}>{currentEmail || 'Yükleniyor…'}</div>
          </div>
          <label htmlFor="new-email" style={{ display: 'block', color: 'white', fontSize: '.84rem', fontWeight: 750, marginBottom: '.45rem' }}>Yeni e-posta adresi</label>
          <div style={{ position: 'relative' }}><Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '.85rem', top: '50%', transform: 'translateY(-50%)' }} /><input id="new-email" type="email" autoComplete="email" autoFocus value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="ornek@eposta.com" required style={{ width: '100%', padding: '.8rem .85rem .8rem 2.7rem', background: 'rgba(15,23,42,.72)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 10, color: 'white', outline: 'none' }} /></div>
          <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.2rem', flexWrap: 'wrap' }}><button type="button" onClick={cancel} className="btn" style={{ flex: '1 1 130px', background: 'rgba(255,255,255,.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,.13)' }}>Vazgeç</button><button type="submit" disabled={busy} className="btn btn-primary" style={{ flex: '2 1 210px' }}>{busy ? 'Kod gönderiliyor…' : 'Doğrulama kodu gönder'}</button></div>
        </form>}

        {step === 'verify' && <form onSubmit={verifyCode}>
          <div style={{ padding: '.9rem', borderRadius: 11, background: 'rgba(99,102,241,.09)', border: '1px solid rgba(129,140,248,.28)', marginBottom: '1rem', display: 'flex', gap: '.65rem', alignItems: 'flex-start' }}><ShieldCheck size={20} color="#a5b4fc" style={{ flexShrink: 0, marginTop: 1 }} /><div style={{ color: '#cbd5e1', fontSize: '.83rem', lineHeight: 1.45 }}>6 haneli kod <strong style={{ color: 'white', wordBreak: 'break-word' }}>{newEmail}</strong> adresine gönderildi. Kod 10 dakika geçerli.</div></div>
          <label htmlFor="email-otp" style={{ display: 'block', color: 'white', fontSize: '.84rem', fontWeight: 750, marginBottom: '.45rem' }}>Doğrulama kodu</label>
          <div style={{ position: 'relative' }}><KeyRound size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '.85rem', top: '50%', transform: 'translateY(-50%)' }} /><input id="email-otp" inputMode="numeric" autoComplete="one-time-code" autoFocus value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required style={{ width: '100%', padding: '.8rem .85rem .8rem 2.7rem', background: 'rgba(15,23,42,.72)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 10, color: 'white', outline: 'none', letterSpacing: '.3em', fontWeight: 800 }} /></div>
          <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.2rem', flexWrap: 'wrap' }}><button type="button" onClick={startOver} disabled={busy} className="btn" style={{ flex: '1 1 130px', background: 'rgba(255,255,255,.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,.13)' }}>Farklı adres kullan</button><button type="submit" disabled={busy || otp.length !== 6} className="btn btn-primary" style={{ flex: '2 1 190px' }}>{busy ? 'Doğrulanıyor…' : 'E-postayı doğrula'}</button></div>
        </form>}

        {step === 'complete' && <div style={{ textAlign: 'center', padding: '.4rem 0 .2rem' }}><CheckCircle2 size={48} color="#86efac" style={{ marginBottom: '.75rem' }} /><h2 style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>E-posta güncellendi</h2><p style={{ color: 'var(--text-muted)', margin: '.45rem 0 1.15rem', lineHeight: 1.5 }}>{completedEmail} artık giriş e-posta adresin.</p><button type="button" onClick={() => navigate('/settings')} className="btn btn-primary" style={{ width: '100%' }}>Ayarlara dön</button></div>}
      </section>
    </div>
  );
};

export default EmailChange;
