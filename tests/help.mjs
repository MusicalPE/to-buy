// 사용 안내: 단추 자리(제목 줄 · 설정 맨 위), 창 열기 · 항목 수 · 닫기(Esc · 닫기 · 확인 · 바깥), 휴대폰에서 넘치지 않는지, 미리보기 안에서는 예시 링크 숨김
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const ITEMS = 8;
for (const [w, h] of [[390, 844], [320, 568], [1100, 800]]){
  const p = await newPage(w, "light", h);
  await p.goto(PAGE); await p.waitForTimeout(500);
  const open = () => p.locator("#helpDlg").evaluate(d => d.open);
  check(await p.locator(".top > .tb-help-btn").count() === 1 && await p.locator(".top > .tb-help-btn").isVisible(), `[${w}] 제목 줄에 사용 안내 단추가 없음`);
  check(await p.locator(".top > .tb-help-btn .tb-help-dot").textContent() === "?" && /사용 안내/.test(await p.locator(".top > .tb-help-btn").textContent()), `[${w}] 단추 모양(? + 사용 안내)이 다름`);
  check((await p.locator(".top > .tb-help-btn").boundingBox()).height >= 44, `[${w}] 단추 높이가 44px보다 작음`);
  check(await p.evaluate(() => { const b = document.querySelector(".top > .tb-help-btn").getBoundingClientRect(), t = document.querySelector(".top").getBoundingClientRect(); return b.right > t.right - 2; }), `[${w}] 단추가 제목 줄 오른쪽 끝에 있지 않음`);
  check(await p.locator(".tb-help-dot").count() === 2 && await p.evaluate(() => [...document.querySelectorAll("[class]")].filter(e => e.className.toString().split(/\s+/).includes("tb-help-dot")).every(e => e.closest(".tb-help-btn"))), `[${w}] 동그라미 class가 다른 곳에도 쓰임`);
  await noOverflow(p, `[${w}] 단추가 들어간 첫 화면`);
  // 제목 줄 단추 → 창
  await p.click(".top > .tb-help-btn");
  check(await open() && await p.textContent("#helpTitle") === "사야지! 간략 사용법", `[${w}] 사용 안내 창이 안 열리거나 제목이 다름`);
  check(await p.locator("#helpList > li").count() === ITEMS && await p.locator("#helpList > li .tb-help-num").count() === ITEMS, `[${w}] 항목 수가 ${ITEMS}개가 아님`);
  check(await p.evaluate(() => [...document.querySelectorAll("#helpList > li")].every(li => { const n = li.querySelectorAll("ul > li").length; return li.querySelector("b").textContent.trim() && n >= 2 && n <= 3; })), `[${w}] 항목마다 제목 + 글머리표 2~3줄이 아님`);
  check(await p.locator("#helpDemo").isVisible() && await p.getAttribute("#helpDemo", "target") === "_blank" && /\?demo$/.test(await p.getAttribute("#helpDemo", "href")), `[${w}] 예시로 미리 눌러 보기 링크가 이상함`);
  check(await p.evaluate(() => { const r = document.getElementById("helpDlg").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }), `[${w}] 창이 화면 밖으로 잘림`);
  check(await p.evaluate(() => { const b = document.querySelector(".tb-help-body"); return b.scrollHeight <= b.clientHeight + 1 || getComputedStyle(b).overflowY === "auto"; }), `[${w}] 긴 안내가 창 안에서 스크롤되지 않음`);
  await noOverflow(p, `[${w}] 사용 안내 창`);
  if (w === 390) await p.screenshot({ path: "help_390.png" });
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  check(!(await open()), `[${w}] Esc로 안 닫힘`);
  // 설정 맨 위 단추 → 창, 닫기 · 확인 · 바깥 누르기
  await p.click('.tabbar button[data-tab="set"]');
  check(await p.locator("#viewSet > .tb-help-row:first-child .tb-help-btn").isVisible(), `[${w}] 설정 맨 위에 사용 안내 단추가 없음`);
  check(await p.locator(".tabbar button").count() === 3, `[${w}] 아래 메뉴 칸 수가 달라짐`);
  await p.click("#viewSet .tb-help-btn"); check(await open(), `[${w}] 설정의 단추로 창이 안 열림`);
  await p.click("#helpX"); check(!(await open()), `[${w}] 닫기로 안 닫힘`);
  await p.click("#viewSet .tb-help-btn"); await p.click("#helpOk"); check(!(await open()), `[${w}] 확인으로 안 닫힘`);
  await p.click("#viewSet .tb-help-btn"); await p.mouse.click(3, 3); await p.waitForTimeout(100);
  check(!(await open()), `[${w}] 바깥을 눌러도 안 닫힘`);
}
// 미리보기 안에서는 예시 링크 숨김
const d = await newPage(390);
await d.goto(PAGE + "?demo"); await d.waitForTimeout(600);
await d.click(".top > .tb-help-btn");
check(await d.locator("#helpDlg").evaluate(x => x.open) && await d.locator("#helpDemo").isHidden() && await d.locator("#helpOk").isVisible(), "미리보기 안에서 예시 링크가 보이거나 확인 단추가 없음");
await finish();
