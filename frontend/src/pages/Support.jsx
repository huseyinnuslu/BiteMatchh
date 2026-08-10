import { useState } from 'react';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

const Support = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post('/users/support', { subject, message });
      setSubject(''); setMessage('');
      toast.success(data.message || 'Destek talebin gönderildi.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Destek talebi gönderilemedi.');
    } finally { setSending(false); }
  };

  return <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem', boxSizing: 'border-box' }}>
    <button type="button" onClick={() => navigate('/settings')} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: '1.1rem', fontSize: '.85rem' }}><ArrowLeft size={16} /> Ayarlara dön</button>
    <section className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 14, background: 'rgba(255,75,75,.12)', marginBottom: '1rem' }}><MessageCircle size={23} color="var(--primary)" /></div>
      <h1 style={{ margin: 0, fontSize: '1.65rem' }}>BiteMatch Destek</h1>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, margin: '.45rem 0 1.4rem' }}>Bir hata, öneri veya hesabınla ilgili bir konu mu var? Mesajın doğrudan BiteMatch ekibine ulaşır.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: '.85rem' }}>
        <label style={{ color: 'white', fontSize: '.86rem', fontWeight: 700 }}>Konu<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="Örn: Bildirim sorunu" required style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '.4rem', padding: '.75rem', background: 'var(--surface)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 9, color: 'white' }} /></label>
        <label style={{ color: 'white', fontSize: '.86rem', fontWeight: 700 }}>Nasıl yardımcı olabiliriz?<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} rows={7} placeholder="Ne olduğunu, hangi adımda gördüğünü ve mümkünse tekrar nasıl oluştuğunu yaz..." required style={{ display: 'block', width: '100%', boxSizing: 'border-box', resize: 'vertical', marginTop: '.4rem', padding: '.75rem', background: 'var(--surface)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 9, color: 'white', fontFamily: 'inherit' }} /></label>
        <button type="submit" disabled={sending} className="btn btn-primary" style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: '.45rem', padding: '.7rem 1rem' }}><Send size={16} /> {sending ? 'Gönderiliyor...' : 'Destek talebini gönder'}</button>
      </form>
    </section>
  </div>;
};

export default Support;
