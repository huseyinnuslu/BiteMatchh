import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'restaurant-placeholder.svg'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Kart, geçmiş, etkinlik ve restoran görsellerini ilk başarılı
            // isteğin ardından cihazda saklar. Kaynak sunucu yavaşlasa bile
            // sonraki ekran geçişlerinde görsel anında PWA önbelleğinden gelir.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'bitematch-images-v1',
              expiration: { maxEntries: 350, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'BiteMatch - Grup Karar Motoru',
        short_name: 'BiteMatch',
        description: 'Arkadaş grubunuzla Tinder mantığıyla asenkron ve kolayca ortak karar verin!',
        // iOS/PWA taşma alanları BiteMatch koyu zeminiyle aynı görünmeli.
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
