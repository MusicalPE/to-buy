// 미리보기(?demo): 로그인 없이 뜨는지, 이 기기 목록을 건드리지 않는지, 넓은 화면·어두운 화면
import { PAGE, newPage, check, noOverflow, finish } from "./_common.mjs";
const p = await newPage(390);
await p.goto(PAGE + "?demo"); await p.waitForTimeout(600);
check(/햇살이네 장보기 · 2명/.test(await p.textContent("#acctBtn")), "미리보기 가족 이름이 안 나옴: " + await p.textContent("#acctBtn"));
check(/3개/.test(await p.textContent("#urgentTitle")), "미리보기 급해요가 3개가 아님: " + await p.textContent("#urgentTitle"));
check(await p.locator(".store").count() === 4, "미리보기 가게 묶음이 4개가 아님");
check(await p.textContent("#conn") === "미리보기", "미리보기 표시가 안 나옴");
await p.fill("#addText", "미리보기 물건"); await p.click("#addForm button[type=submit]");
await p.locator(".items .box").first().click(); await p.waitForTimeout(350);
check(await p.evaluate(() => localStorage.getItem("tobuy-data")) === null, "미리보기가 이 기기 목록을 건드림");
await noOverflow(p, "미리보기 휴대폰");
await p.goto(PAGE + "?demo"); await p.waitForTimeout(600);
await p.screenshot({ path: "demo_390.png", fullPage: true });
for (const [w, scheme] of [[1100, "light"], [390, "dark"], [320, "light"]]){
  const q = await newPage(w, scheme);
  await q.goto(PAGE + "?demo"); await q.waitForTimeout(600);
  await noOverflow(q, `미리보기 ${w}px ${scheme}`);
  await q.screenshot({ path: `demo_${w}_${scheme}.png`, fullPage: true });
}
await finish();
