import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getFirestore, collection, doc, addDoc, setDoc, getDocs,
    deleteDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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

// ---- DOM ----
const $ = id => document.getElementById(id);
const classSelect = $('classSelect');
const studentList = $('studentList');
const studentEmpty = $('studentEmpty');
const countBadge = $('countBadge');

let currentClassId = null;
let unsubStudents = null;
let currentUser = null;

function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

const genderEmoji = g => g === '女' ? '🧝‍♀️' : g === '男' ? '🧙‍♂️' : '🧚';
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
    const name = prompt('輸入班級名稱：', '');
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
    watchStudents(id);
}

// ---- 學生 ----
function watchStudents(classId) {
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
        renderStudents(students);
    }, err => {
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
    studentList.innerHTML = students.map(s => {
        const name = escapeHtml(s.name || '');
        return `
        <div class="student" data-id="${s.id}">
            <div class="student-top">
                <div class="avatar">${genderEmoji(s.gender)}</div>
                <div>
                    <div class="student-name">${name}</div>
                    <div class="student-lv">Lv.${num(s.level)} · ${escapeHtml(s.gender || '—')}</div>
                </div>
            </div>
            <div class="stats">
                <div class="stat"><span class="k">⭐ 經驗</span><span class="v">${num(s.exp)}</span>
                    <span class="adj"><button data-act="exp" data-d="-10">−</button><button data-act="exp" data-d="10">＋</button></span></div>
                <div class="stat"><span class="k">🪙 金幣</span><span class="v">${num(s.gold)}</span>
                    <span class="adj"><button data-act="gold" data-d="-5">−</button><button data-act="gold" data-d="5">＋</button></span></div>
                <div class="stat"><span class="k">🗡️ 武器</span><span class="v">${escapeHtml(s.weapon || '—')}</span></div>
                <div class="stat"><span class="k">🛡️ 裝備</span><span class="v">${escapeHtml(s.equipment || '—')}</span></div>
            </div>
            <div class="student-actions">
                <button class="btn btn-ghost btn-sm" data-act="edit">編輯</button>
                <button class="btn-danger btn btn-sm" data-act="del">刪除</button>
            </div>
        </div>`;
    }).join('');
}

// 事件委派：加減 / 編輯 / 刪除
studentList.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const card = e.target.closest('.student');
    const sid = card?.dataset.id;
    if (!sid || !currentClassId) return;
    const ref = doc(db, 'classes', currentClassId, 'students', sid);
    const act = btn.dataset.act;

    if (act === 'exp' || act === 'gold') {
        const cur = num(card.querySelector(`[data-act="${act}"]`).closest('.stat').querySelector('.v').textContent);
        const next = Math.max(0, cur + Number(btn.dataset.d));
        await updateDoc(ref, { [act]: next });
    } else if (act === 'del') {
        const nm = card.querySelector('.student-name').textContent;
        if (confirm(`確定刪除學生「${nm}」？`)) { await deleteDoc(ref); toast('已刪除'); }
    } else if (act === 'edit') {
        openEdit(sid, card);
    }
});

async function openEdit(sid, card) {
    const nm = card.querySelector('.student-name').textContent;
    const level = prompt(`「${nm}」的等級：`, num(card.querySelector('.student-lv').textContent.match(/Lv\.(\d+)/)?.[1]));
    if (level === null) return;
    const weapon = prompt('武器：', card.querySelectorAll('.stat .v')[2].textContent.replace('—',''));
    if (weapon === null) return;
    const equipment = prompt('裝備：', card.querySelectorAll('.stat .v')[3].textContent.replace('—',''));
    if (equipment === null) return;
    await updateDoc(doc(db, 'classes', currentClassId, 'students', sid), {
        level: num(level), weapon: weapon.trim(), equipment: equipment.trim()
    });
    toast('已更新');
}

async function addStudent() {
    if (!currentClassId) { toast('請先建立或選擇班級'); return; }
    const name = $('f_name').value.trim();
    if (!name) { toast('請輸入姓名'); $('f_name').focus(); return; }
    const data = {
        name,
        gender: $('f_gender').value,
        level: num($('f_level').value) || 1,
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
    $('f_exp').value = 0; $('f_gold').value = 0; $('f_level').value = 1;
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
        currentClassId = null;
        $('app').style.display = 'none';
        $('loginScreen').style.display = 'flex';
    }
});

// ---- 綁定 ----
classSelect.addEventListener('change', e => selectClass(e.target.value));
$('newClassBtn').addEventListener('click', createClass);
$('delClassBtn').addEventListener('click', deleteCurrentClass);
$('addStudentBtn').addEventListener('click', addStudent);
$('f_name').addEventListener('keydown', e => { if (e.key === 'Enter') addStudent(); });
$('loginBtn').addEventListener('click', doLogin);
$('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginPassword').focus(); });
$('logoutBtn').addEventListener('click', () => signOut(auth));
$('editNameBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    const name = prompt('設定你的顯示名稱（例如：Gorgeous Tr.Anita）：', currentUser.displayName || '');
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
