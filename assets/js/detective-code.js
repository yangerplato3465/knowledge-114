// ============================================================
// 偵探事件簿 · 驗證碼的共用規則
//
// 後台頁（產碼）跟遊戲頁（驗碼）一定要用「完全一樣」的推導方式，
// 差一個字元算出來的雜湊就對不上、所有碼都會失效，
// 所以這段刻意抽成共用檔，不要在兩邊各寫一份。
// ============================================================

// Crockford Base32：拿掉 I L O U，避免小孩把 0/O、1/I 抄錯唸錯
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// 推導雜湊時混進去的固定字串。它擋不住看得到原始碼的人（這是靜態站，
// 前端沒有秘密可言），作用是萬一 Firestore 資料被匯出，那堆雜湊也不能
// 直接拿去別的地方套用。真正的防線是安全規則裡的 list:false。
const PEPPER = 'knowledge-114/detective/unlock/v1';

// 刻意用 PBKDF2 而不是單純 SHA-256：6 碼 Base32 只有十億種組合，
// 單純雜湊在離線環境幾秒就能全部算完；15 萬次迭代讓每一次嘗試要
// 花上約 0.1 秒，暴力枚舉就變成好幾年。使用者只有解鎖時算一次，無感。
const PBKDF2_ITERATIONS = 150000;

// 目前有哪些偵探關卡。以後新增關卡就在這裡加一行，
// 後台頁的下拉選單、驗證碼前綴都會自動跟著長出來。
export const DETECTIVE_GAMES = [
    { id: 'owl', prefix: 'OWL', name: '黃金貓頭鷹雕像失竊事件' },
];

// 把使用者輸入洗乾淨：轉大寫、丟掉空白與連字號。
// 這樣 "owl-7k3m-92"、"OWL 7K3M 92"、"OWL7K3M92" 都算同一組碼。
export function normalizeCode(raw) {
    return String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// 產生一組新的碼，格式 PREFIX-XXXX-XX（例：OWL-7K3M-92）。
// 256 剛好是 32 的整數倍，所以 b % 32 的分布是均勻的，沒有偏差。
export function randomCode(prefix) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const body = Array.from(bytes, b => ALPHABET[b % 32]).join('');
    return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
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
