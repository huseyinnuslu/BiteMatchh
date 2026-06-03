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
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
