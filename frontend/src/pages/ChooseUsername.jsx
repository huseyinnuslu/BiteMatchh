import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,15}$/;

const ChooseUsername = () => {
  const { user, completeUsernameOnboarding } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !user.usernameOnboardingRequired) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const error = useMemo(() => {
    if (!username) return '';
    return USERNAME_PATTERN.test(username)
      ? ''
      : '3-15 karakter kullan; yalnızca harf, rakam, nokta veya alt çizgi olabilir.';
  }, [username]);

  const normalizedName = useMemo(() => name.replace(/\s+/g, ' ').trim(), [name]);
  const nameError = useMemo(() => {
    if (!name) return '';
    return normalizedName.length >= 3 && normalizedName.length <= 60 && normalizedName.split(' ').filter(Boolean).length >= 2
      ? ''
      : 'Adını ve soyadını birlikte gir.';
  }, [name, normalizedName]);

  const continueToUsername = (event) => {
    event.preventDefault();
    if (!nameError && normalizedName) setStep(2);
  };

  const submit = async (event) => {
    event.preventDefault();
    const candidate = username.trim();
    if (!USERNAME_PATTERN.test(candidate) || submitting) return;

    setSubmitting(true);
    const result = await completeUsernameOnboarding(normalizedName, candidate);
    setSubmitting(false);
    if (result.success) {
      const savedDestination = sessionStorage.getItem('bitematch_post_onboarding_path');
      const destination = location.state?.from || savedDestination || '/dashboard';
      sessionStorage.removeItem('bitematch_post_onboarding_path');
      // Sadece uygulama içindeki rotalara dönüşe izin veriyoruz.
      navigate(typeof destination === 'string' && destination.startsWith('/') ? destination : '/dashboard', { replace: true });
    }
  };

  if (!user) return null;

  return (
    <main className="flex-center animate-slide-up" style={{ minHeight: '100vh', padding: '1.5rem 1rem', boxSizing: 'border-box' }}>
      <section className="glass-card" style={{ width: '100%', maxWidth: 460, padding: '2.25rem', textAlign: 'center' }}>
        <div aria-hidden="true" style={{ width: 62, height: 62, margin: '0 auto 1.15rem', display: 'grid', placeItems: 'center', borderRadius: 18, fontSize: '1.8rem', background: 'linear-gradient(135deg, rgba(255,77,89,.22), rgba(110,86,255,.3))', border: '1px solid rgba(255,255,255,.16)' }}>{step === 1 ? 'Aa' : '@'}</div>
        <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '.78rem', letterSpacing: '.08em', margin: '0 0 .45rem' }}>ADIM {step}/2</p>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.55rem, 7vw, 2rem)', color: 'white' }}>{step === 1 ? 'Adını nasıl yazalım?' : 'Kullanıcı adını seç'}</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: '.75rem 0 1.6rem' }}>
          {step === 1
            ? 'Profilinde görünecek adını ve soyadını gir. Google hesabındaki ad otomatik kullanılmaz.'
            : 'Arkadaşların seni bu adla bulacak. Daha sonra ayarlardan 7 günde bir değiştirebilirsin.'}
        </p>

        {step === 1 ? (
          <form onSubmit={continueToUsername} style={{ textAlign: 'left' }}>
            <label htmlFor="onboarding-name" style={{ display: 'block', color: 'white', fontWeight: 700, fontSize: '.9rem', marginBottom: '.5rem' }}>Ad soyad</label>
            <input
              id="onboarding-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              autoComplete="name"
              autoFocus
              placeholder="Örn. Deniz Yılmaz"
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${nameError ? 'var(--danger)' : 'rgba(132,112,255,.7)'}`, outline: 0, borderRadius: 11, padding: '.95rem', background: 'rgba(10,18,35,.68)', color: 'white', fontSize: '1rem' }}
              aria-describedby="name-help"
            />
            <div id="name-help" style={{ minHeight: '1.35rem', marginTop: '.45rem', color: nameError ? 'var(--danger)' : 'var(--text-muted)', fontSize: '.78rem' }}>{nameError || 'Bu ad profilinde gösterilir.'}</div>
            <button type="submit" className="btn btn-primary" disabled={!normalizedName || Boolean(nameError)} style={{ width: '100%', marginTop: '1rem', opacity: (!normalizedName || nameError) ? .65 : 1 }}>Devam et</button>
          </form>
        ) : (
        <form onSubmit={submit} style={{ textAlign: 'left' }}>
          <label htmlFor="onboarding-username" style={{ display: 'block', color: 'white', fontWeight: 700, fontSize: '.9rem', marginBottom: '.5rem' }}>Kullanıcı adı</label>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${error ? 'var(--danger)' : 'rgba(132,112,255,.7)'}`, borderRadius: 11, background: 'rgba(10,18,35,.68)', overflow: 'hidden', boxShadow: error ? '0 0 0 3px rgba(255,77,89,.12)' : '0 0 18px rgba(103,86,255,.12)' }}>
            <span style={{ paddingLeft: '.95rem', color: 'var(--text-muted)', fontWeight: 800 }}>@</span>
            <input
              id="onboarding-username"
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/\s/g, ''))}
              maxLength={15}
              autoComplete="username"
              autoFocus
              placeholder="ornek.kullanici"
              style={{ width: '100%', border: 0, outline: 0, padding: '.95rem .8rem', background: 'transparent', color: 'white', fontSize: '1rem' }}
              aria-describedby="username-help"
            />
          </div>
          <div id="username-help" style={{ minHeight: '1.35rem', marginTop: '.45rem', color: error ? 'var(--danger)' : 'var(--text-muted)', fontSize: '.78rem' }}>
            {error || 'Benzersiz olmalı; boşluk ve Türkçe karakter kullanılamaz.'}
          </div>
          <button type="button" onClick={() => setStep(1)} style={{ marginTop: '.9rem', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.82rem', padding: 0 }}>Ad soyadı düzenle</button>
          <button type="submit" className="btn btn-primary" disabled={!username || Boolean(error) || submitting} style={{ width: '100%', marginTop: '1rem', opacity: (!username || error || submitting) ? .65 : 1 }}>
            {submitting ? 'Kaydediliyor...' : 'Kullanıcı Adını Kaydet'}
          </button>
        </form>
        )}
      </section>
    </main>
  );
};

export default ChooseUsername;
