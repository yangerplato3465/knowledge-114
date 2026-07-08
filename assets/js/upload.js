// ===== 設定：要存到哪個 repo 的哪個資料夾 =====
const OWNER  = 'yangerplato3465';
const REPO   = 'knowledge-114';
const BRANCH = 'main';
const DIR    = 'assets/uploads';
const API    = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

const tokenInput = document.getElementById('token');
const rememberBox = document.getElementById('remember');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const dropText = document.getElementById('dropText');
const uploadBtn = document.getElementById('uploadBtn');
const results = document.getElementById('results');
const manageList = document.getElementById('manageList');
const refreshListBtn = document.getElementById('refreshBtn');

let selectedFiles = [];

// 還原記住的權杖
const saved = localStorage.getItem('gh_upload_token');
if (saved) { tokenInput.value = saved; rememberBox.checked = true; }

function refreshBtn() {
    uploadBtn.disabled = !(tokenInput.value.trim() && selectedFiles.length);
}
tokenInput.addEventListener('input', refreshBtn);

// 檔案選擇
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => setFiles([...fileInput.files]));

['dragover', 'dragenter'].forEach(ev =>
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(ev =>
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', e => setFiles([...e.dataTransfer.files]));

function setFiles(files) {
    selectedFiles = files;
    dropText.textContent = files.length
        ? `已選 ${files.length} 個檔案：${files.map(f => f.name).join('、')}`
        : '點這裡選檔，或把檔案拖進來';
    refreshBtn();
}

// 把檔案讀成 base64（安全處理二進位）
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const bytes = new Uint8Array(reader.result);
            let binary = '';
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            resolve(btoa(binary));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function rowFor(name) {
    const row = document.createElement('div');
    row.className = 'result-row pending';
    row.innerHTML = `<i class="fa-solid fa-spinner fa-spin r-icon"></i>
                     <span class="r-name">${name}</span>
                     <span class="r-msg">上傳中…</span>`;
    results.appendChild(row);
    return row;
}
function setRow(row, ok, msg) {
    row.className = 'result-row ' + (ok ? 'ok' : 'err');
    row.querySelector('.r-icon').className =
        'fa-solid r-icon ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark');
    row.querySelector('.r-msg').textContent = msg;
}

async function uploadOne(file, token) {
    const path = `${DIR}/${file.name}`;
    const url = `${API}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
    };

    // 若檔名已存在，取得 sha 以便覆蓋更新
    let sha;
    const head = await fetch(`${url}?ref=${BRANCH}`, { headers });
    if (head.status === 200) sha = (await head.json()).sha;

    const content = await fileToBase64(file);
    const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            message: `上傳素材：${file.name}`,
            content,
            branch: BRANCH,
            ...(sha ? { sha } : {})
        })
    });

    if (res.ok) return sha ? '已更新' : '完成';
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
}

uploadBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (rememberBox.checked) localStorage.setItem('gh_upload_token', token);
    else localStorage.removeItem('gh_upload_token');

    uploadBtn.disabled = true;
    results.innerHTML = '';

    for (const file of selectedFiles) {
        const row = rowFor(file.name);
        try {
            const msg = await uploadOne(file, token);
            setRow(row, true, msg);
        } catch (e) {
            setRow(row, false, e.message);
        }
    }

    uploadBtn.disabled = false;
    loadManage();
});

// ===== 管理／刪除已上傳的素材 =====
function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

async function loadManage() {
    manageList.innerHTML = '<div class="m-state">載入中…</div>';
    // 有貼 Token 時用「已登入」方式讀取，額度從 60/hr 提升到 5000/hr
    const token = tokenInput.value.trim();
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${API}/${DIR}?ref=${BRANCH}`, { headers });
    } catch (e) {
        manageList.innerHTML = '<div class="m-state">無法連線，稍後再試。</div>';
        return;
    }
    if (res.status === 404) {
        manageList.innerHTML = '<div class="m-state">素材庫還是空的。</div>';
        return;
    }
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
        manageList.innerHTML = '<div class="m-state">GitHub 查詢次數暫時用完了。請在上方貼上 Token 再按「重新整理」，即可解除限制。</div>';
        return;
    }
    if (!res.ok) {
        manageList.innerHTML = `<div class="m-state">載入失敗（HTTP ${res.status}）</div>`;
        return;
    }

    let items = (await res.json())
        .filter(f => f.type === 'file' && f.name !== '.gitkeep')
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));

    if (!items.length) {
        manageList.innerHTML = '<div class="m-state">素材庫還是空的。</div>';
        return;
    }

    manageList.innerHTML = '';
    for (const f of items) {
        const row = document.createElement('div');
        row.className = 'm-row';
        row.innerHTML = `
            <span class="m-name">${f.name}</span>
            <span class="m-size">${fmtSize(f.size)}</span>
            <button class="del-btn"><i class="fa-solid fa-trash"></i> 刪除</button>`;
        row.querySelector('.del-btn').addEventListener('click', () =>
            deleteFile(f.name, f.sha, row));
        manageList.appendChild(row);
    }
}

async function deleteFile(name, sha, row) {
    const token = tokenInput.value.trim();
    if (!token) {
        alert('請先在上方貼上 GitHub 權杖，才能刪除檔案。');
        return;
    }
    if (!confirm(`確定要刪除「${name}」嗎？此動作無法復原。`)) return;

    const btn = row.querySelector('.del-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 刪除中…';

    const path = `${DIR}/${name}`;
    const url = `${API}/${path.split('/').map(encodeURIComponent).join('/')}`;
    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({ message: `刪除素材：${name}`, sha, branch: BRANCH })
        });
        if (res.ok) {
            row.remove();
            if (!manageList.querySelector('.m-row'))
                manageList.innerHTML = '<div class="m-state">素材庫還是空的。</div>';
        } else {
            const err = await res.json().catch(() => ({}));
            alert('刪除失敗：' + (err.message || `HTTP ${res.status}`));
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash"></i> 刪除';
        }
    } catch (e) {
        alert('刪除失敗：' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i> 刪除';
    }
}

refreshListBtn.addEventListener('click', loadManage);
loadManage();
