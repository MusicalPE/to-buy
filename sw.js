/* 사야지! — 화면 파일을 저장해 두었다가 인터넷이 약한 매장 안에서도 열리게 함.
   화면은 늘 새로 받아 보고(업데이트 바로 반영), 안 되면 저장해 둔 것으로 엶.
   가족 공간 자료(파이어베이스)는 건드리지 않음 — 파이어베이스가 스스로 이 기기에 저장해 둠. */
const CACHE = "tobuy-v1.6.1";
const SHARE = "tobuy-share";      // [공유]로 넘겨받은 영수증 그림을 화면이 가져갈 때까지 잠깐 두는 곳(가져가면 바로 지움)
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./app-firebase.js", "./firebase-config.js", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./logo.png", "./privacy.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SHARE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  /* 다른 앱이나 갤러리에서 [공유]로 사야지!를 고르면 그림이 여기로 옴 → 잠깐 두고 앱 화면(?shared=1)으로 넘김 */
  if (req.method === "POST" && url.origin === location.origin && url.pathname.endsWith("/share")) {
    e.respondWith((async () => {
      try {
        const file = (await req.formData()).get("receipt");
        if (file && file.size) {
          const c = await caches.open(SHARE);
          await c.put("./shared-receipt", new Response(file, {headers: {"content-type": file.type || "image/jpeg"}}));
        }
      } catch (err) {}
      return Response.redirect("./?shared=1", 303);
    })());
    return;
  }
  if (req.method !== "GET") return;
  const mine = url.origin === location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdnjs.cloudflare.com" || url.hostname === "www.gstatic.com";
  if (!mine && !font) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(mine && req.mode === "navigate" ? url.origin + url.pathname : req, copy));
      }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true})
      .then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
