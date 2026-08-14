import { createContext, useState } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Oturum bilgisini ilk render'dan SONRA değil, React ağacını kurarken okuyoruz.
  // Böylece navbar ve arkadaş avatarları önce harf rozetiyle çizilip birkaç saniye
  // sonra fotoğrafa dönmez.
  const [user, setUser] = useState(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) return null;
    try {
      return JSON.parse(userInfo);
    } catch (e) {
      console.error('Local storage error', e);
      return null;
    }
  });
  const [loading] = useState(false);

  // ── Giriş ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Giriş başarılı!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Giriş başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // ── Kayıt ──────────────────────────────────────────────────────────────────
  const register = async (username, email, password, termsAccepted, privacyNoticeAcknowledged) => {
    try {
      const { data } = await api.post('/auth/register', { username, email, password, termsAccepted, privacyNoticeAcknowledged });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Kayıt başarılı!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Kayıt başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // ── Misafir Girişi ─────────────────────────────────────────────────────────
  const guestLogin = async () => {
    try {
      const { data } = await api.post('/auth/guest');
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Misafir olarak giriş yapıldı!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Misafir girişi başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // ── Şifre Sıfırlama – Adım 1: OTP Gönder ──────────────────────────────────
  const forgotPassword = async (email) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(data.message || 'Doğrulama kodu e-posta adresinize gönderildi!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'İşlem başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // ── Şifre Sıfırlama – Adım 2: OTP + Yeni Şifre ────────────────────────────
  const resetPassword = async (email, otp, newPassword) => {
    try {
      const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Şifreniz başarıyla güncellendi!');
      return { success: true, data };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Şifre sıfırlama başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // ── Google OAuth2 ile Giriş / Kayıt ───────────────────────────────────────
  const googleLogin = async (accessToken, userInfo, termsAccepted = false, privacyNoticeAcknowledged = false) => {
    try {
      const { data } = await api.post('/auth/google-login', { accessToken, userInfo, termsAccepted, privacyNoticeAcknowledged });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      if (data.usernameOnboardingRequired) {
        toast.info('Devam etmek için kullanıcı adını seç.');
      } else {
        toast.success(`Hoş geldin, ${data.name || data.username}! 🎉`);
      }
      return { success: true, requiresUsernameSetup: Boolean(data.usernameOnboardingRequired) };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Google girişi başarısız';
      toast.error(msg);
      return {
        success: false,
        message: msg,
        requiresRegistrationConsent: error.response?.status === 400 && msg.includes('Yeni hesap oluşturmak için'),
      };
    }
  };

  const completeUsernameOnboarding = async (username) => {
    try {
      const { data } = await api.post('/auth/complete-username', { username });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success(`@${data.username} hazır. BiteMatch'e hoş geldin! 🎉`);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Kullanıcı adı kaydedilemedi';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };


  // ── Çıkış ──────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  // ── Profil Güncelle ────────────────────────────────────────────────────────
  const updateProfile = async (username, email, password) => {
    try {
      const { data } = await api.put('/auth/profile', { username, email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Profil güncellendi!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Profil güncellenemedi';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };
  const updateUser = (newData) => {
    const updated = { ...user, ...newData };
    setUser(updated);
    localStorage.setItem('userInfo', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        guestLogin,
        logout,
        updateProfile,
        forgotPassword,
        resetPassword,
        googleLogin,
        completeUsernameOnboarding,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
