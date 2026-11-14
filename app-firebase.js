/* 사야지! To-Buy — 파이어베이스 연결
   - 구글 로그인, 가족 공간(families/{id}) 하나를 가족이 함께 씀
   - 가게 목록은 가족 공간 문서에, 물건은 한 줄씩(families/{id}/items/{물건}), 내역은 families/{id}/receipts/{내역} 에 저장
   - 영수증 읽기: 앱의 AI(Firebase AI Logic + App Check). 사진은 저장하지 않고 읽을 때만 보냄
   - 인터넷이 끊겨도 이 기기에 두었다가 연결되면 올라감
   화면 쪽(index.html)과는 window.TOBUY 로 주고받음
   Made by 음악적체육인 */
import { firebaseConfig } from "./firebase-config.js";
import * as CFG from "./firebase-config.js";

const V = "12.18.0";
const SDK = `https://www.gstatic.com/firebasejs/${V}/`;
const JOIN_KEY = "tobuy-join";
const T = () => window.TOBUY;

/* 초대 링크(?join=가족ID.초대코드)는 로그인 창을 다녀와도 잊지 않게 잠깐 적어 둠 */
(function keepJoin(){
  try{
    const q = new URLSearchParams(location.search), j = q.get("join");
    if (j){ sessionStorage.setItem(JOIN_KEY, j); history.replaceState(null, "", location.pathname); }
  }catch(e){}
})();
const pendingJoin = () => { try{ return sessionStorage.getItem(JOIN_KEY); }catch(e){ return null; } };
const clearJoin = () => { try{ sessionStorage.removeItem(JOIN_KEY); }catch(e){} };

function friendly(e){
  const code = (e && e.code) || "";
  const map = {
    "auth/unauthorized-domain": "파이어베이스 [Authentication > 설정 > 승인된 도메인]에 musicalpe.github.io 를 넣어 주세요.",
    "auth/popup-closed-by-user": "로그인 창이 닫혔어요. 다시 눌러 주세요.",
    "auth/cancelled-popup-request": "로그인 창이 닫혔어요. 다시 눌러 주세요.",
    "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
    "auth/operation-not-allowed": "파이어베이스 [Authentication > 로그인 방법]에서 Google 을 사용 설정해 주세요.",
    "permission-denied": "권한이 없어요. 초대 링크가 바뀌었거나, 파이어베이스 보안 규칙이 아직 안 들어갔을 수 있어요.",
    "unavailable": "인터넷 연결을 확인해 주세요."
  };
  return new Error(map[code] || (e && e.message) || "알 수 없는 오류");
}
const randomCode = (n = 10) => {
  const a = "abcdefghijkmnpqrstuvwxyz23456789", b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, x => a[x % a.length]).join("");
};
/* 물건 한 줄에서 서버에 올릴 것만 고름 */
const ITEM_KEYS = ["t", "s", "due", "done", "doneAt", "at", "by", "byName"];
const pickItem = o => { const d = {}; ITEM_KEYS.forEach(k => { if (o[k] !== undefined) d[k] = o[k]; }); return d; };
const REC_KEYS = ["date", "total", "s", "sn", "items", "at", "by", "byName"];
const pickRec = o => { const d = {}; REC_KEYS.forEach(k => { if (o[k] !== undefined) d[k] = o[k]; }); return d; };
const AI_TRIAL = +CFG.AI_TRIAL || 0, FREE_OWNERS = Array.isArray(CFG.FREE_OWNERS) ? CFG.FREE_OWNERS : [];
window.TOBUY_AI = { models: CFG.AI_MODELS || [], trial: AI_TRIAL };
async function sha256(t){
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

if (!firebaseConfig || !firebaseConfig.apiKey){
  T().setAccount({ phase: "noconfig" });
} else {
  start().catch(err => {
    console.error(err);
    T().setAccount({ phase: "noconfig" });
  });
}

async function start(){
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  /* App Check: 앱의 AI를 우리 앱 주소에서만 쓰게 막아 주는 장치.
     로그인과 목록 불러오기를 늦추지 않도록, 영수증을 처음 읽을 때에만 켬 */
  const aiReady = !!CFG.RECAPTCHA_SITE_KEY;
  let appCheckOn = false;
  async function ensureAppCheck(){
    if (appCheckOn) return;
    const AC = await import(SDK + "firebase-app-check.js");
    AC.initializeAppCheck(app, { provider: new AC.ReCaptchaEnterpriseProvider(CFG.RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
    appCheckOn = true;
  }
  let aiLib = null;
  /* 내가 들어 있는 가족 공간을 이 기기에 적어 둠 → 다음에 열 때 서버 답을 기다리지 않고 바로 들어감 */
  const hintKey = uid => "tobuy-fam-" + uid;
  const getHint = uid => { try{ return localStorage.getItem(hintKey(uid)); }catch(e){ return null; } };
  const setHint = (uid, id) => { try{ if (id) localStorage.setItem(hintKey(uid), id); else localStorage.removeItem(hintKey(uid)); }catch(e){} };
  const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, no) => { t = setTimeout(() => no(new Error("timeout")), ms); })]).finally(() => clearTimeout(t)); };
  const auth = A.getAuth(app);
  let db;
  try{
    db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  }catch(e){ db = F.getFirestore(app); }

  let me = null, unsubs = [], fid = null;
  const stop = () => { unsubs.forEach(u => { try{ u(); }catch(e){} }); unsubs = []; fid = null; };

  window.FBAPP = {
    aiReady,
    /* 앱의 AI(Firebase AI Logic)로 한 번 묻기 → 답 글자 */
    async aiBuiltin(name, parts, cfg, ms){
      if (!aiReady) throw new Error("앱의 AI가 아직 연결되지 않았어요");
      await ensureAppCheck();
      if (!aiLib){ const L = await import(SDK + "firebase-ai.js"); aiLib = { L, ai: L.getAI(app, { backend: new L.GoogleAIBackend() }) }; }
      const model = aiLib.L.getGenerativeModel(aiLib.ai, { model: name, generationConfig: cfg });
      let timer;
      const res = await Promise.race([model.generateContent(parts), new Promise((_, no) => { timer = setTimeout(() => no(new Error("timeout: " + name)), ms); })]).finally(() => clearTimeout(timer));
      return res.response.text();
    },
    async login(){
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      try{ await A.signInWithPopup(auth, p); }
      catch(e){
        if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) return A.signInWithRedirect(auth, p);
        throw friendly(e);
      }
    },
    logout(){ return A.signOut(auth); },
    /* 가족 공간에서 나가기: 나만 남아 있으면 가족 공간을 통째로 지움 */
    async leaveFamily(){
      if (!me || !fid) return;
      await leaveOrWipe(fid);
      await F.setDoc(F.doc(db, "users", me.uid), { family: F.deleteField() }, { merge: true });
      setHint(me.uid, null);
      stop(); T().leaveFamily(); T().setAccount({ phase: "nofamily", user: me });
    },
    /* 계정과 자료 모두 지우기 */
    async deleteAccount(){
      if (!me) throw new Error("먼저 로그인해 주세요.");
      if (fid) await leaveOrWipe(fid);
      setHint(me.uid, null);
      stop();
      try{ await F.deleteDoc(F.doc(db, "users", me.uid)); }catch(e){}
      const u = auth.currentUser;
      try{ await A.deleteUser(u); }
      catch(e){
        if (e && e.code === "auth/requires-recent-login"){
          const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
          await A.reauthenticateWithPopup(u, p);
          await A.deleteUser(u);
        } else throw friendly(e);
      }
    },
    /* 가족 공간 만들기: 이 기기에 적어 둔 가게와 물건을 그대로 올림 */
    async createFamily(name, data, localItems, localReceipts){
      if (!me) throw new Error("먼저 로그인해 주세요.");
      const fref = F.doc(F.collection(db, "families"));
      await F.setDoc(fref, {
        stores: (data && data.stores) || [], dues: (data && data.dues) || [],
        name, owner: me.uid, members: [me.uid],
        memberInfo: { [me.uid]: { name: me.name, email: me.email } },
        invite: randomCode(), createdAt: F.serverTimestamp()
      }).catch(e => { throw friendly(e); });
      const list = (localItems || []).slice();
      while (list.length){
        const batch = F.writeBatch(db);
        list.splice(0, 400).forEach(it => batch.set(F.doc(fref, "items", it.id), Object.assign(pickItem(it), { by: it.by || me.uid, byName: it.byName || me.name })));
        await batch.commit().catch(e => { throw friendly(e); });
      }
      const recs = (localReceipts || []).slice();
      while (recs.length){
        const batch = F.writeBatch(db);
        recs.splice(0, 300).forEach(r => batch.set(F.doc(fref, "receipts", r.id), Object.assign(pickRec(r), { by: r.by || me.uid, byName: r.byName || me.name })));
        await batch.commit().catch(e => { throw friendly(e); });
      }
      await F.setDoc(F.doc(db, "users", me.uid), { family: fref.id }, { merge: true });
      enter(fref.id);
    }
  };

  /* 내가 마지막 가족이면 물건과 가족 공간을 모두 지우고, 아니면 나만 빠짐 */
  async function leaveOrWipe(id){
    const fref = F.doc(db, "families", id);
    const snap = await F.getDoc(fref).catch(e => { throw friendly(e); });
    if (!snap.exists()) return;
    const d = snap.data(), others = (d.members || []).filter(u => u !== me.uid);
    if (others.length){
      const upd = { members: F.arrayRemove(me.uid), [`memberInfo.${me.uid}`]: F.deleteField() };
      if (d.owner === me.uid) upd.owner = others[0];      // 만든 사람이 나가면 남은 가족에게 넘김
      await F.updateDoc(fref, upd).catch(e => { throw friendly(e); });
      return;
    }
    const all = await F.getDocs(F.collection(fref, "items"));
    for (const x of all.docs){ await F.deleteDoc(x.ref); }
    const recs = await F.getDocs(F.collection(fref, "receipts"));
    for (const x of recs.docs){ await F.deleteDoc(x.ref); }
    await F.deleteDoc(fref).catch(e => { throw friendly(e); });
  }

  async function join(code){
    const [id, inv] = String(code).split(".");
    if (!id || !inv) return;
    const fref = F.doc(db, "families", id);
    await F.updateDoc(fref, {
      members: F.arrayUnion(me.uid),
      [`memberInfo.${me.uid}`]: { name: me.name, email: me.email },
      joinWith: inv
    });
    await F.setDoc(F.doc(db, "users", me.uid), { family: id }, { merge: true });
  }

  function famInfo(id, d){
    return {
      id, name: d.name || "우리 집 장보기", invite: d.invite,
      freeAI: !!d.freeAI, aiKey: d.aiKey || "", aiTrialUsed: d.aiTrialUsed || 0,
      members: (d.members || []).map(u => ({ uid: u, name: (d.memberInfo && d.memberInfo[u] && d.memberInfo[u].name) || "가족" }))
    };
  }

  function enter(id){
    stop(); fid = id; setHint(me.uid, id);
    const fref = F.doc(db, "families", id), col = F.collection(fref, "items"), rcol = F.collection(fref, "receipts");
    const gone = e => { if (e && e.code === "not-found") return; throw friendly(e); };   // 가족이 먼저 지운 물건은 그냥 넘어감
    const remote = {
      saveStores: stores => F.updateDoc(fref, { stores, updatedBy: me.uid, updatedAt: F.serverTimestamp() }).catch(e => { throw friendly(e); }),
      saveDues: dues => F.updateDoc(fref, { dues, updatedBy: me.uid, updatedAt: F.serverTimestamp() }).catch(e => { throw friendly(e); }),
      addItem: it => F.setDoc(F.doc(col, it.id), pickItem(it)).catch(e => { throw friendly(e); }),
      updateItem: (iid, fields) => F.updateDoc(F.doc(col, iid), pickItem(fields)).catch(gone),
      deleteItem: iid => F.deleteDoc(F.doc(col, iid)).catch(gone),
      addReceipt: r => F.setDoc(F.doc(rcol, r.id), pickRec(r)).catch(e => { throw friendly(e); }),
      updateReceipt: (rid, fields) => F.updateDoc(F.doc(rcol, rid), pickRec(fields)).catch(gone),
      deleteReceipt: rid => F.deleteDoc(F.doc(rcol, rid)).catch(gone),
      saveAiKey: k => F.updateDoc(fref, { aiKey: k }).catch(e => { throw friendly(e); }),
      bumpTrial: () => F.updateDoc(fref, { aiTrialUsed: F.increment(1) }).catch(e => { throw friendly(e); })
    };
    let entered = false, held = null, heldRecs = null, askedFree = false;
    unsubs.push(F.onSnapshot(fref, { includeMetadataChanges: true }, snap => {
      if (!snap.exists()){ leave("가족 공간이 없어졌어요."); return; }
      const d = snap.data();
      if (!entered){
        entered = true; T().enterFamily(famInfo(id, d), remote);
        if (held){ T().applyItems(held); held = null; }
        if (heldRecs){ T().applyReceipts(heldRecs); heldRecs = null; }
      } else T().updateFamilyInfo(famInfo(id, d));
      /* 앱을 만든 사람이 만든 가족 공간은 "앱의 AI 그대로" 표시 (초대받은 가족도 같이) */
      if (!askedFree && AI_TRIAL && FREE_OWNERS.length && d.owner === me.uid && !d.freeAI){
        askedFree = true;
        sha256(String(me.email || "").trim().toLowerCase()).then(h => { if (FREE_OWNERS.includes(h)) return F.updateDoc(fref, { freeAI: true }); }).catch(() => {});
      }
      T().applyFamily(d);
      T().showConnState();
    }, err => {
      if (err && err.code === "permission-denied") leave("이 가족 공간에서 빠졌거나 권한이 없어요.");
      else T().showConnState();
    }));
    unsubs.push(F.onSnapshot(col, qs => {
      const list = qs.docs.map(x => Object.assign({}, x.data(), { id: x.id }));
      if (entered) T().applyItems(list); else held = list;
    }, () => {}));
    unsubs.push(F.onSnapshot(rcol, qs => {
      const list = qs.docs.map(x => Object.assign({}, x.data(), { id: x.id }));
      if (entered) T().applyReceipts(list); else heldRecs = list;
    }, () => {}));
  }

  async function leave(why){
    if (me) setHint(me.uid, null);
    stop();
    T().leaveFamily();
    if (me){
      try{ await F.setDoc(F.doc(db, "users", me.uid), { family: F.deleteField() }, { merge: true }); }catch(e){}
      T().setAccount({ phase: "nofamily", user: me, why });
    }
  }

  A.getRedirectResult(auth).catch(() => {});
  A.onAuthStateChanged(auth, async user => {
    stop();
    if (!user){
      me = null;
      T().leaveFamily();
      T().setAccount({ phase: "out", joining: !!pendingJoin() });
      return;
    }
    me = { uid: user.uid, name: user.displayName || (user.email || "").split("@")[0] || "나", email: user.email || "" };
    T().setAccount({ phase: "loading", user: me });
    const code = pendingJoin();
    if (code){
      try{ await join(code); }
      catch(e){ console.warn(e); window.toast && window.toast("초대 링크로 들어가지 못했어요. 가족에게 새 QR을 받아 주세요."); }
      clearJoin();
    }
    const uref = F.doc(db, "users", me.uid), uid = me.uid;
    /* 전에 들어갔던 가족 공간이 적혀 있으면 바로 들어가고, 서버에는 뒤에서 조용히 맞는지 물어봄 */
    const hint = getHint(uid);
    if (hint){
      enter(hint);
      F.getDoc(uref).then(u => {
        if (!me || me.uid !== uid) return;
        const real = u.exists() ? u.data().family : null;
        if (real && real !== fid) enter(real);
        else if (!real && fid === hint) leave("");
      }).catch(() => {});
      return;
    }
    let famId = null, failed = false;
    try{
      const u = await withTimeout(F.getDoc(uref), 15000);
      famId = u.exists() ? u.data().family : null;
    }catch(e){ console.warn(e); failed = true; }
    if (!me || me.uid !== uid) return;
    if (famId) enter(famId);
    else if (failed) T().setAccount({ phase: "slow", user: me });      // 답이 없을 때 '가족 공간 없음'으로 넘기면 가족 공간을 또 만들게 되므로 따로 알림
    else T().setAccount({ phase: "nofamily", user: me });
  });
}
