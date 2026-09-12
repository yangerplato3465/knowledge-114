import { db, auth } from './class-rpg-firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

// 只訂閱目前老師的班級，切班／登出時先清空舊世界。
export function connectWorld({ select, onStudents, onStatus }) {
    let stopClasses = null, stopStudents = null, classes = [], currentId = '', generation = 0, authGeneration = 0;
    const requested = new URLSearchParams(location.search).get('class');
    function clearStudents() { generation++; stopStudents?.(); stopStudents = null; onStudents([]); }
    function choose(id) {
        clearStudents(); currentId = id; select.value = id;
        if (!id) return;
        onStatus('正在載入班級角色…');
        const token = generation;
        stopStudents = onSnapshot(collection(db, 'classes', id, 'students'), { includeMetadataChanges: true }, snap => {
            if (token !== generation) return;
            const students = snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-TW'));
            onStudents(students);
            onStatus(snap.metadata.fromCache ? '顯示快取名冊，正在等待雲端同步。' : students.length ? `全班 ${students.length} 位冒險者已到齊，自由散步中。` : '這個班級尚無學生，請回班級管理新增。');
        }, () => {
            if (token !== generation) return;
            clearStudents(); onStatus('無法讀取角色，請確認登入與網路後重新選擇班級。');
        });
    }
    const change = () => { if (classes.some(c => c.id === select.value)) choose(select.value); };
    select.addEventListener('change', change);
    const stopAuth = onAuthStateChanged(auth, user => {
        const authToken = ++authGeneration;
        stopClasses?.(); stopClasses = null; clearStudents(); currentId = ''; classes = [];
        select.replaceChildren(); select.disabled = true;
        if (!user) { onStatus('請先回班級管理登入老師帳號，再開啟冒險世界。'); return; }
        onStatus('正在讀取老師的班級…');
        stopClasses = onSnapshot(query(collection(db, 'classes'), where('ownerId', '==', user.uid)), snap => {
            if (authToken !== authGeneration) return;
            classes = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            const pick = classes.some(c => c.id === currentId) ? currentId : classes.some(c => c.id === requested) ? requested : classes[0]?.id || '';
            select.replaceChildren(...classes.map(c => new Option(String(c.name || '未命名班級'), c.id)));
            select.disabled = !classes.length; select.value = pick;
            if (!pick) { clearStudents(); currentId = ''; onStatus('尚無班級，請回班級管理建立。'); }
            else if (pick !== currentId) choose(pick);
        }, () => { if (authToken !== authGeneration) return; clearStudents(); select.disabled = true; onStatus('無法讀取班級，請檢查網路與教師權限後重新整理。'); });
    });
    return () => { stopAuth(); stopClasses?.(); clearStudents(); select.removeEventListener('change', change); };
}
