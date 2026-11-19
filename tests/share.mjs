// [공유]로 영수증 그림 넘겨받기: 서비스 워커가 그림을 받아 앱 화면으로 넘기고, 화면이 가져가서 바로 읽고, 맡아 둔 그림은 지움
import { PAGE, newPage, check, finish } from "./_common.mjs";
const p = await newPage(390, "light", 844, "allow");
const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
let calls = 0;
await p.context().route(/generativelanguage\.googleapis\.com/, r => { if (r.request().method() === "POST") calls++;
  r.fulfill({ contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true, store: "이마트 햇살점", date: "", total: 7760, items: [{ name: "수제비", unit: 1980, qty: 2, price: 3960 }, { name: "컵밥", unit: 3800, qty: 1, price: 3800 }] }) }] } }] }) }); });
await p.goto(PAGE); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(600);
check(await p.evaluate(() => !!navigator.serviceWorker.controller), "서비스 워커가 화면을 맡지 않음");
check(await p.evaluate(async () => { const m = await (await fetch("manifest.webmanifest")).json(); const t = m.share_target; return !!t && t.method === "POST" && t.enctype === "multipart/form-data" && t.params.files[0].name === "receipt"; }), "설치 정보에 공유 받기 설정이 없음");
await p.evaluate(() => localStorage.setItem("tobuy-aikey", "GOODKEY"));
// 다른 앱이 공유로 그림을 넘기는 것과 같은 방식(그림을 담아 ./share 로 보내기)
let nb = 0;      // 공유할 때마다 다른 그림이 되도록 끝에 붙이는 번호
const shareIn = (n = ++nb) => p.evaluate(n => {
  const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==") + String.fromCharCode(n), c => c.charCodeAt(0));
  const f = document.createElement("form"); f.method = "POST"; f.action = "./share"; f.enctype = "multipart/form-data";
  const i = document.createElement("input"); i.type = "file"; i.name = "receipt";
  const dt = new DataTransfer(); dt.items.add(new File([bytes], "capture.png", { type: "image/png" })); i.files = dt.files;
  f.appendChild(i); document.body.appendChild(f); f.submit();
}, n);
await Promise.all([p.waitForURL(u => !/shared=1/.test(u.search) && !/share$/.test(u.pathname), { timeout: 15000 }).catch(() => {}), shareIn()]);
await p.waitForSelector("#recDlg[open]", { timeout: 15000 }).catch(() => {});
check(await p.locator("#recDlg").evaluate(d => d.open), "공유로 넘긴 그림을 읽은 확인 창이 안 뜸 (주소: " + p.url() + ")");
check(calls === 1 && await p.inputValue("#recTotal") === "7760" && await p.locator("#recItems .irow").count() === 2 && await p.locator("#recPhoto").isVisible(), "공유로 넘긴 그림을 AI로 읽지 않았거나 내용이 이상함");
check(await p.locator("#viewLog").isVisible() && !/shared=1/.test(p.url()), "공유로 들어온 뒤 내역 탭이 아니거나 주소에 표시가 남음");
check(await p.evaluate(async () => !(await (await caches.open("tobuy-share")).match("./shared-receipt"))), "넘겨받은 그림이 지워지지 않고 남아 있음");
await p.click("#recSave");
check(await p.textContent("#monSum") === "7,760원", "공유로 넣은 영수증이 내역에 안 들어감");
await p.click('.tabbar button[data-tab="set"]');
check(await p.locator("#shareDiag").isHidden() && /"ok":true/.test(await p.evaluate(() => localStorage.getItem("tobuy-share-diag"))), "그림을 잘 받았는데 공유 기록이 보이거나, 기록이 안 남음");
// 그림이 없는 공유(글자만 온 경우): 읽지 않고 기록만 남김
await p.evaluate(() => { const f = document.createElement("form"); f.method = "POST"; f.action = "./share"; f.enctype = "multipart/form-data"; const i = document.createElement("input"); i.name = "text"; i.value = "영수증"; f.appendChild(i); document.body.appendChild(f); f.submit(); });
await p.waitForTimeout(1500); await p.click('.tabbar button[data-tab="set"]');
check(calls === 1 && await p.locator("#shareDiag").isVisible() && /그림 없음 .*받은 것: text=글자 3자/.test(await p.textContent("#shareDiag")), "그림 없는 공유의 기록이 이상함: " + await p.textContent("#shareDiag"));
// 새로고침해도 다시 읽지 않음
await p.reload(); await p.waitForTimeout(800);
check(calls === 1 && await p.locator("dialog[open]").count() === 0 && await p.locator("#job").isHidden(), "새로고침하면 공유 그림을 또 읽음");
// 주소에 표시가 없어도(브라우저가 앱 첫 화면으로 바로 여는 경우), 앱이 열려 있는 채로 그림만 들어와도 읽음
const putShared = (ago, n = ++nb) => p.evaluate(async ([ago, n]) => { const c = await caches.open("tobuy-share"); const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==") + String.fromCharCode(n), ch => ch.charCodeAt(0));
  await c.put("./shared-receipt", new Response(new Blob([bytes], { type: "image/png" }), { headers: { "content-type": "image/png", "x-at": String(Date.now() - ago) } })); }, [ago, n]);
await putShared(0); await p.goto(PAGE); await p.waitForSelector("#recDlg[open]", { timeout: 15000 }).catch(() => {});
check(calls === 2 && await p.locator("#recDlg").evaluate(d => d.open) && await p.locator("#viewLog").isVisible(), "주소에 표시가 없으면 공유 그림을 안 읽음");
await p.click("#recCancel"); await p.click('.tabbar button[data-tab="home"]');
await putShared(0); await p.evaluate(() => window.dispatchEvent(new Event("pageshow"))); await p.waitForSelector("#recDlg[open]", { timeout: 15000 }).catch(() => {});
check(calls === 3 && await p.locator("#recDlg").evaluate(d => d.open), "앱이 열려 있는 채로 들어온 공유 그림을 안 읽음");
await p.click("#recCancel");
// 5분 넘게 묵은 그림은 읽지 않고 버림
await putShared(6 * 60000); await p.reload(); await p.waitForTimeout(1200);
check(calls === 3 && await p.locator("#job").isHidden() && await p.evaluate(async () => !(await (await caches.open("tobuy-share")).match("./shared-receipt"))), "묵은 공유 그림을 읽거나 남겨 둠");
// AI를 쓸 수 없을 때(키 없음): 읽지 않고 안내
await p.evaluate(() => localStorage.removeItem("tobuy-aikey")); await p.reload(); await p.waitForTimeout(600);
await Promise.all([p.waitForURL(u => !/shared=1/.test(u.search) && !/share$/.test(u.pathname), { timeout: 15000 }).catch(() => {}), shareIn()]);
await p.waitForTimeout(1500);
check(calls === 3 && await p.locator("#viewSet").isVisible() && await p.evaluate(async () => !(await (await caches.open("tobuy-share")).match("./shared-receipt"))), "AI를 쓸 수 없을 때 안내로 안 가거나 그림이 남음");
// 공유로 열었던 앱을 나중에 다시 켤 때 같은 공유가 또 들어와도(안드로이드가 다시 보냄) 저절로 읽지 않음 — [다시 읽기]로만
await p.evaluate(() => localStorage.setItem("tobuy-aikey", "GOODKEY")); await p.reload(); await p.waitForTimeout(600);
const before = calls;
await Promise.all([p.waitForURL(u => !/shared=1/.test(u.search) && !/share$/.test(u.pathname), { timeout: 15000 }).catch(() => {}), shareIn(1)]);
await p.waitForTimeout(1500);
check(calls === before && await p.locator("#job").isHidden() && await p.locator("dialog[open]").count() === 0 && /전에 공유받은 영수증이라/.test(await p.textContent("#toastText")) && await p.textContent("#toastUndo") === "다시 읽기", "전에 읽은 공유 그림이 또 들어왔는데 저절로 읽거나 안내가 안 나옴");
check(await p.evaluate(async () => !(await (await caches.open("tobuy-share")).match("./shared-receipt"))), "다시 들어온 공유 그림이 남아 있음");
await p.click("#toastUndo"); await p.waitForSelector("#recDlg[open]", { timeout: 15000 }).catch(() => {});
check(calls === before + 1 && await p.locator("#recDlg").evaluate(d => d.open), "[다시 읽기]를 눌러도 안 읽음");
// 이미 넣은 내역과 같은 날·같은 가게·같은 금액이면 확인 창에서 알려 줌
check(await p.locator("#recDup").isVisible() && /이미 있어요/.test(await p.textContent("#recDup")), "같은 내역이 이미 있다는 안내가 안 나옴");
await p.fill("#recTotal", "7700");
check(await p.locator("#recDup").isHidden(), "금액을 바꿨는데도 같은 내역 안내가 남아 있음");
await p.click("#recCancel");
await finish();
