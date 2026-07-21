self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: 'BiteMatch', body: 'Yeni bir bildirim var!', icon: '/icon-192.png', url: '/' };
  try { if (event.data) data = { ...data, ...JSON.parse(event.data.text()) }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon || '/icon-192.png', badge: '/icon-72.png',
      vibrate: [200, 100, 200], data: { url: data.url || '/' },
      actions: [{ action: 'open', title: 'Ac' }, { action: 'dismiss', title: 'Kapat' }],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
