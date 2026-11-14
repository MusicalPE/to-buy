/* 사야지! 미리보기 (주소 끝에 ?demo)
   로그인 없이 지어낸 가족의 장보기 목록을 보여 줌.
   파이어베이스 대신 이 창 안에서만 움직이고, 새로고침하면 처음으로 돌아감.
   화면 쪽(index.html)과는 app-firebase.js 와 똑같이 window.TOBUY 로 주고받음
   Made by 음악적체육인 */
const T = () => window.TOBUY;
const ME = { uid: "demo-me", name: "엄마", email: "" };
const DAD = { uid: "demo-2", name: "아빠" };
const pad = n => String(n).padStart(2, "0");
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
let seq = 0;
const now = Date.now();
function item(t, s, due, who, done){
  seq++;
  return { id: "demo" + seq, t, s, due: due || "", done: !!done, doneAt: done ? now - seq * 3600000 : 0, at: now - (100 - seq) * 60000, by: who.uid, byName: who.name };
}
const stores = [
  { id: "daiso", name: "다이소", c: 0 },
  { id: "emart", name: "이마트", c: 1 },
  { id: "pharm", name: "약국", c: 2 }
];
const items = [
  item("우유 2팩", "emart", day(0), ME),
  item("계란 한 판", "emart", "", DAD),
  item("대파", "emart", "", ME),
  item("삼겹살 (주말 손님)", "emart", day(4), DAD),
  item("건전지 AA", "daiso", day(1), DAD),
  item("수세미", "daiso", "", ME),
  item("지퍼백 중간 크기", "daiso", "", ME),
  item("준비물 색종이", "daiso", day(-1), ME),
  item("밴드", "pharm", "", DAD),
  item("택배 상자 테이프", "", "", ME),
  item("휴지", "emart", "", ME, true),
  item("주방 세제", "daiso", "", DAD, true),
  item("두부", "emart", "", ME, true)
];
const ok = () => Promise.resolve();
const remote = { saveStores: ok, addItem: ok, updateItem: ok, deleteItem: ok };
const fam = { id: "demo", name: "햇살이네 장보기", invite: "demo", members: [ME, DAD] };

window.FBAPP = {
  login: ok, logout: async () => { window.toast("미리보기에서는 로그아웃하지 않아요."); },
  leaveFamily: async () => { throw new Error("미리보기에서는 나갈 수 없어요."); },
  deleteAccount: async () => { throw new Error("미리보기에서는 지울 수 없어요."); },
  createFamily: ok
};
T().setAccount({ phase: "loading", user: ME });
T().enterFamily(fam, remote);
T().applyFamily({ stores });
T().applyItems(items);
