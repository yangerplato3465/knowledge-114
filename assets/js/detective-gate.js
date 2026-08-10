// ============================================================
// 偵探事件簿 · 上課驗證碼門檻
//
// 目的：沒有老師當堂發的驗證碼就進不了案件，避免學生自己先破台，
//       上課時再玩一次就沒有懸疑感了。
//
// 運作方式：
//   1. 把「關卡 + 碼」用 PBKDF2 推成一串雜湊，那串雜湊就是 Firestore
//      的文件 ID。碼本身沒有存進資料庫，資料庫裡只有雜湊。
//   2. 安全規則只開放 get、關掉 list——不知道碼的人連「有哪些碼」都
//      列不出來，只能拿已知的碼去對。
//   3. 到期時間寫在規則裡用 request.time（伺服器時間）比對，
//      把電腦時鐘調回昨天沒有用，過期就是讀不到。
//   4. 驗過才 import 引擎；在那之前 detective.js 根本沒被載入。
//
// 已知極限：這是純靜態站，解鎖狀態存在瀏覽器裡，會改 localStorage 的
// 人繞得過去。要根治得把案件資料加密（案件金鑰放在驗證碼那筆文件裡），
// 那是之後的第二階段。目前這層擋的是「隨手點進來玩掉」。
// ============================================================

import { DETECTIVE_GAMES, deriveCodeId, normalizeCode } from './detective-code.js';

const GAME_ID = window.DETECTIVE_GAME_ID || 'owl';
const GAME = DETECTIVE_GAMES.find(g => g.id === GAME_ID);
const SESSION_KEY = `detective.unlock.${GAME_ID}`;
const MAX_TRIES = 3;          // 連錯這麼多次就先冷卻，純粹防亂猜手癢
const COOLDOWN_MS = 30000;

const $ = id => document.getElementById(id);
const gate = $('gate');
const input = $('gateCode');
const submitBtn = $('gateBtn');
const errEl = $('gateErr');

let tries = 0;
let busy = false;

// ---- 解鎖場次（存在瀏覽器，到期時間取自伺服器回來的 expiresAt）----

function readSession() {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        return s && typeof s.exp === 'number' && s.exp > Date.now() ? s : null;
    } catch {
        return null;
    }
}

function saveSession(expMs) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ exp: expMs }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ---- 進遊戲 ----

async function boot() {
    gate?.remove();
    const lockBtn = $('lockBtn');
    if (lockBtn) {
        lockBtn.hidden = false;
        lockBtn.addEventListener('click', () => {
            if (!confirm('要鎖回去嗎？下次進來需要重新輸入驗證碼。')) return;
            clearSession();
            location.reload();
        });
    }
    // 驗證通過才載入引擎——在此之前 detective.js 完全沒被下載執行
    await import('./detective.js');
}

// ---- 驗碼 ----

function showGate() {
    if (GAME) input.placeholder = `${GAME.prefix}-XXXX-XX`;
    gate.hidden = false;
    submitBtn.addEventListener('click', verify);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    input.focus();
}

function fail(msg) {
    errEl.textContent = msg;
    input.select();
}

function cooldown() {
    let left = Math.ceil(COOLDOWN_MS / 1000);
    submitBtn.disabled = true;
    input.disabled = true;
    const tick = () => {
        errEl.textContent = `錯太多次了，請等 ${left} 秒再試`;
        if (left-- <= 0) {
            clearInterval(timer);
            submitBtn.disabled = false;
            input.disabled = false;
            errEl.textContent = '';
            tries = 0;
            input.focus();
        }
    };
    const timer = setInterval(tick, 1000);
    tick();
}

async function verify() {
    if (busy || submitBtn.disabled) return;
    const code = normalizeCode(input.value);
    if (!code) { fail('請輸入驗證碼'); return; }

    busy = true;
    submitBtn.disabled = true;
    errEl.textContent = '';
    const original = submitBtn.textContent;
    submitBtn.textContent = '查驗中…';

    try {
        const codeId = await deriveCodeId(GAME_ID, code);

        // Firebase 到這一步才載入：已經解鎖過的人不必為此多等一次 CDN
        const [{ initializeApp }, fs] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js'),
        ]);
        const app = initializeApp({
            apiKey: "AIzaSyBW7V3sXHn8MsaP4KFmHDOHUFXSz3ksRDM",
            authDomain: "classroom-rpg-a931a.firebaseapp.com",
            projectId: "classroom-rpg-a931a",
            storageBucket: "classroom-rpg-a931a.firebasestorage.app",
            messagingSenderId: "548698002427",
            appId: "1:548698002427:web:896b85619015fc9303315e",
        });
        const db = fs.getFirestore(app);
        const ref = fs.doc(db, 'unlockCodes', codeId);

        // 碼不對、已過期、已作廢、已用完，在這裡的表現完全一樣
        // （不存在 → 讀不到；不符合規則 → permission-denied），
        // 從外面試不出差別，也就無從逐一排除。
        const snap = await fs.getDoc(ref);
        if (!snap.exists()) throw new Error('BAD_CODE');

        const data = snap.data();
        const expMs = data.expiresAt?.toMillis?.();
        if (!expMs || expMs <= Date.now()) throw new Error('BAD_CODE');

        // 記一次使用；失敗（例如剛好被作廢）不影響這次已經放行的解鎖
        fs.updateDoc(ref, {
            usedCount: fs.increment(1),
            lastUsedAt: fs.serverTimestamp(),
        }).catch(() => {});

        saveSession(expMs);
        await boot();
        return;
    } catch (err) {
        if (err?.message === 'INSECURE_CONTEXT') {
            fail('請用網址開啟這一頁（不能直接點開檔案），驗證功能才能運作');
            return;
        }
        // 網路斷線之類的真錯誤跟「碼不對」分開講，不然老師會一直重打
        const offline = err?.code === 'unavailable' || !navigator.onLine;
        if (offline) {
            fail('連不上驗證伺服器，請檢查網路後再試一次');
            return;
        }
        tries++;
        if (tries >= MAX_TRIES) cooldown();
        else fail(`驗證碼不正確或已過期（還可以試 ${MAX_TRIES - tries} 次）`);
    } finally {
        busy = false;
        submitBtn.textContent = original;
        if (tries < MAX_TRIES) submitBtn.disabled = false;
    }
}

// ---- 起點 ----
// 先看本機有沒有還沒過期的解鎖場次；有就直接進遊戲，
// 連 Firebase 都不用載，重新整理不會被要求重打。

if (readSession()) {
    boot();
} else {
    clearSession();
    showGate();
}
