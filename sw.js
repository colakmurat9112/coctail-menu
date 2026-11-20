/* Modern Classics service worker: uygulama kabuğu + veriler önbellekte, tamamen çevrimdışı çalışır.
   İçeriği güncellediğinde VERSION değerini artır (ör. "v2"). */
const VERSION = "v2";
const CACHE = "mc-" + VERSION;
const FONT_CACHE = "mc-fonts";
const ASSETS = [
  "./", "index.html", "manifest.webmanifest",
  "js/app.js",
  "data/items.json", "data/preps.json", "data/cocktails.json", "data/spritz.json", "data/shots.json", "data/backbar.json", "data/snacks.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-64.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    if (hit) {
      fetch(req).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res)); }).catch(() => {});
      return hit;
    }
    return fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => (req.mode === "navigate" ? caches.match("index.html") : undefined));
  }));
});
