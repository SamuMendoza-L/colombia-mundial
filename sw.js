/* ============================================================
   sw.js — Service Worker
   Pulla Colombia - Mundial 2026
   ============================================================ */

const CACHE_NAME = 'pulla-colombia-v1';

// Archivos que se cachean al instalar la PWA
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/db.js',
  '/js/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ── Instalar: guardar archivos en caché ───────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachea los archivos locales; los externos pueden fallar sin romper la app
      return cache.addAll([
        '/',
        '/index.html',
        '/css/styles.css',
        '/js/config.js',
        '/js/db.js',
        '/js/app.js',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// ── Activar: limpiar cachés viejos ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first para archivos locales, network-first para Supabase ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase siempre va a la red (datos en tiempo real)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para todo lo demás: caché primero, red como respaldo
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachea respuestas válidas de origen propio
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
