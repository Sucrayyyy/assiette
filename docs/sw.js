// Garde l'app disponible hors connexion (la recherche en ligne a besoin d'internet) et affiche les rappels.
importScripts('./js/reminder-copy.js');

const CACHE = 'assiette-v9';
const DATA = 'assiette-data';
const SHELL = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/store.js',
  './js/nutrition.js',
  './js/foods.js',
  './js/off.js',
  './js/scanner.js',
  './js/ui.js',
  './js/body.js',
  './js/workout.js',
  './js/workout-data.js',
  './js/badges.js',
  './js/figure.js',
  './js/splash.js',
  './js/theme.js',
  './js/panel.js',
  './js/gestures.js',
  './js/config.js',
  './js/reminder-copy.js',
  './js/supplements.js',
  './js/modules.js',
  './js/insights.js',
  './js/trophies.js',
  './js/recap.js',
  './js/body-data.js',
  './js/timer.js',
  './js/bodylog.js',
  './js/figure3d.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== DATA).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))),
  );
});

// ---------------------------------------------------------------------------
// Rappels de compléments
// ---------------------------------------------------------------------------

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function reminderState() {
  try {
    const cache = await caches.open(DATA);
    const res = await cache.match('./__reminders');
    return res ? await res.json() : null;
  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let msg = {};
    try {
      msg = event.data ? event.data.json() : {};
    } catch { /* message vide : on affiche le texte générique */ }
    const now = new Date();
    const data = await reminderState();
    // Le texte s'écrit ici : le serveur ne connaît ni les noms ni les doses.
    const today = dayKey(now);
    const taken = data && data.day === today ? data.taken : [];
    const pending = (data ? data.supps : []).filter((s) => (!s.days.length || s.days.includes(now.getDay())) && !taken.includes(s.id));
    const tier = msg.tier || self.reminderTier(now.getHours()) || 1;
    const copy = msg.test
      ? { title: 'Ça marche !', body: 'Tes rappels de compléments arriveront à 16 h, 18 h et 20 h si besoin.', vibrate: [100] }
      : self.reminderCopy(tier, pending.map((s) => s.name), data ? data.streak : 0);
    if (!msg.test && self.navigator.setAppBadge) self.navigator.setAppBadge(pending.length || 1).catch(() => {});
    await self.registration.showNotification(copy.title, {
      body: copy.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'assiette-supps',
      renotify: true,
      vibrate: copy.vibrate,
      requireInteraction: tier >= 3,
      actions: msg.test ? [] : [{ action: 'taken', title: "C'est pris" }],
      data: { url: './#complements', day: today },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  n.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (event.action === 'taken') {
      // Validé sans ouvrir l'app : elle s'en occupera à la prochaine ouverture.
      const cache = await caches.open(DATA);
      await cache.put('./__taken', new Response(JSON.stringify({ day: n.data.day })));
      const data = await reminderState();
      if (data && data.pushUrl && data.pushId) {
        await fetch(`${data.pushUrl}/sync`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: data.pushId, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, doneDay: n.data.day, enabled: true }) }).catch(() => {});
      }
      if (self.navigator.clearAppBadge) self.navigator.clearAppBadge().catch(() => {});
      clients.forEach((c) => c.postMessage({ type: 'supps-taken' }));
      return;
    }
    if (clients.length) {
      await clients[0].focus();
      clients[0].postMessage({ type: 'open-supps' });
      return;
    }
    await self.clients.openWindow(n.data && n.data.url ? n.data.url : './');
  })());
});
