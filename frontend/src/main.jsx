import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import { RoomProvider } from './context/RoomContext.jsx';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// PWA Service Worker Kaydı (Otomatik Arka Plan Güncellemesi)
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
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
