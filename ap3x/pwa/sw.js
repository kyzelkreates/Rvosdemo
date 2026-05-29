// AP3X Command OS — Service Worker (GitHub Pages compatible)
const CACHE = "ap3x-command-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./ui/ap3x.css",
  "./ui/dashboard.js",
  "./core/storage.js",
  "./core/vehicles.js",
  "./core/trips.js",
  "./engine/simulation-engine.js",
  "./engine/ai-assistant.js"
];

self.addEventListener("install",   e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))));
self.addEventListener("activate",  e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch",     e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
