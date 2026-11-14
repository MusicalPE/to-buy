// 이 기기에서 쓰기(로그인 없이): 담기부터 가게 고치기까지 한 번씩 밟아 봄
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const p = await newPage(390);
await p.goto(PAGE); await p.waitForTimeout(500);
const rows = sel => p.locator(sel).allTextContents();
const store = name => p.locator(`.store:has(h2:text-matches("^${name}"))`);
const add = async t => { await p.fill("#addText", t); await p.click("#addForm button[type=submit]"); };
const tab = t => p.click(`.tabbar button[data-tab="${t}"]`);
const pickStore = name => p.locator(`#addStores .chip:has-text("${name}")`).click();

check(/이 기기에 저장/.test(await p.textContent("#conn")), "파이어베이스 설정이 비었을 때 '이 기기에 저장'이 안 나옴");
check(await p.locator("#viewHome").isVisible() && await p.locator("#viewLog").isHidden() && await p.locator("#viewSet").isHidden(), "처음에 장바구니 탭이 아님");
check((await rows("#addStores .chip")).join("|") === "다이소|이마트|아무 데서나", "기본 가게가 다이소·이마트·아무 데서나가 아님");
check(await p.locator("#list .empty").count() === 1, "처음에 빈 안내가 안 나옴");

// 담기: 쉼표로 여러 개, 가게 고르기
await pickStore("이마트"); await add("우유, 계란");
check(await store("이마트").locator("li").count() === 2, "쉼표로 두 개 담기가 안 됨");
await add("우유");
check(await store("이마트").locator("li").count() === 2, "같은 가게에 같은 물건이 두 번 들어감");
check(await p.inputValue("#addText") === "", "담은 뒤 칸이 안 비워짐");

// 기한과 급해요
await pickStore("다이소"); await p.locator('#addDue .chip:has-text("내일")').click(); await add("건전지");
check(await p.locator("#urgent").isVisible() && /1개/.test(await p.textContent("#urgentTitle")), "내일까지인 물건이 급해요에 안 나옴");
check(/내일까지/.test(await store("다이소").locator("li").first().textContent()), "기한 표시가 안 붙음");
check(await p.locator('#addDue .chip[aria-pressed="true"]').textContent() === "기한 없음", "담은 뒤 기한이 '없음'으로 안 돌아감");
await add("수세미");
check(/살 것 4개 · 급한 것 1개/.test((await p.textContent("#tally")).replace(/\s+/g, " ")), "개수 표시 이상: " + await p.textContent("#tally"));
// 날짜를 직접 고르기
await p.locator('#addDue input[type=date]').fill(await p.evaluate(() => ymd(dayFrom(3)))); await add("지퍼백");
check(/요일까지/.test(await store("다이소").locator('li:has-text("지퍼백")').textContent()), "날짜로 고른 기한이 안 붙음");

// 체크 → 산 것, 되돌리기
await store("이마트").locator('li:has-text("우유") .box').click(); await p.waitForTimeout(350);
check(await store("이마트").locator("li").count() === 1 && /산 것 1개/.test(await p.textContent("#boughtTitle")), "체크해도 산 것으로 안 내려감");
await p.click("#toastUndo");
check(await store("이마트").locator("li").count() === 2 && await p.locator("#bought").isHidden(), "되돌리기가 안 됨");
// 다시 담기
await store("이마트").locator('li:has-text("우유") .box').click(); await p.waitForTimeout(350);
await p.click("#bought summary"); await p.click("#boughtList .again");
check(await store("이마트").locator("li").count() === 2, "다시 담기가 안 됨");
// 전에 산 물건을 다시 적으면 그 줄이 살아남(두 줄이 되지 않음)
await store("이마트").locator('li:has-text("계란") .box').click(); await p.waitForTimeout(350);
await pickStore("다이소"); await add("계란");
check(await p.locator("#bought").isHidden() && await store("다이소").locator('li:has-text("계란")').count() === 1, "전에 산 물건을 다시 적었을 때 산 것에 그대로 남음");
// 급해요에서 체크
await p.locator("#urgentList .box").first().click(); await p.waitForTimeout(350);
check(await p.locator("#urgent").isHidden(), "급해요에서 체크해도 안 없어짐");
await p.click("#toastUndo");

// 고치기: 이름·가게·기한
await store("다이소").locator('li:has-text("수세미") .name').click();
await p.fill("#itemText", "수세미 3개"); await p.locator('#itemStores .chip:has-text("아무 데서나")').click(); await p.locator('#itemDue .chip:has-text("오늘")').click(); await p.click("#itemSave");
check(/수세미 3개/.test(await store("아무 데서나").textContent()) && /오늘까지/.test(await store("아무 데서나").textContent()), "고치기가 안 됨");
check(/2개/.test(await p.textContent("#urgentTitle")), "오늘까지로 바꿨는데 급해요에 안 들어옴");
// 지우기(두 번 눌러야)
await store("다이소").locator('li:has-text("지퍼백") .name').click();
await p.click("#itemDelete"); check(await p.locator("#itemDlg").evaluate(d => d.open), "지우기를 한 번만 눌렀는데 지워짐");
await p.click("#itemDelete");
check(await p.locator('li:has-text("지퍼백")').count() === 0, "지우기가 안 됨");

// 설정 탭 — 가게 고치기: 더하기 · 이름 · 색 · 순서 · 지우기
await tab("set");
check(await p.locator("#viewSet").isVisible() && await p.locator("#viewHome").isHidden() && await p.locator('.tabbar button[data-tab="set"]').getAttribute("aria-current") === "page", "설정 탭으로 안 바뀜");
check(await p.locator("#newsBody .news-item").count() >= 1 && await p.locator("#newsDot").isHidden(), "업데이트 소식이 안 나오거나, 본 뒤에도 점이 남음");
check(/v\d+\.\d+\.\d+/.test(await p.textContent("#ver")), "설정에 판 번호가 안 나옴"); await p.fill("#storeNew", "약국"); await p.click("#storeAdd button");
check(await p.locator("#storeRows .srow").count() === 3, "가게 더하기가 안 됨");
await p.locator("#storeRows .srow >> nth=2 >> input").fill("동네 약국"); await p.locator("#storeRows .srow >> nth=2 >> input").blur();
await p.locator("#storeRows .srow >> nth=2 >> .swatch").click();
await p.locator("#storeRows .srow >> nth=2 >> .up").click();
await noOverflow(p, "설정 탭");
await p.screenshot({ path: "set_390.png", fullPage: true });
check((await p.locator("#storeRows input").evaluateAll(a => a.map(x => x.value))).join("|") === "다이소|동네 약국|이마트", "가게 이름·순서 바꾸기가 안 됨");
await tab("home");
check((await rows("#addStores .chip")).join("|") === "다이소|동네 약국|이마트|아무 데서나", "가게 고친 것이 고르는 칸에 안 나옴");
check(await p.locator('#addStores .chip[aria-pressed="true"]').textContent() === "동네 약국", "새로 더한 가게가 바로 골라지지 않음");
await add("밴드");
await tab("set"); const del = p.locator("#storeRows .srow >> nth=1 >> .del"); await del.click(); await p.locator("#storeRows .srow >> nth=1 >> .del").click(); await tab("home");
check(await p.locator('.store:has(h2:text-matches("^동네 약국"))').count() === 0 && /밴드/.test(await store("아무 데서나").textContent()), "가게를 지웠을 때 물건이 아무 데서나로 안 감");

// 단추가 다음 줄로 넘어가도 "어디서" 글자 아래로 들어가지 않는지
await p.evaluate(() => { ["하나로마트", "동네 정육점", "과일가게"].forEach(addStore); });
check(await p.evaluate(() => { const c = [...document.querySelectorAll("#addStores .chip")].map(x => x.getBoundingClientRect()); const rows = new Set(c.map(r => Math.round(r.top))); return rows.size >= 2 && c.every(r => Math.round(r.left) >= Math.round(c[0].left)); }), "넘어간 가게 단추가 첫 단추와 줄이 안 맞음");
await p.screenshot({ path: "wrap_390.png" });
await p.evaluate(() => { stores.filter(s => ["하나로마트", "동네 정육점", "과일가게"].includes(s.name)).map(s => s.id).forEach(removeStore); setPick("emart"); render(); });
// 기한 단추: 이번 주, 고치기(빼기·더하기·며칠 뒤)
const dueChips = async () => (await rows("#addDue .chip")).map(x => x.trim()).join("|");
check(await dueChips() === "기한 없음|오늘|내일|이번 주|날짜", "기본 기한 단추가 오늘·내일·이번 주가 아님: " + await dueChips());
await pickStore("이마트"); await p.locator('#addDue .chip:has-text("이번 주")').click(); await add("주간 물건");
check(await p.evaluate(() => items.find(i => i.t === "주간 물건").due === ymd(dayFrom((7 - new Date().getDay()) % 7))), "이번 주가 이번 주 일요일로 안 들어감");
await tab("set");
await p.locator('#dueRows label:has-text("내일") .box').click(); await p.locator('#dueRows label:has-text("모레") .box').click();
await p.fill("#dueNew", "10"); await p.click("#dueAdd button");
check(await p.locator('#dueRows label:has-text("10일 뒤") .box').isChecked(), "며칠 뒤 더하기가 설정에 안 나옴");
await tab("home");
check(await dueChips() === "기한 없음|오늘|모레|이번 주|10일 뒤|날짜", "기한 단추 고치기가 안 됨: " + await dueChips());
await p.locator('#addDue .chip:has-text("10일 뒤")').click(); await add("열흘 물건");
check(await p.evaluate(() => items.find(i => i.t === "열흘 물건").due === ymd(dayFrom(10))), "10일 뒤 단추의 날짜가 틀림");
await p.reload(); await p.waitForTimeout(400);
check(await dueChips() === "기한 없음|오늘|모레|이번 주|10일 뒤|날짜", "고친 기한 단추가 새로고침 뒤에 안 남음");
await tab("set"); await p.locator('#dueRows label:has-text("10일 뒤") .box').click(); await tab("home");
check(!/10일 뒤/.test(await dueChips()), "직접 더한 기한 단추 빼기가 안 됨");
await p.locator('.store:has(h2:text-matches("^이마트")) li:has-text("주간 물건") .name').click(); await p.click("#itemDelete"); await p.click("#itemDelete");
await p.locator('.store:has(h2:text-matches("^이마트")) li:has-text("열흘 물건") .name').click(); await p.click("#itemDelete"); await p.click("#itemDelete");

// 여기서 장보기
await store("다이소").locator(".go").click();
check(await p.locator("#shopbar").isVisible() && /다이소에서/.test(await p.textContent("#shopTitle")), "여기서 장보기 띠가 안 나옴");
check(await store("이마트").count() === 0 && await store("아무 데서나").count() === 1 && await p.locator("#urgent").isHidden(), "여기서 장보기에서 다른 가게가 보이거나 아무 데서나가 안 보임");
await add("테이프"); check(/테이프/.test(await store("다이소").textContent()), "장보는 중에 담은 물건이 그 가게로 안 감");
await noOverflow(p, "여기서 장보기");
await p.screenshot({ path: "shop_390.png" });
await p.click("#shopExit"); check(await p.locator("#shopbar").isHidden() && await store("이마트").count() === 1, "전체 보기로 안 돌아옴");

// 새로고침 뒤에도 남는지, 지난 기한 표시
const before = await p.locator(".items li").count();
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("tobuy-data")); d.items.find(i => i.t === "테이프").due = ymd(dayFrom(-2)); localStorage.setItem("tobuy-data", JSON.stringify(d)); });
await p.reload(); await p.waitForTimeout(400);
check(await p.locator(".items li").count() === before, "새로고침하면 목록이 달라짐");
check(/2일 지남/.test(await p.textContent("#urgentList")), "지난 기한이 급해요에 '지남'으로 안 나옴");
// 산 것 모두 지우기
await store("이마트").locator(".box").first().click(); await p.waitForTimeout(350);
await p.click("#bought summary"); await p.click("#boughtClear"); await p.click("#boughtClear");
check(await p.locator("#bought").isHidden(), "산 것 모두 지우기가 안 됨");
// 설정의 가족 칸(연결 전)
await tab("set"); check(await p.locator("#famCard").isVisible() && /이 기기에만/.test(await p.textContent("#acctBody")), "연결 전 가족 칸 안내가 안 나옴"); await tab("home");
// 아래 메뉴가 목록 마지막 줄을 가리지 않는지
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
check(await p.evaluate(() => { const a = document.querySelector("#viewHome").getBoundingClientRect().bottom, b = document.querySelector(".tabbar .tab-main").getBoundingClientRect().top; return a <= b; }), "아래 메뉴가 목록 끝을 가림");
await noOverflow(p, "휴대폰 전체 보기");
await p.screenshot({ path: "basic_390.png", fullPage: true });
await finish();
