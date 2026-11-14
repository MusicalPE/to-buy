// 가족 공간 흉내: 화면이 가족 쪽으로 보내는 것과, 가족이 바꾼 것이 화면에 오는 것
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const p = await newPage(390);
await p.goto(PAGE); await p.waitForTimeout(500);
const add = async t => { await p.fill("#addText", t); await p.click("#addForm button[type=submit]"); };
// 로그인 전 이 기기에 적어 둔 것
await add("이 기기 물건");
const log = [];
await p.exposeFunction("__log", x => log.push(x));
await p.evaluate(() => {
  const ok = (...a) => { __log(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ")); return Promise.resolve(); };
  window.FBAPP = { login: async () => {}, logout: async () => {}, leaveFamily: async () => { TOBUY.leaveFamily(); TOBUY.setAccount({ phase: "nofamily", user: { uid: "u", name: "테스트" } }); },
    deleteAccount: async () => {}, createFamily: (n, d, items) => ok("create", n, d.stores.length, items.length) };
  TOBUY.setAccount({ phase: "nofamily", user: { uid: "u", name: "테스트" } });
});
check(/가족 공간 만들기/.test(await p.textContent("#acctBtn")), "로그인 뒤 '가족 공간 만들기'가 안 나옴");
await p.click("#acctBtn"); await p.click('[data-act="create"]'); await p.waitForTimeout(100);
check(log.some(x => x === "create 우리 집 장보기 2 1"), "가족 공간 만들기에 이 기기 목록이 안 실림: " + log.join(" / "));
await p.click("#acctClose");
await p.evaluate(() => {
  const ok = (...a) => { __log(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ")); return Promise.resolve(); };
  TOBUY.enterFamily({ id: "F", name: "햇살이네", invite: "inv", members: [{ uid: "u", name: "테스트" }, { uid: "v", name: "가족" }] },
    { saveStores: s => ok("stores", s.map(x => x.name).join(",")), addItem: i => ok("add", i.t, i.s, i.by), updateItem: (id, f) => ok("upd", f), deleteItem: id => ok("del") });
  TOBUY.applyFamily({ stores: [{ id: "daiso", name: "다이소", c: 0 }, { id: "emart", name: "이마트", c: 1 }, { id: "mart", name: "동네마트", c: 3 }] });
  TOBUY.applyItems([{ id: "a1", t: "가족이 적은 두부", s: "mart", due: "", done: false, at: 1, by: "v", byName: "가족" },
    { id: "a2", t: "내가 적은 콩나물", s: "mart", due: "", done: false, at: 2, by: "u", byName: "테스트" }]);
});
check(/햇살이네 · 2명/.test(await p.textContent("#acctBtn")), "가족 이름·인원 표시 이상: " + await p.textContent("#acctBtn"));
check(await p.locator('li:has-text("이 기기 물건")').count() === 0, "가족 공간에 들어갔는데 이 기기 목록이 섞여 보임");
check(await p.locator('li:has-text("두부") .by').count() === 1 && await p.locator('li:has-text("콩나물") .by').count() === 0, "누가 적었는지 표시가 이상함(가족 것에만 붙어야)");
check(/동네마트/.test(await p.textContent("#addStores")), "가족이 바꾼 가게가 화면에 안 옴");
// 보내기
await p.locator('#addStores .chip:has-text("동네마트")').click(); await add("라면");
check(log.some(x => x === "add 라면 mart u"), "담기가 가족 공간으로 안 감: " + log.join(" / "));
await p.locator('li:has-text("두부") .box').click(); await p.waitForTimeout(350);
check(log.some(x => /^upd .*"done":true/.test(x)), "체크가 가족 공간으로 안 감");
await p.click("#bought summary"); await p.click("#boughtList .del");
check(log.some(x => x === "del"), "지우기가 가족 공간으로 안 감");
await p.click("#storesBtn"); await p.fill("#storeNew", "약국"); await p.click("#storeAdd button"); await p.click("#storeClose");
check(log.some(x => x === "stores 다이소,이마트,동네마트,약국"), "가게 고치기가 가족 공간으로 안 감");
// 가족이 체크한 것이 옴
await p.evaluate(() => TOBUY.applyItems([{ id: "a2", t: "내가 적은 콩나물", s: "mart", due: "", done: true, doneAt: 5, at: 2, by: "u", byName: "테스트" }]));
check(await p.locator(".items li").count() === 0 && /산 것 1개/.test(await p.textContent("#boughtTitle")), "가족이 체크한 것이 화면에 안 옴");
check(await p.evaluate(() => JSON.parse(localStorage.getItem("tobuy-data")).items.length) === 1, "가족 공간 목록이 이 기기 저장 칸을 덮어씀");
// 초대 QR · 링크
await p.click("#acctBtn");
check(await p.locator("#qrBox svg").count() === 1, "초대 QR이 안 그려짐");
check((await p.locator(".members span").allTextContents()).join("|") === "테스트|가족", "가족 이름이 안 나옴");
await p.click('[data-act="copy"]'); await p.waitForTimeout(100);
check(/\?join=F\.inv$/.test(await p.evaluate(() => navigator.clipboard.readText())), "초대 링크 복사가 안 됨");
await noOverflow(p, "가족 공간 창");
await p.screenshot({ path: "family_390.png" });
// 나가기(두 번 눌러야) → 이 기기 목록으로
await p.click("details.more summary"); await p.click("#leaveBtn"); await p.click("#leaveBtn"); await p.waitForTimeout(100);
await p.click("#acctClose");
check(await p.locator('li:has-text("이 기기 물건")').count() === 1 && !/동네마트/.test(await p.textContent("#addStores")), "나간 뒤 이 기기 목록으로 안 돌아옴");
check(/이 기기에 저장/.test(await p.textContent("#conn")), "나간 뒤 저장 상태 글이 안 바뀜");
// 초대받아 온 사람: 로그인 창이 먼저 뜸
await p.evaluate(() => TOBUY.setAccount({ phase: "out", joining: true }));
check(await p.locator("#acctDlg").evaluate(d => d.open) && /초대를 받았어요/.test(await p.textContent("#acctBody")), "초대 링크로 왔을 때 로그인 안내가 안 뜸");
await finish();
