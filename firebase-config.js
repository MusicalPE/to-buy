/* 파이어베이스 콘솔 > 프로젝트 설정 > 내 앱(웹)에 나오는 firebaseConfig 값
   이 값은 공개돼도 괜찮아요. 실제로 누가 무엇을 읽고 쓸지는 보안 규칙이 막아 줘요. */
export const firebaseConfig = {
  apiKey: "AIzaSyB5HZoBkQ35d6tC6Cv7IVVwW18nlt5qqc4",
  authDomain: "to--buy.firebaseapp.com",
  projectId: "to--buy",
  storageBucket: "to--buy.firebasestorage.app",
  messagingSenderId: "148162747727",
  appId: "1:148162747727:web:5ea6e610d1e393f338f93a"
};

/* ---------- 영수증 읽기 AI (Firebase AI Logic) ---------- */
// App Check(reCAPTCHA Enterprise) 사이트 키 — AI Logic 을 켜면 App Check 가 함께 켜져서, 이 값이 있어야 앱의 AI가 움직여요.
// 비어 있으면 앱의 AI는 쉬고, 내 AI 키를 넣은 사람만 영수증 읽기를 쓸 수 있어요.
export const RECAPTCHA_SITE_KEY = "";
// 영수증을 읽을 AI 모델 (앞에서부터 차례로, 붐비거나 안 되면 다음 모델로)
export const AI_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"];
// 다른 가족 공간은 앱의 AI로 몇 번까지 체험할지 (끝나면 설정에서 자기 Gemini API 키를 넣어 씀). 0 이면 모두 앱의 AI
export const AI_TRIAL = 3;
// 체험 횟수와 상관없이 앱의 AI를 쓰는 사람(만든 사람)의 이메일을 SHA-256 으로 바꾼 값 — 이 사람이 만든 가족 공간의 가족도 키 없이 씀
export const FREE_OWNERS = ["c8c382c89009b5a22547b0b08fe70e4e7793616baabe579e606048d94304ef2f"];
