// AP3X Command OS — Service Worker
const CACHE = "ap3x-command-v1";
const ASSETS = [
  "/ap3x/",
  "/ap3x/index.html",
  "/ap3x/ui/ap3x.css",
  "/ap3x/ui/dashboard.js",
  "/ap3x/core/storage.js",
  "/ap3x/core/vehicles.js",
  "/ap3x/core/trips.js",
  "/ap3x/engine/simulation-engine.js",
  "/ap3x/engine/ai-assistant.js"
];

self.addEventListener("install",   e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))));
self.addEventListener("activate",  e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch",     e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
