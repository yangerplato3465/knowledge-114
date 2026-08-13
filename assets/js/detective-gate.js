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
const GROUPS_KEY = `detective.groups.${GAME_ID}`;
// 從遊戲裡按「新增組別」跳回來時的一次性旗標：告訴 gate 這次要打新的碼，
// 別把游標留在組別清單上。用 sessionStorage 是因為它只該影響這一次重新載入。
const GATE_FOCUS_KEY = `detective.gateFocus.${GAME_ID}`;
const MAX_GROUPS = 12;        // 記太多沒意義，一台電視一學期也用不到這麼多組
const MAX_TRIES = 3;          // 連錯這麼多次就先冷卻，純粹防亂猜手癢
const COOLDOWN_MS = 30000;

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBW7V3sXHn8MsaP4KFmHDOHUFXSz3ksRDM",
    authDomain: "classroom-rpg-a931a.firebaseapp.com",
    projectId: "classroom-rpg-a931a",
    storageBucket: "classroom-rpg-a931a.firebasestorage.app",
    messagingSenderId: "548698002427",
    appId: "1:548698002427:web:896b85619015fc9303315e",
};

// Firebase 一律等到真的要用才載，而且只載一次。
// 已經解鎖過的人（session 還在）直接進遊戲，這時候完全不會碰到 CDN；
// 等到第一次要存進度才付這個成本，開場速度不受影響。
let fbPromise = null;
function firebase() {
    if (!fbPromise) {
        fbPromise = (async () => {
            const [{ initializeApp }, fs] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js'),
            ]);
            return { fs, db: fs.getFirestore(initializeApp(FIREBASE_CONFIG)) };
        })();
    }
    return fbPromise;
}

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

// session 現在除了到期時間，還記著「是哪一組碼開的」（codeId）跟組別名稱。
// codeId 就是進度要寫回去的那一筆文件，沒有它就沒辦法記進度。
function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ---- 這台裝置記住的組別 ----
//
// 一台觸控電視輪流跑三、四組，每換一次組就要重打一次驗證碼太麻煩，
// 所以驗過的碼記在本機，在碼的有效期限內可以直接點名字切換。
//
// 只記 codeId（雜湊）跟組別名稱，不記明文驗證碼 —— 遊戲端本來就只需要
// codeId 就能讀寫進度。過期的自動不再列出；要提早清掉有「清除這台記住的
// 組別」那顆按鈕。
function readGroups() {
    try {
        const list = JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]');
        if (!Array.isArray(list)) return [];
        return list.filter(g => g && g.codeId && typeof g.exp === 'number' && g.exp > Date.now());
    } catch {
        return [];
    }
}

function rememberGroup(session) {
    // 同一組再驗一次就更新它（到期時間可能被重發過），並移到最前面
    const list = readGroups().filter(g => g.codeId !== session.codeId);
    list.unshift(session);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(list.slice(0, MAX_GROUPS)));
}

function forgetGroup(codeId) {
    localStorage.setItem(GROUPS_KEY,
        JSON.stringify(readGroups().filter(g => g.codeId !== codeId)));
}

// ---- 進度存讀 ----

// 讀不到舊進度時就把「寫入」一起關掉。
// 這是整個讀檔功能最危險的地方：如果讀失敗卻照常開新遊戲，
// 1.2 秒後存檔就會把空白狀態寫回去，學生上禮拜玩的東西整份消失。
// 寧可這一台這次不記錄，也不能弄丟已經存好的進度。
let saveBlocked = false;

async function loadProgress(codeId) {
    const { fs, db } = await firebase();
    const snap = await fs.getDoc(fs.doc(db, 'unlockCodes', codeId));
    if (!snap.exists()) throw new Error('NO_DOC');
    return snap.data().progress || null;      // 沒玩過就是 null，這是正常情況不是錯誤
}

// 引擎那邊算好一包存檔丟過來，這裡負責寫進 Firestore。
// 寫失敗一律吞掉、不打斷正在玩的人（碼過期、被作廢、網路斷了都會走到這裡），
// 但要回報成敗 ——「登出並儲存」得知道這次到底存進去了沒。
async function saveProgress(data) {
    const codeId = window.DETECTIVE_SESSION?.codeId;
    if (!codeId || saveBlocked) return false;
    try {
        const { fs, db } = await firebase();
        await fs.updateDoc(fs.doc(db, 'unlockCodes', codeId), {
            progress: data,
            progressAt: fs.serverTimestamp(),
        });
        return true;
    } catch (err) {
        console.warn('[detective] 進度存檔失敗（不影響遊戲）', err);
        return false;
    }
}

// ---- 進遊戲 ----

async function boot(session) {
    // 先把這一組的存檔抓回來，抓完才載引擎 —— 引擎一開始就要拿它決定
    // 是從頭開始還是接續上次。這一步會多等一次 Firebase CDN，
    // 但正確性比那零點幾秒重要（見上面 saveBlocked 的說明）。
    //
    // 注意順序：讀完才把 gate 移掉。碼失效的話還要退回輸碼畫面，
    // 先移掉就沒東西可以退回去了。
    let progress = null;
    if (session?.codeId) {
        try {
            progress = await loadProgress(session.codeId);
        } catch (err) {
            // 分兩種情況：碼真的不能用了（被作廢／刪除／過期），
            // 跟只是這台連不上網。前者要把這組忘掉、退回輸碼畫面；
            // 後者照樣進遊戲，只是這次不記錄，別把人擋在門外。
            const offline = err?.code === 'unavailable' || !navigator.onLine;
            if (!offline) {
                if (session.codeId) forgetGroup(session.codeId);
                clearSession();
                showGate('這組驗證碼已經失效了，請改選其他組或輸入新的碼。');
                return;
            }
            saveBlocked = true;
            console.warn('[detective] 讀取進度失敗，這一台改成不記錄模式', err);
        }
    }

    gate?.remove();

    // 讓引擎知道自己是被哪一組碼開的。
    // 舊的 session、以及 CLAUDE.md 裡那個開發用的 {"exp":…} 捷徑都沒有 codeId，
    // 這種情況 saveProgress 直接不做事 —— 遊戲照玩，只是不記進度。
    window.DETECTIVE_SESSION = {
        codeId: session?.codeId || null,
        label: session?.label || '',
        progress,
        saveBlocked,
        saveProgress,
    };

    wireGroupSwitch(session);
    // 驗證通過才載入引擎——在此之前 detective.js 完全沒被下載執行
    await import('./detective.js');
}

// ---- 頂欄的組別切換器 ----
//
// 目前組別的名字本身就是按鈕，點開是這台記住的所有組別，直接點就換過去 ——
// 一台電視輪流跑三四組，換組不該還要先跳回驗證碼畫面。只有「新增組別」
// 才需要輸入碼。
//
// 每一項都走同一條路：確實存檔 → 換掉本機場次 → 整頁重新載入。
// 用 reload 而不是在原地重換場景，是因為引擎的狀態是在載入時一次建立的，
// 半途抽換等於要把整個遊戲重置一遍；reload 這條路已經驗證過，也最不會出錯。
function wireGroupSwitch(session) {
    const box = $('groupSwitch');
    const btn = $('groupBtn');
    const menu = $('groupMenu');
    if (!box || !btn || !menu) return;

    btn.textContent = session?.label
        ? (saveBlocked ? `${session.label}（未連線）` : session.label)
        : '（未命名的組別）';
    btn.classList.toggle('offline', saveBlocked);
    box.hidden = false;

    const closeMenu = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };

    btn.addEventListener('click', e => {
        e.stopPropagation();
        if (menu.hidden) { renderMenu(); menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
        else closeMenu();
    });
    // 點選單以外的地方就收起來
    document.addEventListener('click', e => {
        if (!menu.hidden && !box.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    // 共用的離場流程：存檔存不進去時讓老師決定要不要硬走。
    // 用 force 存檔（而不是只把等待中的那次補寫掉），這樣「存好了沒」
    // 是真的問過伺服器，不是靠「剛好沒有待寫的東西」推論出來的。
    async function leaveTo(target, ask) {
        if (!confirm(ask)) return;
        closeMenu();
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = '存檔中…';

        // 引擎還沒載完就按（切換器比 import 早掛上）＝這次根本還沒玩，
        // 沒東西要存，直接放行，不要跳一個嚇人的「存檔失敗」
        let ok = !window.DETECTIVE_FLUSH;
        try {
            if (window.DETECTIVE_FLUSH) ok = await window.DETECTIVE_FLUSH(true);
        } catch (err) {
            console.warn('[detective] 離場前的存檔失敗', err);
            ok = false;
        }
        if (!ok && !confirm(
            '⚠️ 這一組的進度沒有存成功。\n\n'
            + '可能是網路不通，或這組驗證碼已經失效。\n'
            + '現在離開的話，這次玩的內容會消失。\n\n'
            + '仍然要離開嗎？')) {
            btn.disabled = false;
            btn.textContent = original;      // 留在遊戲裡，讓老師先處理網路
            return;
        }

        if (target) saveSession(target); else clearSession();
        location.reload();
    }

    function renderMenu() {
        menu.innerHTML = '';
        const groups = readGroups();

        for (const g of groups) {
            const item = document.createElement('button');
            item.type = 'button';
            const current = g.codeId === session?.codeId;
            item.textContent = current ? `● ${g.label || '（未命名的組別）'}（目前）` : g.label || '（未命名的組別）';
            item.disabled = current;
            if (!current) {
                item.addEventListener('click', () => leaveTo(g,
                    `要切換到「${g.label}」嗎？\n\n目前這一組的進度會先存好，之後隨時可以再切回來。`));
            }
            menu.appendChild(item);
        }
        if (groups.length) menu.appendChild(document.createElement('hr'));

        const add = document.createElement('button');
        add.type = 'button';
        add.textContent = '➕ 新增組別（輸入驗證碼）';
        add.addEventListener('click', () => {
            // 讓 gate 知道這次是要打新的碼，直接把游標放進輸入框
            try { sessionStorage.setItem(GATE_FOCUS_KEY, '1'); } catch { /* 無痕模式可能不給寫，不影響功能 */ }
            leaveTo(null, '要新增組別嗎？\n\n目前這一組的進度會先存好，接著回到輸入驗證碼的畫面。');
        });
        menu.appendChild(add);

        const out = document.createElement('button');
        out.type = 'button';
        out.textContent = '💾 登出並儲存';
        out.addEventListener('click', () => leaveTo(null,
            '要登出嗎？\n\n這一組的進度會先存好，下次直接點組別名字就能接著玩。'));
        menu.appendChild(out);
    }
}

// ---- 驗碼 ----

// 可能被呼叫兩次（開場一次、碼失效退回來一次），所以監聽器只掛一次。
let gateWired = false;

function showGate(msg = '') {
    if (!gate) return;
    if (GAME) input.placeholder = `${GAME.prefix}-XXXX-XX`;
    gate.hidden = false;
    errEl.textContent = msg;
    const remembered = renderGroups();

    if (!gateWired) {
        gateWired = true;
        submitBtn.addEventListener('click', verify);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
        $('gateForget')?.addEventListener('click', () => {
            if (!confirm('清除這台裝置記住的所有組別？\n\n進度不會被刪除，只是之後要切換組別得重新輸入驗證碼。')) return;
            localStorage.removeItem(GROUPS_KEY);
            renderGroups();
        });
    }
    // 有記住的組別時不要自動聚焦輸入框：觸控電視上那會把螢幕鍵盤叫出來，
    // 蓋住底下的組別按鈕，而點按鈕才是這時候的主要動作。
    // 例外是從遊戲裡按「新增組別」跳回來的那次 —— 那就是要打字。
    let wantInput = false;
    try {
        wantInput = sessionStorage.getItem(GATE_FOCUS_KEY) === '1';
        sessionStorage.removeItem(GATE_FOCUS_KEY);
    } catch { /* 無痕模式讀不到，當作沒有旗標 */ }
    if (!remembered || wantInput) input.focus();
}

// 把記住的組別畫成一排按鈕，點一下就直接進那一組。回傳記住幾組。
function renderGroups() {
    const box = $('gateGroups');
    const list = $('gateGroupList');
    if (!box || !list) return 0;

    const groups = readGroups();
    box.hidden = groups.length === 0;
    list.innerHTML = '';

    for (const g of groups) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gate-group';
        btn.textContent = g.label || '（未命名的組別）';
        btn.addEventListener('click', async () => {
            // 進場中先把整排鎖起來，免得連點兩下開兩次
            list.querySelectorAll('button').forEach(b => { b.disabled = true; });
            btn.textContent = '讀取中…';
            errEl.textContent = '';
            saveSession(g);
            await boot(g);
        });
        list.appendChild(btn);
    }
    return groups.length;
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
        const { fs, db } = await firebase();
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

        const session = { exp: expMs, codeId, label: data.label || '' };
        saveSession(session);
        rememberGroup(session);      // 之後在這台切回這一組就不用再打一次碼
        await boot(session);
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
// 先看本機有沒有還沒過期的解鎖場次；有就直接進遊戲，重新整理不會被要求重打。
// （做了進度存檔之後這裡還是會載一次 Firebase 把存檔抓回來，
//   不再像以前那樣完全不碰網路，但省下的是重新輸碼的麻煩。）

const existing = readSession();
if (existing) {
    boot(existing);
} else {
    clearSession();
    showGate();
}
