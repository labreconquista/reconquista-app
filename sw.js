// sw.js — Service Worker para RECONQUISTA PWA
// Versión del caché: incrementar al actualizar archivos
const CACHE_NAME = 'reconquista-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación: precachear los archivos de la app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  // Activar inmediatamente sin esperar a que cierren tabs anteriores
  self.skipWaiting();
});

// Activación: limpiar cachés viejos
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
  // Tomar control de todas las tabs inmediatamente
  self.clients.claim();
});

// Fetch: estrategia "Cache First, Network Fallback"
// → La app carga instantáneo desde caché
// → Si no hay red, igual funciona (solo lectura de datos)
self.addEventListener('fetch', event => {
  // Solo interceptar requests GET del mismo origen
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No interceptar requests a Google Sheets API ni externos
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.includes('labreconquista.github.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Devolver caché si existe
      if (cached) return cached;

      // Si no está en caché, buscar en red y guardar
      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Sin red y sin caché: devolver index.html como fallback
        return caches.match('/index.html');
      });
    })
  );
});
