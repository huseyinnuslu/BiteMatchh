import { createContext, useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (e) {
        console.error("Local storage error", e);
      }
    }
    setLoading(false);
  }, []);

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

  const register = async (username, email, password) => {
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
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

  const forgotPassword = async (email) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(data.message || 'Email gönderildi!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'İşlem başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const { data } = await api.put(`/auth/reset-password/${token}`, { password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Şifreniz başarıyla güncellendi!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Şifre sıfırlama başarısız';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, guestLogin, logout, updateProfile, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
