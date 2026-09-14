import { growthOf, growthFields, statsOf } from "./class-rpg-model.js";
import { db, auth } from "./class-rpg-firebase.js";
import {
    collection, doc, addDoc, getDocs,
    deleteDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// ---- DOM ----
const $ = id => document.getElementById(id);
const classSelect = $('classSelect');
const studentList = $('studentList');
const studentEmpty = $('studentEmpty');
const countBadge = $('countBadge');

let currentClassId = null;
let unsubStudents = null;
let currentUser = null;
let roster = [], selected = new Set(), busy = false, rosterReady = false;
let unsubClass = null, classData = {};
const lessonId = crypto.randomUUID();


function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// ---- 班級 ----
async function loadClasses(selectId) {
    if (!currentUser) return;
    // 只讀取屬於這位老師的班級（用戶端排序，免建複合索引）
    const snap = await getDocs(
        query(collection(db, 'classes'), where('ownerId', '==', currentUser.uid))
    );
    const classes = [];
    snap.forEach(d => classes.push({ id: d.id, ...d.data() }));
    classes.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

    if (classes.length === 0) {
        classSelect.innerHTML = '<option value="">尚無班級，請先建立</option>';
        currentClassId = null;
        watchStudents(null);
        return;
    }
    classSelect.innerHTML = classes
        .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        .join('');
    const pick = selectId && classes.some(c => c.id === selectId)
        ? selectId : classes[0].id;
    classSelect.value = pick;
    selectClass(pick);
}

async function createClass() {
    const name = await askText('建立班級', '班級名稱', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) { toast('班級名稱不可空白'); return; }
    const ref = await addDoc(collection(db, 'classes'), {
        name: trimmed,
        ownerId: currentUser.uid,
        createdAt: serverTimestamp()
    });
    toast('已建立班級：' + trimmed);
    await loadClasses(ref.id);
}

async function deleteCurrentClass() {
    if (!currentClassId) { toast('尚未選擇班級'); return; }
    const name = classSelect.options[classSelect.selectedIndex]?.text || '';
    if (!confirm(`確定刪除班級「${name}」？此班級所有學生資料也會一併刪除，無法復原。`)) return;
    // 先刪學生子集合
    const studentsSnap = await getDocs(collection(db, 'classes', currentClassId, 'students'));
    await Promise.all(studentsSnap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'classes', currentClassId));
    toast('已刪除班級');
    await loadClasses();
}

function selectClass(id) {
    currentClassId = id;
    $('gameLink').href = `class-rpg-game.html?class=${encodeURIComponent(id)}`;
    watchStudents(id);
}

// ---- 學生 ----
function watchStudents(classId) {
    roster = []; selected.clear(); rosterReady = false; classData = {};
    if (unsubClass) unsubClass();
    unsubClass = null;
    renderRewardState();
    if (classId) unsubClass = onSnapshot(doc(db, 'classes', classId), snap => {
        classData = snap.data() || {}; renderRewardState();
    }, () => { rosterReady = false; renderRewardState(); toast('無法讀取班級，請重新選擇班級'); });
    if (unsubStudents) { unsubStudents(); unsubStudents = null; }
    if (!classId) {
        studentList.innerHTML = '';
        studentEmpty.style.display = 'block';
        studentEmpty.textContent = '尚無班級，請先建立班級。';
        countBadge.textContent = '';
        return;
    }
    const col = collection(db, 'classes', classId, 'students');
    unsubStudents = onSnapshot(query(col, orderBy('name', 'asc')), snap => {
        const students = [];
        snap.forEach(d => students.push({ id: d.id, ...d.data() }));
        roster = students;
        selected = new Set([...selected].filter(id => students.some(s => s.id === id)));
        rosterReady = true;
        renderStudents(students);
        renderRewardState();
    }, err => {
        rosterReady = false; renderRewardState();
        console.error(err);
        studentEmpty.style.display = 'block';
        studentEmpty.textContent = '載入失敗：' + err.message;
    });
}

function renderStudents(students) {
    countBadge.textContent = students.length ? `（${students.length} 人）` : '';
    if (!students.length) {
        studentList.innerHTML = '';
        studentEmpty.style.display = 'block';
        studentEmpty.textContent = '這個班級還沒有學生，用上方表單新增吧！';
        return;
    }
    studentEmpty.style.display = 'none';
    const activeIds = new Set(targets().map(s => s.id));
    studentList.innerHTML = students.map(s => {
        const name = escapeHtml(s.name || '');
        const stats = statsOf(s);
        return `
        <div class="student" data-id="${s.id}">
            <div class="student-top">
                <div class="avatar pixel-avatar" aria-hidden="true"></div>
                <div>
                    <div class="student-name">${name}</div>
                    <div class="student-lv">Lv.${stats.level} · ${escapeHtml(s.gender || '—')}</div>
                </div>
            </div>
            <div class="stats">
                <div class="stat"><span class="k">⭐ 經驗</span><span class="v">${num(s.exp)}</span></div>
                <div class="stat"><span class="k">🪙 金幣</span><span class="v">${num(s.gold)}</span></div>
                <div class="stat"><span class="k">🗡️ 武器</span><span class="v">${escapeHtml(s.weapon || '—')}</span></div>
                <div class="stat"><span class="k">🛡️ 裝備</span><span class="v">${escapeHtml(s.equipment || '—')}</span></div>
            </div>
            <div class="growth-stats">生命 ${stats.hp} · 攻擊 ${stats.atk} · 防禦 ${stats.def}</div>
            <div class="student-lv">${stats.cost ? `距離升級還需 ${stats.remaining} 經驗` : '已達等級上限'}</div>
            <div class="student-team">小隊：${escapeHtml(s.team || '未分組')}</div>
            <div class="student-actions">
                <button class="btn btn-ghost" data-act="select" aria-pressed="${activeIds.has(s.id)}">${activeIds.has(s.id) ? '已選取' : '選取'}</button>
                <button class="btn btn-ghost btn-sm" data-act="edit">編輯</button>
                <button class="btn-danger btn btn-sm" data-act="del">刪除</button>
            </div>
        </div>`;
    }).join('');
}

// 名冊操作共用鎖定，避免重複送出。
studentList.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    const sid = btn?.closest('.student')?.dataset.id;
    if (!sid || !currentClassId || busy) return;
    if (btn.dataset.act === 'select') {
        $('selectionMode').value = 'individual';
        selected.has(sid) ? selected.delete(sid) : selected.add(sid);
        renderStudents(roster); renderRewardState(); return;
    }
    const student = roster.find(s => s.id === sid);
    const classId = currentClassId;
    if (btn.dataset.act === 'edit') {
        const values = await formDialog('編輯角色', [
            ['name', '姓名', student.name], ['team', '小隊（可留白）', student.team || ''],
            ['weapon', '武器', student.weapon || ''], ['equipment', '防具', student.equipment || '']
        ]);
        if (!values || !values.name.trim()) return;
        await perform(() => updateDoc(doc(db, 'classes', classId, 'students', sid),
            Object.fromEntries(Object.entries(values).map(([k,v]) => [k,v.trim()]))));
    } else if (btn.dataset.act === 'del') {
        if (confirm('確定刪除學生「' + student.name + '」？'))
            await perform(() => deleteDoc(doc(db, 'classes', classId, 'students', sid)));
    }
});

async function addStudent() {
    if (!currentClassId) { toast('請先建立或選擇班級'); return; }
    const name = $('f_name').value.trim();
    if (!name) { toast('請輸入姓名'); $('f_name').focus(); return; }
    const initial = ['f_exp', 'f_gold'].map(id => Number($(id).value));
    if (initial.some(n => !Number.isSafeInteger(n) || n < 0)) {
        toast('經驗與金幣須為非負整數'); return;
    }
    const data = {
        name,
        gender: $('f_gender').value,
        team: $('f_team').value.trim(),
        schemaVersion: 2,
        growthVersion: 1, expOffset: 0,
        level: growthOf({ exp: num($('f_exp').value) }).level,
        exp: num($('f_exp').value),
        gold: num($('f_gold').value),
        weapon: $('f_weapon').value.trim(),
        equipment: $('f_equipment').value.trim(),
        createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'classes', currentClassId, 'students'), data);
    toast('已新增：' + name);
    // 清空表單（保留性別/等級預設）
    ['f_name','f_weapon','f_equipment'].forEach(id => $(id).value = '');
    $('f_exp').value = 0; $('f_gold').value = 0;
    $('f_name').focus();
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
    ));
}

// ---- 登入 / 登出 ----
function authErrMsg(code) {
    const m = {
        'auth/invalid-email': '電子郵件格式不正確',
        'auth/invalid-credential': '帳號或密碼錯誤',
        'auth/wrong-password': '帳號或密碼錯誤',
        'auth/user-not-found': '帳號或密碼錯誤',
        'auth/too-many-requests': '嘗試次數過多，請稍後再試',
        'auth/user-disabled': '此帳號已被停用'
    };
    return m[code] || ('登入失敗：' + code);
}

async function doLogin() {
    const email = $('loginEmail').value.trim();
    const pw = $('loginPassword').value;
    const errEl = $('loginErr');
    errEl.textContent = '';
    if (!email || !pw) { errEl.textContent = '請輸入電子郵件與密碼'; return; }
    $('loginBtn').disabled = true;
    try {
        await signInWithEmailAndPassword(auth, email, pw);
        // onAuthStateChanged 會接手切換畫面
    } catch (err) {
        errEl.textContent = authErrMsg(err.code || err.message);
    } finally {
        $('loginBtn').disabled = false;
    }
}

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        $('loginScreen').style.display = 'none';
        $('app').style.display = 'block';
        $('whoEmail').textContent = user.displayName || user.email || user.uid;
        $('loginPassword').value = '';
        loadClasses().catch(err => {
            console.error(err);
            toast('讀取班級失敗：' + err.message);
            classSelect.innerHTML = '<option value="">讀取失敗</option>';
        });
    } else {
        // 未登入：清空並顯示登入畫面
        if (unsubStudents) { unsubStudents(); unsubStudents = null; }
        currentClassId = null; watchStudents(null);
        $('app').style.display = 'none';
        $('loginScreen').style.display = 'flex';
    }
});

// ---- 綁定 ----
classSelect.addEventListener('change', e => selectClass(e.target.value));
$('newClassBtn').addEventListener('click', () => perform(createClass));
$('delClassBtn').addEventListener('click', () => perform(deleteCurrentClass));
$('addStudentBtn').addEventListener('click', () => perform(addStudent));
$('f_name').addEventListener('keydown', e => { if (e.key === 'Enter') perform(addStudent); });
$('loginBtn').addEventListener('click', doLogin);
$('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginPassword').focus(); });
$('logoutBtn').addEventListener('click', () => signOut(auth));
$('editNameBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    const name = await askText('顯示名稱', '老師名稱', currentUser.displayName || '');
    if (name === null) return;
    const trimmed = name.trim();
    try {
        await updateProfile(currentUser, { displayName: trimmed });
        $('whoEmail').textContent = trimmed || currentUser.email || currentUser.uid;
        toast(trimmed ? '已更新名稱' : '已清除名稱');
    } catch (err) {
        toast('更新失敗：' + err.message);
    }
});

// 獎勵和紀錄寫在同一個交易；沿用班級擁有者規則，不新增公開資料路徑。
function targets() {
    const mode = $('selectionMode').value;
    return roster.filter(s => mode === 'all' || (mode === 'team'
        ? Boolean(s.team) && s.team === $('teamSelect').value : selected.has(s.id)));
}
function renderRewardState() {
    const teamValue = $('teamSelect').value;
    const teams = [...new Set(roster.map(s => s.team).filter(Boolean))].sort();
    $('teamSelect').innerHTML = '<option value="">請選擇小隊</option>' + teams.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    if (teams.includes(teamValue)) $('teamSelect').value = teamValue;
    $('teamField').hidden = $('selectionMode').value !== 'team';
    const people = targets();
    $('selectionSummary').textContent = people.length ? `已選取 ${people.length} 人：${people.map(s => s.name).join('、')}` : '尚未選取學生';
    $('connectionState').textContent = !navigator.onLine ? '目前離線，暫停寫入。連線恢復後請重新操作。' : busy ? '正在處理，請稍候…' : !rosterReady ? '等待班級名冊載入…' : '名冊已載入；獎勵成功後會顯示紀錄。';
    $('rewardBtn').textContent = busy ? '處理中…' : `發送獎勵${people.length ? `（${people.length} 人）` : ''}`;
    $('rewardBtn').disabled = busy || !navigator.onLine || !rosterReady || !people.length;
    const history = (classData.rewardHistory || []).filter(e => e.lessonId === lessonId);
    $('undoBtn').disabled = busy || !navigator.onLine || !rosterReady || !history.some(e => !e.undone);
    $('rewardHistory').innerHTML = history.length ? history.slice().reverse().map(e => `<li>${escapeHtml(new Date(e.at).toLocaleTimeString('zh-TW'))} · ${escapeHtml(e.reason)} · ${e.students.length} 人，每人 +${e.amount} 經驗${e.undone ? '（已復原）' : ''}<br>${escapeHtml(e.students.map(s => s.name).join('、'))}</li>`).join('') : '<li>本堂課尚無獎勵紀錄。</li>';
    for (const id of ['classSelect','newClassBtn','delClassBtn','addStudentBtn','logoutBtn','editNameBtn','selectionMode','teamSelect','clearSelection','rewardReason','rewardAmount']) $(id).disabled = busy;
    studentList.querySelectorAll('button').forEach(b => b.disabled = busy);
}
async function perform(work) {
    if (busy) return;
    if (!navigator.onLine) { toast('目前離線，請恢復連線後再試'); return; }
    busy = true; renderRewardState();
    try { await work(); }
    catch (err) { console.error(err); toast('操作未完成：' + (err.message || '請重試')); }
    finally { busy = false; renderRewardState(); }
}
async function grantReward() {
    const ids = targets().map(s => s.id);
    const amount = Number($('rewardAmount').value);
    if (!currentClassId || !rosterReady || !ids.length) return;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000) { toast('經驗值請輸入 1～1000 的整數'); return; }
    if (ids.length > 100) { toast('單次最多選取 100 人，請分小隊操作'); return; }
    const classId = currentClassId, uid = currentUser.uid;
    const operationId = crypto.randomUUID(), reason = $('rewardReason').value;
    await perform(async () => {
        await runTransaction(db, async tx => {
            const classRef = doc(db, 'classes', classId);
            const c = await tx.get(classRef);
            if (!c.exists() || c.data().ownerId !== uid) throw new Error('班級不存在或無權限');
            const history = c.data().rewardHistory || [];
            if (history.some(e => e.id === operationId)) return;
            const refs = ids.map(id => doc(db, 'classes', classId, 'students', id));
            const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
            const students = snapshots.map((snap, i) => {
                if (!snap.exists()) throw new Error('名冊已變更，請重新選取學生');
                const before = num(snap.data().exp);
                if (!Number.isSafeInteger(before) || before < 0 || !Number.isSafeInteger(before + amount)) throw new Error('學生經驗值格式不正確');
                return { id: ids[i], name: String(snap.data().name || '').slice(0,60), before, after: before + amount };
            });
            students.forEach((s,i) => tx.update(refs[i], growthFields(snapshots[i].data(), s.after)));
            tx.update(classRef, { rewardHistory: [...history, { id: operationId, lessonId, reason, amount, students, at: Date.now(), undone: false }].slice(-40) });
        });
        toast(`已獎勵 ${ids.length} 人，每人 +${amount} 經驗`);
    });
}
async function undoReward() {
    const entry = (classData.rewardHistory || []).slice().reverse().find(e => e.lessonId === lessonId && !e.undone);
    if (!entry || !currentClassId) return;
    const classId = currentClassId;
    await perform(async () => {
        await runTransaction(db, async tx => {
            const classRef = doc(db, 'classes', classId);
            const c = await tx.get(classRef);
            if (!c.exists()) throw new Error('班級已不存在');
            const history = c.data().rewardHistory || [];
            const record = history.find(e => e.id === entry.id);
            if (!record || record.undone) throw new Error('這筆紀錄已復原或已過期');
            const refs = record.students.map(s => doc(db, 'classes', classId, 'students', s.id));
            const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
            snapshots.forEach((s,i) => {
                if (!s.exists() || num(s.data().exp) !== record.students[i].after) throw new Error('學生資料已有後續變更，為避免覆蓋請先處理後續獎勵');
            });
            refs.forEach((ref,i) => tx.update(ref, growthFields(snapshots[i].data(), record.students[i].before)));
            tx.update(classRef, { rewardHistory: history.map(e => e.id === record.id ? { ...e, undone: true } : e) });
        });
        toast('已復原上一筆獎勵');
    });
}
function formDialog(title, fields) {
    const dialog = $('editDialog');
    if (dialog.open) return Promise.resolve(null);
    $('dialogTitle').textContent = title;
    $('dialogFields').innerHTML = fields.map(([key,label,value]) => `<label for="edit_${key}">${escapeHtml(label)}</label><input id="edit_${key}" name="${key}" maxlength="60" value="${escapeHtml(value)}" ${key === 'name' ? 'required' : ''}>`).join('');
    return new Promise(resolve => {
        let value = null;
        $('editForm').onsubmit = e => { e.preventDefault(); value = Object.fromEntries(new FormData(e.target)); dialog.close(); };
        $('dialogCancel').onclick = () => dialog.close();
        dialog.addEventListener('close', () => resolve(value), { once: true });
        dialog.showModal();
    });
}
async function askText(title, label, value) {
    const result = await formDialog(title, [['name', label, value]]);
    return result ? result.name : null;
}
$('selectionMode').addEventListener('change', () => { renderRewardState(); renderStudents(roster); });
$('teamSelect').addEventListener('change', () => { renderRewardState(); renderStudents(roster); });
$('clearSelection').addEventListener('click', () => { selected.clear(); $('selectionMode').value = 'individual'; renderStudents(roster); renderRewardState(); });
$('rewardBtn').addEventListener('click', grantReward);
$('undoBtn').addEventListener('click', undoReward);
window.addEventListener('online', renderRewardState);
window.addEventListener('offline', renderRewardState);
