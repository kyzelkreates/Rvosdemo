// AP3X RV Traveller PWA — Service Worker
const CACHE = "ap3x-traveller-v1";
const ASSETS = [
  "/ap3x-pwa/",
  "/ap3x-pwa/index.html",
  "/ap3x-pwa/ui/traveller.css",
  "/ap3x-pwa/ui/traveller.js",
  "/ap3x/core/storage.js",
  "/ap3x/core/trips.js",
  "/ap3x/core/vehicles.js",
  "/ap3x/engine/ai-assistant.js"
];

self.addEventListener("install",  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch",    e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
