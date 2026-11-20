// 넓은 화면(1100px 이상): 왼쪽에 적는 칸·급한 물건, 오른쪽에 가게 묶음 바둑판, 위 가운데 알약 메뉴. 휴대폰은 예전 그대로
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const box = (p, sel) => p.locator(sel).first().boundingBox();
for (const [w, h] of [[1440, 900], [1180, 800]]){
  const p = await newPage(w, "light", h);
  await p.goto(PAGE + "?demo"); await p.waitForTimeout(600);
  const form = await box(p, "#addForm"), urg = await box(p, "#urgent"), first = await box(p, "#list .store"), menu = await box(p, ".tabbar");
  check(form.x < first.x && urg.x < first.x && form.x + form.width <= first.x, `[${w}] 적는 칸·급해요가 왼쪽에 있지 않음`);
  check(await p.evaluate(() => new Set([...document.querySelectorAll("#list .store")].map(e => Math.round(e.getBoundingClientRect().top))).size < document.querySelectorAll("#list .store").length), `[${w}] 가게 묶음이 바둑판으로 놓이지 않음`);
  check(menu.y < 80 && menu.x > form.x + form.width, `[${w}] 메뉴가 오른쪽 위에 있지 않음`);
  await noOverflow(p, `[${w}] 넓은 화면 장바구니`);
  // 내역 · 설정 탭에서도 왼쪽 적는 칸이 보이고, 담으면 장바구니에 들어감
  await p.click('.tabbar button[data-tab="log"]');
  check(await p.locator("#viewLog").isVisible() && await p.locator("#addForm").isVisible() && await p.locator('.tabbar button[data-tab="log"]').getAttribute("aria-current") === "page", `[${w}] 내역 탭에서 왼쪽 적는 칸이 안 보이거나 메뉴 표시가 이상함`);
  const card = await box(p, "#viewLog > .card"), list = await box(p, "#recList");
  check(list.x > card.x + card.width - 1, `[${w}] 내역이 두 칸(합계 · 목록)으로 안 나뉨`);
  await p.fill("#addText", "넓은 화면에서 담은 물건"); await p.click("#addForm button[type=submit]");
  await p.click('.tabbar button[data-tab="home"]');
  check(await p.locator('#list li:has-text("넓은 화면에서 담은 물건")').count() === 1, `[${w}] 내역 탭에서 담은 물건이 장바구니에 안 들어감`);
  await p.click('.tabbar button[data-tab="set"]');
  check(await p.locator("#famCard").isVisible() && await p.locator("#addForm").isVisible(), `[${w}] 설정 탭 모습이 이상함`);
  await noOverflow(p, `[${w}] 넓은 화면 설정`);
  // 옆 칸은 목록이 길어도 화면에 붙어 있음
  await p.click('.tabbar button[data-tab="home"]');
  await p.evaluate(() => { for (let k = 0; k < 30; k++) addItems("긴 목록 " + k); });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(150);
  const side = await box(p, ".lay-side");
  check(side.y >= 0 && side.y < 40, `[${w}] 아래로 내려도 왼쪽 칸이 따라오지 않음`);
  if (w === 1440) await p.screenshot({ path: "wide_1440.png" });
}
// 휴대폰은 예전 그대로: 한 줄, 아래 메뉴, 내역·설정 탭에서는 적는 칸이 안 보임
const m = await newPage(390);
await m.goto(PAGE + "?demo"); await m.waitForTimeout(500);
const f = await box(m, "#addForm"), s = await box(m, "#list .store"), t = await box(m, ".tabbar");
check(Math.abs(f.x - s.x) < 2 && s.y > f.y && t.y > 700, "휴대폰 배치가 달라짐");
await m.click('.tabbar button[data-tab="log"]');
check(await m.locator("#addForm").isHidden() && await m.locator("#urgent").isHidden(), "휴대폰 내역 탭에 적는 칸이 보임");
await finish();
