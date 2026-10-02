/* YDS Kelime Atölyesi — service worker.
   Yalnızca UYGULAMA DOSYALARINI önbelleğe alır. Kişisel öğrenme verisi localStorage'dadır; service worker ona erişmez ve onu silmez. */
const VERSION = "__CACHE_VERSION__";
const CACHE = "yds-app-" + VERSION;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async (url) => { try { const r = await fetch(url, { cache: "reload" }); if (r.ok) await cache.put(url, r.clone()); } catch { /* çevrimdışı kurulum */ } }));
    // Ana sayfanın doğrudan bağladığı dosyalar (CSS/JS) — sürüm değişse de çevrimdışı açılış bozulmasın
    try {
      const html = await (await cache.match("/"))?.text();
      if (html) {
        const urls = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all([...new Set(urls)].map(async (u) => { try { const r = await fetch(u); if (r.ok) await cache.put(u, r); } catch {} }));
      }
    } catch {}
  })());
  // Yeni sürüm kullanıcının onayıyla etkinleşir (SKIP_WAITING mesajı); oturum ortasında sayfa değişmez.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("yds-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "SKIP_WAITING") self.skipWaiting();
  if (d.type === "CACHE_URLS" && Array.isArray(d.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(d.urls.filter((u) => typeof u === "string" && u.startsWith(self.location.origin)).map(async (u) => {
        try { if (!(await cache.match(u))) { const r = await fetch(u); if (r.ok) await cache.put(u, r); } } catch {}
      }));
    })());
  }
  if (d.type === "GET_VERSION" && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {   // ağ öncelikli, çevrimdışıysa önbellekteki uygulama kabuğu
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) { cache.put("/", res.clone()); }
        return res;
      } catch {
        return (await cache.match(req)) || (await cache.match("/")) || new Response("Çevrimdışı", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/apple-touch-icon.png") {
    event.respondWith((async () => {   // değişmez dosyalar: önbellek öncelikli
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  event.respondWith((async () => {   // diğerleri: önbellekten hemen, arkada güncelle
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
