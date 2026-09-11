// ============================================================
// 偵探事件簿 · 驗證碼後台（老師專用）
//
// 產出的碼會同時寫進兩個集合：
//   unlockCodes/{雜湊}       ── 學生端要查的那一筆。只有雜湊，沒有明文碼。
//                               安全規則開放 get、關掉 list，並用伺服器時間判到期。
//   unlockCodesAdmin/{雜湊}  ── 明文碼 + 備註，只有擁有者讀得到。
//                               雜湊是單向的，不另存一份就沒辦法把發過的碼列回來。
//
// 產碼權限不是靠這一頁的畫面擋（畫面誰都能打開），
// 是靠 Firestore 安全規則裡的 isOwner() 擋——沒登入對的帳號，寫入會被拒絕。
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getFirestore, collection, doc, setDoc, getDoc, getDocs,
    deleteDoc, updateDoc, query, where, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { DETECTIVE_GAMES, deriveCodeId, randomCode } from './code.js';

const firebaseConfig = {
    apiKey: "AIzaSyBW7V3sXHn8MsaP4KFmHDOHUFXSz3ksRDM",
    authDomain: "classroom-rpg-a931a.firebaseapp.com",
    projectId: "classroom-rpg-a931a",
    storageBucket: "classroom-rpg-a931a.firebasestorage.app",
    messagingSenderId: "548698002427",
    appId: "1:548698002427:web:896b85619015fc9303315e",
    measurementId: "G-9R7TMK6B7T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const $ = id => document.getElementById(id);
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentUser = null;

function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function fmtTime(ms) {
    const d = new Date(ms);
    const p = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtLeft(ms) {
    const mins = Math.round((ms - Date.now()) / 60000);
    if (mins <= 0) return '已過期';
    if (mins < 60) return `剩 ${mins} 分鐘`;
    const hrs = Math.floor(mins / 60);
    return hrs < 48 ? `剩 ${hrs} 小時` : `剩 ${Math.floor(hrs / 24)} 天`;
}

// ---- 產碼 ----

async function generate() {
    const gameId = $('f_game').value;
    const game = DETECTIVE_GAMES.find(g => g.id === gameId);
    if (!game) { toast('請先選擇案件'); return; }

    const hours = Number($('f_hours').value);
    // 下拉選單的文字（「7 天（跨週續玩）」）比自己換算好讀，直接拿來顯示
    const hoursLabel = $('f_hours').selectedOptions[0]?.textContent.trim() || `${hours} 小時`;
    const count = Number($('f_count').value);
    const maxUses = Math.max(0, Math.trunc(Number($('f_max').value) || 0));
    const baseName = $('f_note').value.trim();
    const expiresAt = Timestamp.fromMillis(Date.now() + hours * 3600000);

    $('genBtn').disabled = true;
    try {
        const made = [];
        for (let i = 0; i < count; i++) {
            const code = randomCode(game.prefix);
            const codeId = await deriveCodeId(gameId, code);
            // 一次產多組時自動編號，省得四組碼發下去分不出誰是誰。
            // 只產一組就用原字串，你想手動打「A班第3組」也不會被加料。
            const label = count > 1 ? `${baseName}第${i + 1}組` : baseName;

            // 學生端查的那一筆（不含明文碼）。
            // label 學生端讀得到，之後遊戲畫面要靠它顯示「現在是哪一組」；
            // 組別名稱本來就不是秘密，寫在這裡沒有安全問題。
            await setDoc(doc(db, 'unlockCodes', codeId), {
                gameId, label, expiresAt, maxUses, usedCount: 0, active: true,
                createdAt: serverTimestamp(),
            });
            // 後台自己看的那一筆（含明文碼與組別名稱）。
            // 欄位沿用 note，之前發過的碼才不會在清單上變成空白
            await setDoc(doc(db, 'unlockCodesAdmin', codeId), {
                code, gameId, note: label, expiresAt,
                createdAt: serverTimestamp(), createdBy: currentUser.uid,
            });
            made.push({ code, label });
        }

        const box = $('fresh');
        box.innerHTML = made.map(m => `<div class="fresh-code">${
                m.label ? `<span class="fresh-label">${escapeHtml(m.label)}</span>` : ''
            }${escapeHtml(m.code)}</div>`).join('')
            + `<div class="fresh-meta">${escapeHtml(game.name)} ·
                 有效到 ${fmtTime(expiresAt.toMillis())}（${escapeHtml(hoursLabel)}）·
                 ${maxUses === 0 ? '不限次數' : `上限 ${maxUses} 次`}</div>
               <button class="btn btn-ghost btn-sm" id="copyFresh" style="margin-top:12px">
                 <i class="fa-regular fa-copy"></i> 複製</button>`;
        box.style.display = '';
        // 複製出來一行一組，有名稱就用 Tab 隔開，貼到記事本或表格都對得起來
        $('copyFresh').onclick = () => copy(
            made.map(m => m.label ? `${m.label}\t${m.code}` : m.code).join('\n'));

        $('f_note').value = '';
        toast(`已產生 ${made.length} 組驗證碼`);
        await loadCodes();
    } catch (err) {
        console.error(err);
        toast(err.code === 'permission-denied'
            ? '沒有產碼權限：請確認安全規則的 isOwner() 已填入你的信箱'
            : '產生失敗：' + err.message);
    } finally {
        $('genBtn').disabled = false;
    }
}

async function copy(text) {
    try {
        await navigator.clipboard.writeText(text);
        toast('已複製');
    } catch {
        toast('複製失敗，請手動選取');
    }
}

// ---- 清單 ----

let rows = [];

async function loadCodes() {
    const gameId = $('filterGame').value;
    const listEl = $('codeList');
    listEl.innerHTML = '<div class="state">讀取中…</div>';

    try {
        // 用戶端排序，免建複合索引（跟班級 RPG 同一套作法）
        const snap = await getDocs(
            query(collection(db, 'unlockCodesAdmin'), where('gameId', '==', gameId))
        );
        const admins = [];
        snap.forEach(d => admins.push({ id: d.id, ...d.data() }));
        admins.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // 使用次數與啟用狀態存在另一個集合，逐筆補回來（筆數很少，成本可忽略）
        rows = await Promise.all(admins.map(async a => {
            const s = await getDoc(doc(db, 'unlockCodes', a.id));
            return { ...a, live: s.exists() ? s.data() : null };
        }));
        renderCodes();
    } catch (err) {
        console.error(err);
        listEl.innerHTML = `<div class="state">讀取失敗：${escapeHtml(err.message)}</div>`;
    }
}

function statusOf(r) {
    const live = r.live;
    if (!live) return { ok: false, label: '已刪除' };
    if (live.active === false) return { ok: false, label: '已作廢' };
    const expMs = live.expiresAt?.toMillis?.() ?? 0;
    if (expMs <= Date.now()) return { ok: false, label: '已過期' };
    if (live.maxUses > 0 && live.usedCount >= live.maxUses) return { ok: false, label: '已用完' };
    return { ok: true, label: fmtLeft(expMs) };
}

// 這一組玩到哪了。資料是遊戲端自己寫回 unlockCodes 的 progress 欄位，
// 舊的碼（做這個功能之前發的）沒有這欄，就顯示「尚未開始」。
function progressOf(live) {
    const p = live?.progress;
    if (!p) return '<span class="prog-none">尚未開始</span>';

    const at = live.progressAt?.toMillis?.();
    const when = at ? `（最後遊玩 ${fmtTime(at)}）` : '';
    if (p.solved) return `<span class="prog-done">✅ 已破關</span>${escapeHtml(when)}`;

    const got = p.clues?.length ?? 0;
    const total = p.clueTotal ?? '?';
    const where = p.sceneName ? ` · 目前在${p.sceneName}` : '';
    return `<span class="prog-live">🔎 線索 ${got}/${escapeHtml(String(total))}</span>`
         + `${escapeHtml(where + when)}`;
}

function renderCodes() {
    const listEl = $('codeList');
    $('codeEmpty').style.display = rows.length ? 'none' : '';
    listEl.innerHTML = rows.map(r => {
        const st = statusOf(r);
        const live = r.live;
        const expMs = live?.expiresAt?.toMillis?.() ?? r.expiresAt?.toMillis?.() ?? 0;
        const used = live ? live.usedCount ?? 0 : '—';
        const cap = live?.maxUses ? ` / ${live.maxUses}` : '';
        return `
        <div class="code-row ${st.ok ? '' : 'dead'}">
            <div class="code-val">${escapeHtml(r.code)}</div>
            <div class="code-info">
                ${r.note ? `<div class="code-group">${escapeHtml(r.note)}</div>` : ''}
                <div class="code-prog">${progressOf(live)}</div>
                <span class="tag ${st.ok ? 'live' : 'dead'}">${escapeHtml(st.label)}</span>
                到期 <b>${expMs ? fmtTime(expMs) : '—'}</b> · 已用 <b>${used}${cap}</b> 次
            </div>
            <div class="code-actions">
                <button class="btn btn-ghost btn-sm" data-copy="${escapeHtml(r.code)}">複製</button>
                ${st.ok ? `<button class="btn btn-ghost btn-sm" data-revoke="${r.id}">作廢</button>` : ''}
                <button class="btn btn-danger btn-sm" data-del="${r.id}">刪除</button>
            </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-copy]').forEach(b =>
        b.onclick = () => copy(b.dataset.copy));
    listEl.querySelectorAll('[data-revoke]').forEach(b =>
        b.onclick = () => revoke(b.dataset.revoke));
    listEl.querySelectorAll('[data-del]').forEach(b =>
        b.onclick = () => removeCode(b.dataset.del));
}

async function revoke(id) {
    if (!confirm('作廢這組驗證碼？已經在玩的人不受影響，但之後不能再用它開新的一台。')) return;
    try {
        await updateDoc(doc(db, 'unlockCodes', id), { active: false });
        toast('已作廢');
        await loadCodes();
    } catch (err) {
        toast('作廢失敗：' + err.message);
    }
}

async function removeCode(id) {
    if (!confirm('永久刪除這筆紀錄？')) return;
    try {
        await deleteDoc(doc(db, 'unlockCodes', id)).catch(() => {});
        await deleteDoc(doc(db, 'unlockCodesAdmin', id));
        toast('已刪除');
        await loadCodes();
    } catch (err) {
        toast('刪除失敗：' + err.message);
    }
}

async function purgeDead() {
    const dead = rows.filter(r => !statusOf(r).ok);
    if (!dead.length) { toast('沒有已失效的紀錄'); return; }
    if (!confirm(`刪除 ${dead.length} 筆已失效的驗證碼紀錄？`)) return;
    try {
        for (const r of dead) {
            await deleteDoc(doc(db, 'unlockCodes', r.id)).catch(() => {});
            await deleteDoc(doc(db, 'unlockCodesAdmin', r.id));
        }
        toast(`已清掉 ${dead.length} 筆`);
        await loadCodes();
    } catch (err) {
        toast('清除失敗：' + err.message);
    }
}

// ---- 登入 ----

function authErrMsg(code) {
    if (code.includes('invalid-credential') || code.includes('wrong-password')
        || code.includes('user-not-found')) return '帳號或密碼不正確';
    if (code.includes('invalid-email')) return '電子郵件格式不正確';
    if (code.includes('too-many-requests')) return '嘗試次數過多，請稍後再試';
    if (code.includes('network')) return '連線失敗，請檢查網路';
    return '登入失敗：' + code;
}

async function login() {
    const email = $('loginEmail').value.trim();
    const pw = $('loginPassword').value;
    const errEl = $('loginErr');
    errEl.textContent = '';
    if (!email || !pw) { errEl.textContent = '請輸入電子郵件與密碼'; return; }
    $('loginBtn').disabled = true;
    try {
        await signInWithEmailAndPassword(auth, email, pw);
        // 之後由 onAuthStateChanged 接手切畫面
    } catch (err) {
        errEl.textContent = authErrMsg(err.code || err.message);
    } finally {
        $('loginBtn').disabled = false;
    }
}

// ---- 起動 ----

for (const sel of [$('f_game'), $('filterGame')]) {
    sel.innerHTML = DETECTIVE_GAMES
        .map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
}

$('genBtn').onclick = generate;
$('refreshBtn').onclick = loadCodes;
$('purgeBtn').onclick = purgeDead;
$('filterGame').onchange = loadCodes;
$('loginBtn').onclick = login;
$('logoutBtn').onclick = () => signOut(auth);
$('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        $('loginScreen').style.display = 'none';
        $('app').style.display = 'block';
        $('whoEmail').textContent = user.email || user.uid;
        $('whoUid').textContent = `UID ${user.uid}`;
        $('setupEmail').textContent = user.email || '（此帳號沒有 email）';
        $('loginPassword').value = '';
        loadCodes();
    } else {
        $('app').style.display = 'none';
        // 一定要是 flex：.login-screen 靠 flex 置中，設成 block 會讓卡片貼到左邊
        $('loginScreen').style.display = 'flex';
    }
});
