import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  ArrowLeft, AtSign, Bell, ChevronRight, Eye, EyeOff, FileText,
  LockKeyhole, Mail, MessageCircle, Pencil, Settings as SettingsIcon, ShieldCheck, UserRound,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import api from '../api';

const panelStyle = {
  padding: '1.15rem', marginBottom: '1rem',
};

const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    aria-pressed={checked}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
      textAlign: 'left', border: 'none', background: 'transparent', color: 'inherit',
      cursor: disabled ? 'wait' : 'pointer', padding: 0,
    }}
  >
    <span style={{ flex: 1 }}>
      <span style={{ display: 'block', fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>{label}</span>
      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.79rem', lineHeight: 1.45, marginTop: '0.2rem' }}>{description}</span>
    </span>
    <span style={{
      width: 46, height: 26, borderRadius: 20, flexShrink: 0, position: 'relative',
      background: checked ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
      boxShadow: checked ? '0 0 12px rgba(255,75,75,0.25)' : 'none', transition: 'all .2s ease',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3, width: 20, height: 20,
        borderRadius: '50%', background: 'white', transition: 'left .2s ease',
      }} />
    </span>
  </button>
);

const Settings = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  const loadSettings = async () => {
    try {
      const [profileResponse, blockedResponse] = await Promise.all([
        api.get('/users/profile'),
        api.get('/users/blocked'),
      ]);
      setProfile(profileResponse.data);
      setUsernameDraft(profileResponse.data.username || '');
      setBlockedUsers(blockedResponse.data || []);
    } catch {
      toast.error('Ayarlar yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const nextUsernameChangeAt = useMemo(() => {
    if (!profile?.usernameChangedAt) return null;
    return new Date(new Date(profile.usernameChangedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  }, [profile?.usernameChangedAt]);
  const canChangeUsername = !nextUsernameChangeAt || nextUsernameChangeAt <= new Date();

  const saveUsername = async (event) => {
    event.preventDefault();
    const username = usernameDraft.trim();
    if (username === profile.username) {
      setEditingUsername(false);
      return;
    }

    setSavingUsername(true);
    try {
      const { data } = await api.put('/auth/profile', { username });
      setProfile(prev => ({ ...prev, username: data.username, usernameChangedAt: data.usernameChangedAt }));
      updateUser({ username: data.username, usernameChangedAt: data.usernameChangedAt });
      setEditingUsername(false);
      toast.success('Kullanıcı adın güncellendi.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Kullanıcı adı güncellenemedi.');
    } finally {
      setSavingUsername(false);
    }
  };

  const toggleStatsVisibility = async () => {
    if (!profile || savingPrivacy) return;
    const isStatsPublic = !profile.isStatsPublic;
    setSavingPrivacy(true);
    try {
      await api.put('/auth/profile', { isStatsPublic });
      setProfile(prev => ({ ...prev, isStatsPublic }));
      updateUser({ isStatsPublic });
      toast.success(isStatsPublic ? 'Profil istatistiklerin görünür oldu.' : 'Profil istatistiklerin gizlendi.');
    } catch {
      toast.error('Gizlilik ayarı güncellenemedi.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const unblockUser = async (blockedUser) => {
    setUnblockingId(blockedUser._id);
    try {
      await api.delete(`/users/block/${blockedUser._id}`);
      setBlockedUsers(prev => prev.filter(item => item._id !== blockedUser._id));
      toast.success(`@${blockedUser.username} için engel kaldırıldı.`);
    } catch {
      toast.error('Engel kaldırılamadı.');
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '65vh', color: 'var(--text-muted)' }}>Ayarlar yükleniyor...</div>;
  }
  if (!profile) return null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem', boxSizing: 'border-box' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: '1.1rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Profilime dön
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, rgba(255,75,75,.23), rgba(99,102,241,.25))', border: '1px solid rgba(255,255,255,.12)' }}>
            <SettingsIcon size={23} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem' }}>Ayarlar</h1>
            <p style={{ margin: '0.22rem 0 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>Hesabını ve gizlilik tercihlerini yönet.</p>
          </div>
        </div>

        <section className="glass-card" style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Avatar src={profile.profilePic} username={profile.username} size={52} />
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ color: 'white', fontWeight: 750 }}>@{profile.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.79rem', marginTop: 3 }}>{profile.email}</div>
            </div>
            <Link to="/profile" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 0.8rem', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', color: 'white', fontSize: '0.8rem', fontWeight: 700 }}>
              <UserRound size={14} /> Profili düzenle
            </Link>
          </div>
        </section>

        <p style={{ color: 'var(--text-muted)', margin: '1.45rem 0 .65rem', fontSize: '.72rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Hesap</p>
        <section className="glass-card" style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.8rem' }}>
            <AtSign size={19} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '.92rem' }}>Kullanıcı adı</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '.79rem', marginTop: '.2rem' }}>@{profile.username} · 7 günde bir değiştirilebilir.</div>
                </div>
                {!editingUsername && (
                  <button type="button" onClick={() => setEditingUsername(true)} disabled={!canChangeUsername} style={{ border: '1px solid rgba(255,75,75,.45)', borderRadius: 8, padding: '.46rem .7rem', background: canChangeUsername ? 'rgba(255,75,75,.09)' : 'rgba(255,255,255,.04)', color: canChangeUsername ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, cursor: canChangeUsername ? 'pointer' : 'not-allowed', fontSize: '.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Pencil size={13} /> Değiştir
                  </button>
                )}
              </div>
              {editingUsername && (
                <form onSubmit={saveUsername} style={{ display: 'flex', gap: '.5rem', marginTop: '.8rem', flexWrap: 'wrap' }}>
                  <input value={usernameDraft} onChange={(event) => setUsernameDraft(event.target.value)} maxLength={15} autoFocus autoComplete="username" aria-label="Yeni kullanıcı adı" style={{ flex: '1 1 180px', minWidth: 0, padding: '.58rem .7rem', background: 'var(--surface)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 8, color: 'white' }} />
                  <button type="submit" disabled={savingUsername} className="btn btn-primary" style={{ padding: '.58rem .8rem', fontSize: '.8rem' }}>{savingUsername ? 'Kaydediliyor...' : 'Kaydet'}</button>
                  <button type="button" onClick={() => { setUsernameDraft(profile.username); setEditingUsername(false); }} disabled={savingUsername} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, padding: '.58rem .8rem', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.8rem' }}>Vazgeç</button>
                </form>
              )}
              {!canChangeUsername && !editingUsername && (
                <div style={{ color: 'var(--text-muted)', fontSize: '.76rem', marginTop: '.65rem' }}>Tekrar değiştirilebilir: {nextUsernameChangeAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              )}
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '1rem 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
            <Mail size={19} color="var(--accent)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '.92rem' }}>Giriş e-postası</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '.79rem', marginTop: '.2rem' }}>{profile.email}</div>
            </div>
            <button type="button" onClick={() => navigate('/settings/email')} style={{ border: '1px solid rgba(255,75,75,.45)', borderRadius: 8, padding: '.46rem .7rem', background: 'rgba(255,75,75,.09)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Pencil size={13} /> Değiştir</button>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', lineHeight: 1.45, marginTop: '.7rem' }}>Yeni adres, ayrı güvenlik ekranında gönderilen 6 haneli kod doğrulanmadan değişmez.</div>
        </section>

        <p style={{ color: 'var(--text-muted)', margin: '1.45rem 0 .65rem', fontSize: '.72rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Destek</p>
        <button type="button" onClick={() => navigate('/support')} className="glass-card" style={{ ...panelStyle, width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', border: '1px solid rgba(255,255,255,.1)', display: 'flex', gap: '.8rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'flex-start', marginBottom: '.9rem' }}>
            <MessageCircle size={19} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div><div style={{ color: 'white', fontWeight: 700, fontSize: '.92rem' }}>Bize yaz</div><div style={{ color: 'var(--text-muted)', fontSize: '.79rem', lineHeight: 1.45, marginTop: '.2rem' }}>Talebin doğrudan BiteMatch yönetim paneline düşer.</div></div>
          </div>
        </button>

        <p style={{ color: 'var(--text-muted)', margin: '1.45rem 0 .65rem', fontSize: '.72rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Gizlilik ve bildirimler</p>
        <section className="glass-card" style={panelStyle}>
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'flex-start' }}>
            {profile.isStatsPublic ? <Eye size={19} color="var(--success)" style={{ marginTop: 2, flexShrink: 0 }} /> : <EyeOff size={19} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <Toggle checked={Boolean(profile.isStatsPublic)} onChange={toggleStatsVisibility} disabled={savingPrivacy} label="Profil istatistiklerimi göster" description="Beğeni ve oda istatistiklerin profilini ziyaret eden kullanıcılara gösterilir." />
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '1rem 0' }} />
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'flex-start' }}>
            <Bell size={19} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '.92rem' }}>Uygulama içi bildirimler</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '.79rem', lineHeight: 1.45, marginTop: '.2rem' }}>Oda davetleri, arkadaşlık istekleri, mesajlar ve eşleşmeler bildirim zilinde görünür.</div>
            </div>
          </div>
        </section>

        <p style={{ color: 'var(--text-muted)', margin: '1.45rem 0 .65rem', fontSize: '.72rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Güvenlik</p>
        <section className="glass-card" style={panelStyle}>
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'flex-start', marginBottom: blockedUsers.length ? '.95rem' : 0 }}>
            <ShieldCheck size={19} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '.92rem' }}>Engellenen kullanıcılar</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '.79rem', marginTop: '.2rem' }}>{blockedUsers.length ? `${blockedUsers.length} kullanıcıyı engelledin.` : 'Engellediğin kullanıcı yok.'}</div>
            </div>
          </div>
          {blockedUsers.map((blockedUser) => (
            <div key={blockedUser._id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', paddingTop: '.75rem', marginTop: '.75rem', borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <Avatar src={blockedUser.profilePic} username={blockedUser.username} size={34} />
              <div style={{ flex: 1, minWidth: 0, color: 'white', fontSize: '.86rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{blockedUser.username}</div>
              <button type="button" onClick={() => unblockUser(blockedUser)} disabled={unblockingId === blockedUser._id} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.16)', color: 'var(--text-muted)', borderRadius: 8, padding: '.42rem .62rem', fontSize: '.76rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>{unblockingId === blockedUser._id ? '...' : 'Engeli kaldır'}</button>
            </div>
          ))}
        </section>

        <p style={{ color: 'var(--text-muted)', margin: '1.45rem 0 .65rem', fontSize: '.72rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Yasal</p>
        <Link to="/terms" className="glass-card" style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: '.8rem', color: 'inherit', textDecoration: 'none' }}>
          <FileText size={19} color="var(--primary)" />
          <span style={{ flex: 1 }}><span style={{ display: 'block', color: 'white', fontWeight: 700, fontSize: '.92rem' }}>Kullanıcı sözleşmesi ve KVKK</span><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '.79rem', marginTop: '.2rem' }}>Verilerinin nasıl işlendiğini incele.</span></span>
          <ChevronRight size={18} color="var(--text-muted)" />
        </Link>
      </motion.div>
    </div>
  );
};

export default Settings;
