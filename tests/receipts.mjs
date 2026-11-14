// 내역: 로그인 없이 직접 적기, 내 AI 키로 영수증 읽기 → 확인 → 사진 버리기, 달별 합계
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const p = await newPage(390);
const tab = t => p.click(`.tabbar button[data-tab="${t}"]`);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const scan = () => p.setInputFiles("#scanFile", { name: "r.png", mimeType: "image/png", buffer: png });
// 구글 Gemini 흉내: 키 확인(GET)과 읽기(POST)
const calls = []; let answer = null, status = 200;
await p.route(/generativelanguage\.googleapis\.com/, async r => {
  const q = r.request(), key = q.headers()["x-goog-api-key"];
  if (q.method() === "GET") return r.fulfill({ status: key === "GOODKEY" ? 200 : 400, contentType: "application/json", body: "{}" });
  const body = JSON.parse(q.postData());
  calls.push({ key, model: q.url().split("/models/")[1], photo: !!(body.contents[0].parts[1] && body.contents[0].parts[1].inlineData && body.contents[0].parts[1].inlineData.data.length > 20) });
  if (status !== 200) return r.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { status: "UNAVAILABLE", message: "overloaded" } }) });
  r.fulfill({ contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "```json\n" + JSON.stringify(answer) + "\n```" }] } }] }) });
});
await p.goto(PAGE); await p.waitForTimeout(500);
const today = await p.evaluate(() => today());

// 내역 탭 처음 모습
await tab("log");
check(await p.locator("#viewLog").isVisible() && /0원/.test(await p.textContent("#monSum")) && await p.locator("#recList .empty").count() === 1, "처음 내역 탭 모습이 이상함");
check(await p.locator("#monNext").isDisabled(), "이번 달인데 다음 달 단추가 눌림");

// 직접 적기
await p.click("#manualBtn");
await p.locator('#recStores .chip:has-text("이마트")').click(); await p.fill("#recTotal", "12300");
await p.click("#recItemAdd"); await p.locator("#recItems .iname").last().fill("우유"); await p.locator("#recItems .iprice").last().fill("2980");
check(/1가지 · 더하면 2,980원/.test(await p.textContent("#recItemsNote")), "산 것 합계 안내가 안 나옴: " + await p.textContent("#recItemsNote"));
await p.click("#recSave");
check(await p.textContent("#monSum") === "12,300원" && /1번/.test(await p.textContent("#monCount")), "직접 적은 내역이 합계에 안 들어감");
check(/이마트/.test(await p.textContent("#recList")) && /우유/.test(await p.textContent("#recList")), "내역 줄에 가게·산 것이 안 나옴");
// 다른 곳(가게 이름 직접)
await p.click("#manualBtn"); await p.locator('#recStores .chip:has-text("다른 곳")').click(); await p.fill("#recStoreName", "동네 과일가게"); await p.fill("#recTotal", "5000"); await p.click("#recSave");
check(await p.textContent("#monSum") === "17,300원" && await p.locator("#monBars .bar").count() === 2 && /동네 과일가게/.test(await p.textContent("#monBars")), "가게별 합계 막대가 이상함");
// 고치기 · 지우기
await p.locator('#recList li:has-text("동네 과일가게") button').click();
check(await p.inputValue("#recStoreName") === "동네 과일가게" && await p.locator("#recDelete").isVisible(), "고치기 창에 적어 둔 내용이 안 나옴");
await p.fill("#recTotal", "7000"); await p.click("#recSave");
check(await p.textContent("#monSum") === "19,300원", "내역 고치기가 안 됨");
await p.locator('#recList li:has-text("동네 과일가게") button').click(); await p.click("#recDelete"); await p.click("#recDelete");
check(await p.textContent("#monSum") === "12,300원" && await p.locator("#recList li[data-id]").count() === 1, "내역 지우기가 안 됨");

// 키 없이 영수증 찍기 → 안내하고 설정으로
await p.click("#scanBtn");
check(await p.locator("#viewSet").isVisible() && /가족 공간에 들어가거나 내 AI 키/.test(await p.textContent("#aiState")), "키가 없을 때 안내가 안 나옴");
// 틀린 키 · 맞는 키
await p.fill("#aiKeyInput", "BADKEY"); await p.click("#aiKeyForm button"); await p.waitForTimeout(200);
check(/연결되지 않아요/.test(await p.textContent("#aiMsg")), "틀린 키인데 저장됨");
await p.fill("#aiKeyInput", "GOODKEY"); await p.click("#aiKeyForm button"); await p.waitForTimeout(200);
check(/내 AI 키로 읽는 중/.test(await p.textContent("#aiState")) && /DKEY/.test(await p.textContent("#aiState")) && await p.locator("#aiKeyClear").isVisible(), "맞는 키 저장이 안 됨");

// 영수증 찍기 → 읽기 → 확인 → 저장하면 사진 버림
await tab("log");
answer = { ok: true, store: "이마트 햇살점", date: today, total: "23,450", items: [{ name: "계란 30구", price: 7990 }, { name: "대파", price: 2980 }, { name: "", price: 1 }, { name: "삼겹살", price: "12,480원" }] };
await p.click("#scanBtn"); await scan(); await p.waitForSelector("#recDlg[open]");
check(calls.length === 1 && calls[0].key === "GOODKEY" && calls[0].photo, "내 키로 사진을 보내 읽지 않음: " + JSON.stringify(calls));
check(await p.locator('#recStores .chip[aria-pressed="true"]').textContent() === "이마트", "영수증 가게 이름이 내 가게와 안 맞춰짐");
check(await p.inputValue("#recTotal") === "23450" && await p.inputValue("#recDate") === today && await p.locator("#recItems .irow").count() === 3, "읽은 내용(합계·날짜·산 것)이 이상함");
check(await p.locator("#recPhoto").isVisible() && /같은지/.test(await p.textContent("#recTitle")) && await p.textContent("#recSave") === "확인했어요", "확인 창에 사진·안내가 안 나옴");
check(/3가지 · 더하면 낸 돈과 같아요/.test(await p.textContent("#recItemsNote")), "산 것 합계가 낸 돈과 같다는 안내가 안 나옴");
await noOverflow(p, "영수증 확인 창");
await p.screenshot({ path: "confirm_390.png" });
await p.fill("#recTotal", "23000"); await p.click("#recSave");
check(await p.textContent("#monSum") === "35,300원" && /2번/.test(await p.textContent("#monCount")), "확인한 영수증이 내역에 안 들어감");
check(await p.locator("#recPhoto").getAttribute("src") === null && await p.inputValue("#scanFile") === "", "확인한 뒤에도 사진이 남아 있음");
check(!/data:image/.test(await p.evaluate(() => localStorage.getItem("tobuy-data"))), "사진이 이 기기에 저장됨");
// 닫기로 그만두면 넣지 않고 사진도 버림
await p.click("#scanBtn"); await scan(); await p.waitForSelector("#recDlg[open]"); await p.click("#recCancel");
check(await p.locator("#recList li[data-id]").count() === 2 && await p.locator("#recPhoto").getAttribute("src") === null, "닫았는데 내역에 들어갔거나 사진이 남음");
// 영수증이 아닌 사진
answer = { ok: false };
await p.click("#scanBtn"); await scan(); await p.waitForTimeout(500);
check(!(await p.locator("#recDlg").evaluate(d => d.open)) && /영수증으로 보이지 않아요/.test(await p.textContent("#toastText")), "영수증이 아닌 사진인데 안내가 안 나옴");
// 모든 모델이 붐빌 때
status = 503; const before = calls.length;
await p.click("#scanBtn"); await scan(); await p.waitForTimeout(700);
check(calls.length - before >= 2 && !(await p.locator("#busyDlg").evaluate(d => d.open)) && /읽지 못했어요/.test(await p.textContent("#toastText")), "붐빌 때 다음 모델로 넘어가지 않거나 안내가 안 나옴");
status = 200;

// 이전 달 · 새로고침 · 가게를 지워도 내역에 이름이 남는지
await p.click("#monPrev");
check(await p.textContent("#monSum") === "0원" && !(await p.locator("#monNext").isDisabled()), "이전 달로 안 넘어감");
await p.click("#monNext");
await p.reload(); await p.waitForTimeout(400); await tab("log");
check(await p.textContent("#monSum") === "35,300원" && /모두 35,300원 · 2번/.test(await p.textContent("#allSum")), "새로고침 뒤 내역이 안 남음");
await tab("set"); await p.locator('#storeRows .srow:has(input[value="이마트"]) .del').click(); await p.locator('#storeRows .srow >> nth=1 >> .del').click(); await tab("log");
check(/이마트/.test(await p.textContent("#monBars")) && await p.textContent("#monSum") === "35,300원", "가게를 지우면 내역의 가게 이름이 사라짐");
// 키 지우기
await tab("set"); await p.click("#aiKeyClear"); await p.click("#aiKeyClear");
check(await p.locator("#aiKeyClear").isHidden() && await p.evaluate(() => !localStorage.getItem("tobuy-aikey")), "키 지우기가 안 됨");
await noOverflow(p, "내역");
await finish();
