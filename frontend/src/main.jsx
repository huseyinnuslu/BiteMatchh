import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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
    <BrowserRouter>
      <AuthProvider>
        <RoomProvider>
          <App />
        </RoomProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
