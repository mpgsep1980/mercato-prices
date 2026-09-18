// Service worker -- cache la coquille de l'appli ET les fichiers /data/*.json
// (contrairement a la version "serveur local", ici les donnees sont
// statiques et ne changent qu'a un redeploiement -- donc cache-able comme le
// reste, pas besoin de les exclure). Sert depuis GitHub Pages (HTTPS) : le
// "contexte securise" requis pour un service worker est garanti ici,
// contrairement a http://<ip-locale> sur le reseau maison.
//
// v2 (2026-09-18) : la page (index.html/navigation) est passee en "reseau
// d'abord" comme /data/*.json -- BUG CONSTATE avec v1 : ce fichier sw.js
// lui-meme ne changeait jamais d'une mise a jour a l'autre (seul index.html
// changeait), donc le navigateur ne detectait jamais de nouvelle version du
// service worker et continuait a servir la page mise en cache indefiniment,
// meme apres un vrai changement publie et un rechargement simple. Seuls les
// fichiers vraiment statiques (icones, manifest) restent cache-first.
// CACHE_NAME change aussi ci-dessous : force une rupture propre avec le
// cache v1 deja installe chez les visiteurs existants.
const CACHE_NAME = 'mercato-prices-static-v2';
const SHELL_FILES = ['./manifest.json', './icon-192.png', './icon-512.png'];

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isPage = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  // "Reseau d'abord, cache en repli" pour la page et les donnees -- toujours
  // la version la plus fraiche quand le reseau repond, utilisable hors-ligne
  // avec la derniere version connue sinon.
  if (isPage || url.pathname.includes('/data/')) {
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
  // Le reste (icones, manifest) : cache d'abord, change rarement.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
