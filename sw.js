/* 사야지! — 화면 파일을 저장해 두었다가 인터넷이 약한 매장 안에서도 열리게 함.
   화면은 늘 새로 받아 보고(업데이트 바로 반영), 안 되면 저장해 둔 것으로 엶.
   가족 공간 자료(파이어베이스)는 건드리지 않음 — 파이어베이스가 스스로 이 기기에 저장해 둠. */
const CACHE = "tobuy-v1.6.4";
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
      try { await takeShare(req); } catch (err) {}
      return Response.redirect(new URL("./?shared=1", self.registration.scope).href, 303);
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

/* 공유로 온 요청에서 그림을 꺼내 잠깐 맡아 둠. 브라우저마다 보내는 모양이 달라서
   칸 이름에 기대지 않고 그림이 든 칸을 찾고, 무엇이 왔는지 기록(shared-diag)도 남겨 설정 화면에서 볼 수 있게 함 */
async function takeShare(req) {
  const diag = {at: Date.now(), ct: (req.headers.get("content-type") || "").split(";")[0], parts: [], err: "", ok: false};
  const raw = req.clone();
  let file = null;
  try {
    const fd = await req.formData();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string") { diag.parts.push(k + "=글자 " + v.length + "자"); continue; }
      diag.parts.push(k + "=" + (v.type || "형식 모름") + " " + v.size + "바이트");
      if (v.size && (!file || (/^image\//.test(v.type) && !/^image\//.test(file.type)))) file = v;
    }
  } catch (err) {
    diag.err = String((err && err.message) || err).slice(0, 120);
    try {
      file = await sliceMultipart(new Uint8Array(await raw.arrayBuffer()), req.headers.get("content-type") || "");
      if (file) diag.parts.push("직접 꺼냄=" + file.type + " " + file.size + "바이트");
    } catch (e2) { diag.err += " / " + String((e2 && e2.message) || e2).slice(0, 80); }
  }
  const c = await caches.open(SHARE);
  if (file) {
    await c.put("./shared-receipt", new Response(file, {headers: {"content-type": file.type || "image/jpeg", "x-at": String(diag.at)}}));
    diag.ok = true;
  }
  await c.put("./shared-diag", new Response(JSON.stringify(diag), {headers: {"content-type": "application/json"}}));
}
/* formData() 가 못 읽는 요청일 때: 여러 칸으로 나뉜 본문에서 그림이 든 첫 칸을 직접 잘라 냄 */
function sliceMultipart(buf, contentType) {
  const m = /boundary=("?)([^";]+)\1/i.exec(contentType);
  if (!m) return null;
  const enc = t => Array.from(t, ch => ch.charCodeAt(0));
  const find = (needle, from) => { outer: for (let i = from; i <= buf.length - needle.length; i++) { for (let k = 0; k < needle.length; k++) if (buf[i + k] !== needle[k]) continue outer; return i; } return -1; };
  const mark = enc("--" + m[2]), gap = enc("\r\n\r\n");
  let at = find(mark, 0);
  while (at >= 0) {
    const head = at + mark.length, headEnd = find(gap, head), next = find(mark, head);
    if (headEnd < 0 || next < 0 || headEnd > next) break;
    const headers = String.fromCharCode.apply(null, buf.subarray(head, headEnd));
    const type = (/content-type:\s*([^\r\n;]+)/i.exec(headers) || [])[1] || "";
    if (/filename=/i.test(headers) || /^image\//i.test(type)) {
      const body = buf.slice(headEnd + 4, next - 2);
      if (body.length) return new Blob([body], {type: /^image\//i.test(type) ? type.trim() : "image/jpeg"});
    }
    at = next;
  }
  return null;
}
