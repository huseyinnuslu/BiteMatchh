import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import { RoomProvider } from './context/RoomContext.jsx';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// PWA Service Worker Kaydı
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

// GOOGLE_CLIENT_ID yoksa placeholder kullan — provider her zaman saralıyor
// yoksa useGoogleLogin hook'u provider bulamayıp crash yapar
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-not-configured';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AuthProvider>
          <RoomProvider>
            <App />
          </RoomProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
