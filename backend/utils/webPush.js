import webpush from 'web-push';
import User from '../models/User.js';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@bitematch.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendPushToUser(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const user = await User.findById(userId).select('pushSubscription').lean();
    if (!user?.pushSubscription?.endpoint) return;
    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify({ title: payload.title || 'BiteMatch', body: payload.body || '', icon: payload.icon || '/icon-192.png', url: payload.url || '/' })
    );
  } catch (err) {
    if (err.statusCode === 410) await User.findByIdAndUpdate(userId, { pushSubscription: null }).catch(() => {});
    else console.error('Push hatasi:', err.message);
  }
}

export async function sendPushToMany(userIds, payload) {
  await Promise.allSettled(userIds.map(id => sendPushToUser(id, payload)));
}
