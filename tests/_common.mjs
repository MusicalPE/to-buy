// 사야지! 화면 시험 공통 부분: 작은 서버로 화면을 띄우고, 글꼴·QR 은 이 컴퓨터에 받아 둔 것으로 바꿔 끼움
import fs from "fs";
import http from "http";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");          // 이 컴퓨터에 깔린 playwright(NODE_PATH)
const D = fileURLToPath(new URL(".", import.meta.url)), ROOT = fileURLToPath(new URL("..", import.meta.url)), F = D + "node_modules/@fontsource";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = http.createServer((q, s) => {
  let f = decodeURIComponent(q.url.split("?")[0]); if (f.endsWith("/")) f += "index.html";
  const file = path.join(ROOT, f);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)){ s.writeHead(404); s.end(); return; }
  s.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }); s.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
export const PAGE = `http://127.0.0.1:${server.address().port}/`;
const font = (n, w) => `@font-face{font-family:"${n}";font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`${F}/${n.toLowerCase().replace(/ /g, "-")}/files/${n.toLowerCase().replace(/ /g, "-")}-korean-${w}-normal.woff2`).toString("base64")})}`;
const css = [font("Do Hyeon", 400), font("Nanum Gothic", 400), font("Nanum Gothic", 700), font("Nanum Gothic", 800)].join("\n");
export const problems = [];
const b = await chromium.launch();
export async function newPage(vw, scheme = "light", vh = 844){
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, colorScheme: scheme, permissions: ["clipboard-read", "clipboard-write"], serviceWorkers: "block" });
  const p = await ctx.newPage();
  p.on("pageerror", e => problems.push(`[${vw}] JS오류: ${e.message}`));
  p.on("dialog", d => { problems.push("브라우저 알림창이 뜸: " + d.message()); d.dismiss(); });
  await p.route(/fonts\.googleapis/, r => r.fulfill({ contentType: "text/css", body: css }));
  await p.route(/qrcode\.min\.js/, r => r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(D + "node_modules/qrcode-generator/qrcode.js") }));
  await p.route(/gstatic\.com\/firebasejs/, r => r.abort());   // 여기서는 파이어베이스 서버에 못 붙음 → 이 기기에서 쓰는 모습으로 시험
  return p;
}
export const check = (cond, msg) => { if (!cond) problems.push(msg); };
export const noOverflow = async (p, where) => check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `화면이 옆으로 넘침: ${where}`);
export async function finish(){
  await b.close(); server.close();
  if (problems.length){ console.log("문제:"); problems.forEach(x => console.log(" - " + x)); process.exit(1); }
  console.log("문제 없음");
}
