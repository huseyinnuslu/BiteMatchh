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

// Hesap silindikten sonra veya oturum süresi geçtikten sonra tarayıcıda eski
// JWT kalabilir. Sunucu bu isteği 401 ile reddettiğinde arayüzün kullanıcıyı
// hâlâ giriş yapmış göstermesine ya da tekrar eden hata istekleri üretmesine
// izin vermeyiz; eski oturumu temizleyip giriş sayfasına döneriz.
let redirectingAfterUnauthorized = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isAuthFlow = requestUrl.startsWith('/auth/');

    if (status === 401 && !isAuthFlow && !redirectingAfterUnauthorized) {
      redirectingAfterUnauthorized = true;
      localStorage.removeItem('userInfo');

      if (window.location.pathname !== '/login') {
        window.location.replace('/login?reason=session_expired');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
