// Service worker -- cache la coquille de l'appli ET les fichiers /data/*.json
// (contrairement a la version "serveur local", ici les donnees sont
// statiques et ne changent qu'a un redeploiement -- donc cache-able comme le
// reste, pas besoin de les exclure). Sert depuis GitHub Pages (HTTPS) : le
// "contexte securise" requis pour un service worker est garanti ici,
// contrairement a http://<ip-locale> sur le reseau maison.
const CACHE_NAME = 'mercato-prices-static-v1';
const SHELL_FILES = ['./', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

// "Network first, cache fallback" pour les donnees (./data/*.json) : donne
// la version la plus fraiche quand le reseau repond, mais reste utilisable
// hors-ligne avec la derniere version connue sinon. Le reste (coquille) reste
// cache-first (rarement modifie).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/data/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
