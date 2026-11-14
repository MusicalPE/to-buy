// 가족 공간 흉내: 화면이 가족 쪽으로 보내는 것과, 가족이 바꾼 것이 화면에 오는 것
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const p = await newPage(390);
await p.goto(PAGE); await p.waitForTimeout(500);
const tab = t => p.click(`.tabbar button[data-tab="${t}"]`);
const add = async t => { await p.fill("#addText", t); await p.click("#addForm button[type=submit]"); };
// 로그인 전 이 기기에 적어 둔 것
await add("이 기기 물건");
const log = [];
await p.exposeFunction("__log", x => log.push(x));
await p.evaluate(() => {
  const ok = (...a) => { __log(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ")); return Promise.resolve(); };
  window.FBAPP = { login: async () => {}, logout: async () => {}, leaveFamily: async () => { TOBUY.leaveFamily(); TOBUY.setAccount({ phase: "nofamily", user: { uid: "u", name: "테스트" } }); },
    deleteAccount: async () => {}, createFamily: (n, d, items, recs) => ok("create", n, d.stores.length, items.length, recs.length) };
  TOBUY.setAccount({ phase: "nofamily", user: { uid: "u", name: "테스트" } });
});
await tab("set");
check(/가족 공간 만들기/.test(await p.textContent("#acctTitle")), "로그인 뒤 '가족 공간 만들기'가 안 나옴");
await p.click('[data-act="create"]'); await p.waitForTimeout(100);
check(log.some(x => x === "create 우리 집 장보기 2 1 0"), "가족 공간 만들기에 이 기기 목록이 안 실림: " + log.join(" / "));
await tab("home");
await p.evaluate(() => {
  const ok = (...a) => { __log(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ")); return Promise.resolve(); };
  TOBUY.enterFamily({ id: "F", name: "햇살이네", invite: "inv", members: [{ uid: "u", name: "테스트" }, { uid: "v", name: "가족" }] },
    { saveStores: s => ok("stores", s.map(x => x.name).join(",")), saveDues: d => ok("dues", d.join(",")), addItem: i => ok("add", i.t, i.s, i.by), updateItem: (id, f) => ok("upd", f), deleteItem: id => ok("del"), addReceipt: r => ok("addRec", r.s, r.total, r.items.length), updateReceipt: (id, f) => ok("updRec", f), deleteReceipt: id => ok("delRec"), saveAiKey: k => ok("aiKey", k), bumpTrial: () => ok("bump") });
  TOBUY.applyFamily({ stores: [{ id: "daiso", name: "다이소", c: 0 }, { id: "emart", name: "이마트", c: 1 }, { id: "mart", name: "동네마트", c: 3 }] });
  TOBUY.applyItems([{ id: "a1", t: "가족이 적은 두부", s: "mart", due: "", done: false, at: 1, by: "v", byName: "가족" },
    { id: "a2", t: "내가 적은 콩나물", s: "mart", due: "", done: false, at: 2, by: "u", byName: "테스트" }]);
});
check(/가족 2명/.test(await p.textContent("#conn")), "가족 인원 표시 이상: " + await p.textContent("#conn"));
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
await tab("set"); await p.fill("#storeNew", "약국"); await p.click("#storeAdd button");
check(log.some(x => x === "stores 다이소,이마트,동네마트,약국"), "가게 고치기가 가족 공간으로 안 감");
// 기한 단추 고치기도 가족과 함께
await p.locator('#dueRows label:has-text("다음 주") .box').click();
check(log.some(x => x === "dues today,tomorrow,week,nextweek"), "기한 단추 고치기가 가족 공간으로 안 감: " + log.filter(x => x.startsWith("dues")).join(" / "));
await p.evaluate(() => TOBUY.applyFamily({ stores: [{ id: "mart", name: "동네마트", c: 3 }], dues: ["today", "month"] }));
check((await p.locator("#addDue .chip").allTextContents()).map(x => x.trim()).join("|") === "기한 없음|오늘|이번 달|날짜", "가족이 고친 기한 단추가 화면에 안 옴");
check((await p.locator("#storeRows input").evaluateAll(a => a.map(x => x.value))).join("|") === "동네마트" && await p.locator('#dueRows label:has-text("이번 달") .box').isChecked(), "가족이 고친 가게·기한 단추가 설정 탭에 안 옴");
await tab("home");
// 가족이 체크한 것이 옴
await p.evaluate(() => TOBUY.applyItems([{ id: "a2", t: "내가 적은 콩나물", s: "mart", due: "", done: true, doneAt: 5, at: 2, by: "u", byName: "테스트" }]));
check(await p.locator(".items li").count() === 0 && /산 것 1개/.test(await p.textContent("#boughtTitle")), "가족이 체크한 것이 화면에 안 옴");
check(await p.evaluate(() => JSON.parse(localStorage.getItem("tobuy-data")).items.length) === 1, "가족 공간 목록이 이 기기 저장 칸을 덮어씀");
// 내역: 가족 공간으로 보내고, 가족이 넣은 내역이 옴
await tab("log");
await p.click("#manualBtn"); await p.locator('#recStores .chip:has-text("동네마트")').click(); await p.fill("#recTotal", "12300"); await p.click("#recSave");
check(log.some(x => x === "addRec mart 12300 0"), "내역이 가족 공간으로 안 감: " + log.filter(x => /Rec/.test(x)).join(" / "));
await p.evaluate(() => TOBUY.applyReceipts([{ id: "r9", date: today(), s: "mart", sn: "", total: 5000, items: [{ n: "두부", p: 5000 }], at: 1, by: "v", byName: "가족" }]));
check(/5,000원/.test(await p.textContent("#monSum")) && await p.locator("#recList li[data-id]").count() === 1, "가족이 넣은 내역이 화면에 안 옴");
// 영수증 읽기: 무료 체험(앱의 AI) → 다 쓰면 키 안내
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
await p.evaluate(() => { window.TOBUY_AI = { models: ["m1"], trial: 3 }; FBAPP.aiReady = true;
  FBAPP.aiBuiltin = async (name, parts) => { __log("builtin " + name + " " + (parts[1] && parts[1].inlineData ? "사진" : "없음")); return JSON.stringify({ ok: true, store: "동네마트 햇살점", date: today(), total: 8800, items: [{ name: "라면 x5", price: 4400 }, { name: "김", price: 4400 }] }); };
  TOBUY.updateFamilyInfo({ aiTrialUsed: 2 }); });
await p.click("#scanBtn"); await p.setInputFiles("#scanFile", { name: "r.png", mimeType: "image/png", buffer: png });
await p.waitForSelector("#recDlg[open]");
check(log.some(x => x === "builtin m1 사진") && log.some(x => x === "bump"), "체험 중 앱의 AI로 읽기·체험 횟수 올리기가 안 됨: " + log.slice(-4).join(" / "));
check(await p.locator('#recStores .chip[aria-pressed="true"]').textContent() === "동네마트" && await p.inputValue("#recTotal") === "8800" && await p.locator("#recItems .irow").count() === 2, "읽은 내용이 확인 창에 제대로 안 들어감");
check(await p.locator("#recPhoto").isVisible(), "확인 창에 찍은 사진이 안 보임");
await p.click("#recSave");
check(log.some(x => x === "addRec mart 8800 2"), "확인한 영수증이 가족 공간으로 안 감");
check(await p.locator("#recPhoto").getAttribute("src") === null, "확인한 뒤에도 사진이 남아 있음");
await p.click("#scanBtn");
check(await p.locator("#viewSet").isVisible() && /무료 체험을 다 썼어요/.test(await p.textContent("#aiState")), "체험을 다 쓴 뒤 키 안내로 안 감");
await p.evaluate(() => TOBUY.updateFamilyInfo({ freeAI: true }));
check(/앱의 AI로 읽어요/.test(await p.textContent("#aiState")) && await p.locator("#aiKeyBox").isHidden(), "우리 가족(앱의 AI 그대로) 표시가 안 나옴");
await tab("home");
// 초대 QR · 링크
await tab("set");
check(await p.textContent("#acctTitle") === "햇살이네", "설정의 가족 칸에 가족 이름이 안 나옴");
check(await p.locator("#qrBox svg").count() === 1, "초대 QR이 안 그려짐");
check((await p.locator(".members span").allTextContents()).join("|") === "테스트|가족", "가족 이름이 안 나옴");
await p.click('[data-act="copy"]'); await p.waitForTimeout(100);
check(/\?join=F\.inv$/.test(await p.evaluate(() => navigator.clipboard.readText())), "초대 링크 복사가 안 됨");
await noOverflow(p, "설정의 가족 칸");
await p.screenshot({ path: "family_390.png", fullPage: true });
// 나가기(두 번 눌러야) → 이 기기 목록으로
await p.click("details.more summary"); await p.click("#leaveBtn"); await p.click("#leaveBtn"); await p.waitForTimeout(100);
check(/가족 공간 만들기/.test(await p.textContent("#acctTitle")), "나간 뒤 가족 칸이 안 바뀜");
await tab("home");
check(await p.locator('li:has-text("이 기기 물건")').count() === 1 && !/동네마트/.test(await p.textContent("#addStores")), "나간 뒤 이 기기 목록으로 안 돌아옴");
check(/이 기기에 저장/.test(await p.textContent("#conn")), "나간 뒤 저장 상태 글이 안 바뀜");
// 초대받아 온 사람: 로그인 창이 먼저 뜸
await p.evaluate(() => TOBUY.setAccount({ phase: "out", joining: true }));
check(await p.locator("#viewSet").isVisible() && /초대를 받았어요/.test(await p.textContent("#acctBody")), "초대 링크로 왔을 때 설정의 로그인 안내가 안 뜸");
await finish();
