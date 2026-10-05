// ============================================================
// 偵探事件簿 · 驗證碼的共用規則
//
// 後台頁（產碼）跟遊戲頁（驗碼）一定要用「完全一樣」的推導方式，
// 差一個字元算出來的雜湊就對不上、所有碼都會失效，
// 所以這段刻意抽成共用檔，不要在兩邊各寫一份。
// ============================================================

// 推導雜湊時混進去的固定字串。它擋不住看得到原始碼的人（這是靜態站，
// 前端沒有秘密可言），作用是萬一 Firestore 資料被匯出，那堆雜湊也不能
// 直接拿去別的地方套用。真正的防線是安全規則裡的 list:false。
const PEPPER = 'knowledge-114/detective/unlock/v1';

// 延續既有雜湊設定，已發出的舊碼及其進度才能繼續使用。
const PBKDF2_ITERATIONS = 150000;

// 目前有哪些偵探關卡。以後新增關卡就在這裡加一行，
// 後台頁的下拉選單、驗證碼前綴都會自動跟著長出來。
// 新碼格式由 prefix 決定（PREFIX-0000），跟 id 多長完全無關 ——
// id 學生永遠看不到，它只進 PBKDF2 的金鑰。所以 id 可以取得清楚一點，
// prefix 維持三個字母，碼就一樣短好抄。
//
// ★ 'owl' 這個 id 跟它的檔名（golden-owl）不一致，是因為檔名後來才改，
//   而 id 發過碼之後就不能動了。新案的 id 直接跟檔名取一樣的，不要再留落差。
export const DETECTIVE_GAMES = [
    { id: 'owl', prefix: 'OWL', name: '黃金貓頭鷹雕像失竊事件' },
];

// 把使用者輸入洗乾淨：轉大寫、丟掉空白與連字號。
// 舊碼如 "OWL-7K3M-92" 仍照原樣驗證，不截短或重新計算既有文件 ID。
export function normalizeCode(raw) {
    return String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// 新碼為三個案件字母 + 四位數字（例：OWL-0042）。
// 先排除 60000 以上的 16-bit 值，讓 0000–9999 的抽取機率相同。
export function randomCode(prefix) {
    if (!/^[A-Z]{3}$/.test(prefix)) throw new Error('INVALID_PREFIX');
    const sample = new Uint16Array(1);
    do { crypto.getRandomValues(sample); } while (sample[0] >= 60000);
    return `${prefix}-${String(sample[0] % 10000).padStart(4, '0')}`;
}

export function isLocalPreview(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1'
        || hostname === '[::1]' || hostname === '::1';
}

// 由「關卡 + 碼」推出 Firestore 的文件 ID。
// 文件 ID 本身就是通行證：安全規則只開放 get、關掉 list，
// 所以不知道碼的人連集合裡有哪些文件都查不到，無從對起。
export async function deriveCodeId(gameId, code) {
    if (!crypto?.subtle) {
        // file:// 開啟時 crypto.subtle 不存在（非安全來源）
        throw new Error('INSECURE_CONTEXT');
    }
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', enc.encode(`${gameId}:${normalizeCode(code)}`), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: enc.encode(PEPPER),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        key, 256
    );
    return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}
