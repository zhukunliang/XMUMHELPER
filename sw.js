/* XMUM Helper Service Worker：同源静态资源“先读缓存、后台更新”（stale-while-revalidate）。
   改动页面后只要升级 VERSION，旧缓存会在激活时被清理。跨域 API（天气/汇率）不拦截，仍走页面自己的缓存与限频。 */
const VERSION = "xmum-604261d3";
const SHELL = ["./", "index.html", "campus-map.webp", "manifest.webmanifest", "icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req)
          .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
          .catch(() => null);
        if (hit) { e.waitUntil(net); return hit; }
        return net.then((res) => res || (req.mode === "navigate" ? cache.match("index.html") : Response.error()));
      })
    )
  );
});
