// ===== 設定：要讀取哪個 repo 的哪個資料夾 =====
const OWNER  = 'yangerplato3465';
const REPO   = 'knowledge-114';
const BRANCH = 'main';
const DIR    = 'assets/uploads';
const API    = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DIR}?ref=${BRANCH}`;

const list = document.getElementById('list');

function iconFor(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','gif','webp','svg','bmp'].includes(ext)) return 'fa-file-image';
    if (['mp3','wav','ogg','m4a','flac'].includes(ext)) return 'fa-file-audio';
    if (['mp4','webm','mov','avi'].includes(ext)) return 'fa-file-video';
    if (['json','js','html','css','txt','csv','xml'].includes(ext)) return 'fa-file-code';
    if (['zip','rar','7z','tar','gz'].includes(ext)) return 'fa-file-zipper';
    return 'fa-file';
}

function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function showState(cls, icon, text) {
    list.innerHTML = `<div class="state ${cls}"><i class="fa-solid ${icon}"></i>${text}</div>`;
}

async function load() {
    let res;
    try {
        res = await fetch(API, { headers: { 'Accept': 'application/vnd.github+json' } });
    } catch (e) {
        return showState('err', 'fa-triangle-exclamation', '無法連線，請稍後再試。');
    }

    if (res.status === 404) return showState('', 'fa-box-open', '素材庫還是空的，快去上傳第一個檔案吧！');
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')
        return showState('err', 'fa-clock', '目前查詢人數較多，請稍等幾分鐘再重新整理。');
    if (!res.ok) return showState('err', 'fa-triangle-exclamation', `載入失敗（HTTP ${res.status}）`);

    let items = await res.json();
    items = items
        .filter(f => f.type === 'file' && f.name !== '.gitkeep')
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));

    if (!items.length) return showState('', 'fa-box-open', '素材庫還是空的，快去上傳第一個檔案吧！');

    list.innerHTML = '';
    for (const f of items) {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `
            <i class="fa-solid ${iconFor(f.name)} file-icon"></i>
            <div class="file-info">
                <div class="file-name">${f.name}</div>
                <div class="file-size">${fmtSize(f.size)}</div>
            </div>
            <a class="dl-btn" href="${f.download_url}" download="${f.name}">
                <i class="fa-solid fa-download"></i> 下載
            </a>`;
        list.appendChild(row);
    }
}

load();
