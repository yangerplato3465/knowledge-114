// === 各題庫的佔位用題目 (placeholder questions per pool) ===
// 這個檔案只放題庫資料，方便日後新增 / 修改題目。
// 需在 math-rpg.js 之前載入，提供全域變數 QUESTION_POOLS。

// === 整數、小數除以整數：動態產生題目（不使用固定題庫）===
// 規則：答案最多 3 位小數、兩數皆 2 位數以內、適合五年級、選項夠接近不會太明顯
function poolRandInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function poolRound3(x) { return Math.round(x * 1000) / 1000; }
function poolTerminates3(x) { return Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-9; }
function poolDecimals(x) {
    const s = poolRound3(x).toString();
    const i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
}
function poolFmt(x) { return parseFloat(poolRound3(x).toFixed(3)).toString(); }
function poolShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 容易得到「會除盡且 ≤3 位小數」結果的分母
const DIVIDE_DENOMS = [2, 4, 5, 8, 10, 16, 20, 25, 40, 50];

function generateDivideQuestion() {
    let a, b, value;
    do {
        b = DIVIDE_DENOMS[poolRandInt(0, DIVIDE_DENOMS.length - 1)];
        a = poolRandInt(2, 99);
        value = a / b;
    } while (!(value >= 0.1 && value < 10 && !Number.isInteger(value) && poolTerminates3(value)));

    const correct = poolRound3(value);
    const dp = poolDecimals(correct);          // 正確答案的小數位數
    const unit = Math.pow(10, -dp);            // 最後一位的大小

    // 產生與正解相近的誘答選項
    const deltas = poolShuffle([unit, -unit, 2 * unit, -2 * unit, 3 * unit, -3 * unit, 0.1, -0.1]);
    const values = [correct];
    for (const d of deltas) {
        if (values.length >= 4) break;
        const cand = poolRound3(correct + d);
        if (cand > 0 && poolTerminates3(cand) && !values.some(v => Math.abs(v - cand) < 1e-9)) {
            values.push(cand);
        }
    }
    let k = 4;
    while (values.length < 4) { // 萬一不夠就再補
        const cand = poolRound3(correct + k * unit);
        if (cand > 0 && !values.some(v => Math.abs(v - cand) < 1e-9)) values.push(cand);
        k++;
    }

    const correctStr = poolFmt(correct);
    const options = poolShuffle(values).map(poolFmt);
    const asFraction = Math.random() < 0.5; // 兩種題型：分數化小數 或 直接除法
    const q = asFraction
        ? `${a}/${b} = ?（用小數表示）`
        : `${a} ÷ ${b} = ?（用小數表示）`;

    return { q, a: options, correct: options.indexOf(correctStr) };
}

const POOL_SURFACE = [
    { q: "邊長 2 公分正方體的表面積？", a: ["20", "24", "16", "12"], correct: 1 },
    { q: "長3寬2高1長方體的表面積？", a: ["22", "20", "18", "24"], correct: 0 },
    { q: "邊長 5 公分正方形的面積？",   a: ["20", "25", "30", "10"], correct: 1 },
    { q: "邊長 1 公分正方體的表面積？", a: ["4", "6", "8", "1"],     correct: 1 }
];

const POOL_RATIO = [
    { q: "80 的 50% 是多少？",     a: ["30", "40", "45", "50"],         correct: 1 },
    { q: "1/4 等於百分之幾？",     a: ["20%", "25%", "40%", "50%"],     correct: 1 },
    { q: "0.3 化成百分率是多少？", a: ["3%", "30%", "33%", "13%"],      correct: 1 },
    { q: "20 是 100 的百分之幾？", a: ["20%", "2%", "5%", "25%"],       correct: 0 }
];

const POOL_TIME = [
    { q: "2 小時 30 分 × 2 = ?", a: ["4 小時", "5 小時", "5 小時 30 分", "4 小時 30 分"], correct: 1 },
    { q: "3 小時 ÷ 2 = ?",       a: ["1 小時 30 分", "1 小時 20 分", "2 小時", "1 小時"], correct: 0 },
    { q: "1 分 20 秒 × 3 = ?",   a: ["3 分", "4 分", "3 分 40 秒", "4 分 20 秒"],         correct: 1 },
    { q: "6 小時 ÷ 3 = ?",       a: ["1 小時", "2 小時", "3 小時", "2 小時 30 分"],       correct: 1 }
];

const POOL_UNITS = [
    { q: "1 公里 = 幾公尺？",  a: ["100", "1000", "10000", "10"],  correct: 1 },
    { q: "1 公噸 = 幾公斤？",  a: ["100", "1000", "500", "10000"], correct: 1 },
    { q: "1 公升 = 幾毫升？",  a: ["10", "100", "1000", "500"],    correct: 2 },
    { q: "2 公里 = 幾公尺？",  a: ["200", "2000", "20000", "2500"], correct: 1 }
];

// ===== 六年級題庫（目前皆為佔位題目）=====
const POOL_GCD_LCM = [
    { q: "12 與 18 的最大公因數？", a: ["3", "6", "9", "2"],   correct: 1 },
    { q: "4 與 6 的最小公倍數？",   a: ["12", "24", "8", "10"], correct: 0 },
    { q: "8 與 12 的最大公因數？",  a: ["2", "4", "6", "8"],    correct: 1 },
    { q: "3 與 5 的最小公倍數？",   a: ["8", "15", "30", "10"], correct: 1 }
];

const POOL_FRACTION_DIV = [
    { q: "1/2 ÷ 1/4 = ?", a: ["1/8", "2", "1/2", "4"],   correct: 1 },
    { q: "3/4 ÷ 1/2 = ?", a: ["3/8", "3/2", "2/3", "6"], correct: 1 },
    { q: "2/3 ÷ 2 = ?",   a: ["1/3", "4/3", "1/6", "2"], correct: 0 },
    { q: "5/6 ÷ 5 = ?",   a: ["1/6", "1/5", "5/6", "6/5"], correct: 0 }
];

const POOL_QUANTITY = [
    { q: "每盒 6 顆，4 盒共幾顆？",          a: ["10", "18", "24", "30"], correct: 2 },
    { q: "時速 60 公里，2 小時走幾公里？",  a: ["30", "120", "60", "90"], correct: 1 },
    { q: "1 枝筆 8 元，5 枝要多少元？",     a: ["13", "40", "45", "32"],  correct: 1 },
    { q: "12 個蘋果平分給 4 人，每人幾個？", a: ["2", "3", "4", "6"],     correct: 1 }
];

const POOL_DECIMAL_DIV = [
    { q: "4.8 ÷ 2 = ?",   a: ["2.2", "2.4", "2.6", "1.4"],  correct: 1 },
    { q: "9.0 ÷ 0.3 = ?", a: ["3", "30", "27", "0.3"],      correct: 1 },
    { q: "5.5 ÷ 5 = ?",   a: ["1.1", "1.5", "0.11", "11"],  correct: 0 },
    { q: "6.4 ÷ 0.8 = ?", a: ["0.8", "8", "80", "6.4"],     correct: 1 }
];

const POOL_RATIO_VALUE = [
    { q: "2 : 4 化成最簡單整數比？", a: ["1:2", "2:1", "1:4", "2:4"], correct: 0 },
    { q: "3 : 6 的比值是多少？",     a: ["2", "0.5", "3", "6"],       correct: 1 },
    { q: "6 : 9 化成最簡單整數比？", a: ["2:3", "3:2", "6:9", "1:3"], correct: 0 },
    { q: "10 : 5 的比值是多少？",    a: ["2", "0.5", "5", "10"],      correct: 0 }
];

// ===== 各年級的題庫組合 =====
const POOLS_G5 = {
    "整數、小數除以整數": generateDivideQuestion, // 動態產生（非固定題庫）
    "表面積": POOL_SURFACE,
    "比率與百分率": POOL_RATIO,
    "時間的乘除": POOL_TIME,
    "生活中的大單位": POOL_UNITS
};

const POOLS_G6 = {
    "最大公因數與最小公倍數": POOL_GCD_LCM,
    "分數除法": POOL_FRACTION_DIV,
    "數量關係": POOL_QUANTITY,
    "小數除法": POOL_DECIMAL_DIV,
    "比與比值": POOL_RATIO_VALUE
};

const QUESTION_POOLS = {
    "五年級": POOLS_G5,
    "六年級": POOLS_G6
};
