import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'https://bitematchh.onrender.com'}/api`,
});

// Her istekte (request) localStorage'dan token'ı alıp header'a ekler
api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsedUserInfo = JSON.parse(userInfo);
      if (parsedUserInfo && parsedUserInfo.token) {
        config.headers.Authorization = `Bearer ${parsedUserInfo.token}`;
      }
    } catch (e) {
      console.error("Error parsing user info from local storage", e);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
