'use strict';

/* ================================================================
   極速工廠 Turbo Factory
   ----------------------------------------------------------------
   教學目標：平行處理的「加速」與「極限」（阿姆達爾定律 Amdahl's Law）
     · 多工人同時做不同零件 → 變快（平行）
     · 🔒 有些工作只能一個人做 → 加人也沒用（序列部分）
     · 🔗 有些工作要等前面做完 → 關鍵路徑（依賴 / 同步）

   可重玩性（roguelike）三支柱：
     1. 訂單程序化生成（產品、零件、工時、依賴、🔒 每局都不同）
     2. 每關結束三選一升級卡，效果永久累積成不同 build
     3. 隨機事件，每關開場可能翻盤

   平衡數值集中在 TUNING / UPGRADES / EVENTS，改這裡就好。
   ================================================================ */

/* ---------------- 平衡數值 ---------------- */
const TUNING = {
    totalOrders: 5,          // 一局幾張訂單
    startWorkers: 3,         // 起始工人數
    baseMaxWorkers: 3,       // 一般零件最多幾人同時做
    minWorkers: 2,           // 事件扣人後的保底（低於 2 就感受不到「平行」了）
    eventChance: 0.4,        // 每關出現隨機事件的機率（第 1 關不觸發，先讓學生熟悉操作）
    targetSlack: 1.35,       // 目標時間 = 理想時間 × 這個倍率
    star3: 1.20,             // 3 星：完成時間 ≤ 理想 × 1.20
    star2: 1.60,             // 2 星
    overtimeMul: 2.0,        // 加班時速度倍率
    overtimeDur: 4.0         // 加班持續秒數
};

/* ---------------- 產品資料池 ---------------- */
const PRODUCTS = [
    {
        name: '戰鬥機器人', icon: '🤖',
        prep: { name: '看設計圖', icon: '📖' },
        join: { name: '組裝接合', icon: '🔗' },
        finish: { name: '上漆測試', icon: '🎨' },
        parts: [
            { name: '頭部', icon: '😀' }, { name: '左手臂', icon: '💪' }, { name: '右手臂', icon: '🦾' },
            { name: '雙腿', icon: '🦵' }, { name: '動力電池', icon: '🔋' }, { name: '天線', icon: '📡' },
            { name: '感應眼', icon: '👀' }, { name: '胸甲', icon: '🛡️' }
        ]
    },
    {
        name: '太空火箭', icon: '🚀',
        prep: { name: '計算軌道', icon: '📐' },
        join: { name: '火箭組裝', icon: '🔗' },
        finish: { name: '安全檢查', icon: '✅' },
        parts: [
            { name: '主引擎', icon: '🔥' }, { name: '機翼', icon: '🪽' }, { name: '駕駛艙', icon: '🧑‍🚀' },
            { name: '燃料桶', icon: '🛢️' }, { name: '降落傘', icon: '🪂' }, { name: '導航儀', icon: '🧭' },
            { name: '隔熱層', icon: '🧊' }, { name: '通訊天線', icon: '📶' }
        ]
    },
    {
        name: '慶生蛋糕', icon: '🎂',
        prep: { name: '看食譜', icon: '📜' },
        join: { name: '疊起來裝飾', icon: '🔗' },
        finish: { name: '裝盒', icon: '📦' },
        parts: [
            { name: '烤蛋糕體', icon: '🍰' }, { name: '打發鮮奶油', icon: '🥛' }, { name: '切草莓', icon: '🍓' },
            { name: '融巧克力', icon: '🍫' }, { name: '插蠟燭', icon: '🕯️' }, { name: '做糖霜', icon: '🧁' },
            { name: '煮果醬', icon: '🍯' }, { name: '烤餅乾片', icon: '🍪' }
        ]
    },
    {
        name: '積木城堡', icon: '🏰',
        prep: { name: '看藍圖', icon: '🗺️' },
        join: { name: '拼起城堡', icon: '🔗' },
        finish: { name: '插上旗子', icon: '🚩' },
        parts: [
            { name: '城牆', icon: '🧱' }, { name: '高塔', icon: '🗼' }, { name: '大門', icon: '🚪' },
            { name: '護城河', icon: '🌊' }, { name: '屋頂', icon: '🔺' }, { name: '樓梯', icon: '🪜' },
            { name: '窗戶', icon: '🪟' }, { name: '吊橋', icon: '🌉' }
        ]
    },
    {
        name: '恐龍模型', icon: '🦖',
        prep: { name: '研究化石', icon: '🔬' },
        join: { name: '骨架接合', icon: '🔗' },
        finish: { name: '上色展示', icon: '🖌️' },
        parts: [
            { name: '頭骨', icon: '💀' }, { name: '尾巴', icon: '〰️' }, { name: '爪子', icon: '🦶' },
            { name: '背鰭', icon: '🔻' }, { name: '牙齒', icon: '🦷' }, { name: '肋骨', icon: '🩻' },
            { name: '眼珠', icon: '👁️' }, { name: '底座', icon: '🟫' }
        ]
    },
    {
        name: '極速賽車', icon: '🏎️',
        prep: { name: '調校設定', icon: '📋' },
        join: { name: '車體組裝', icon: '🔗' },
        finish: { name: '試跑一圈', icon: '🏁' },
        parts: [
            { name: '引擎', icon: '⚙️' }, { name: '輪胎', icon: '🛞' }, { name: '方向盤', icon: '🎡' },
            { name: '車殼', icon: '🔧' }, { name: '尾翼', icon: '✈️' }, { name: '油箱', icon: '⛽' },
            { name: '座椅', icon: '💺' }, { name: '煞車', icon: '🛑' }
        ]
    }
];

/* ---------------- 升級卡（每關結束三選一） ---------------- */
const UPGRADES = [
    {
        id: 'hire2', icon: '👥', title: '招募工人', desc: '工人 <b>+2</b> 人',
        weight: 4, apply: M => { M.workers += 2; }
    },
    {
        id: 'hire3', icon: '🏢', title: '大擴編', desc: '工人 <b>+3</b> 人<br>但所有工時 <b>+10%</b>',
        weight: 2, apply: M => { M.workers += 3; M.allSpeed *= 0.9; }
    },
    {
        id: 'simplify', icon: '📖', title: '簡化說明書', desc: '🔒 只能一個人做的工作<br>時間 <b>-40%</b>',
        weight: 4, apply: M => { M.serialSpeed *= 1.67; }
    },
    {
        id: 'unlock', icon: '🔓', title: '拆解流程', desc: '每張訂單隨機 <b>1 個 🔒</b><br>變成大家可以一起做',
        weight: 3, apply: M => { M.unlockSerial += 1; }
    },
    {
        id: 'skilled', icon: '⚡', title: '熟練工人', desc: '所有工作速度 <b>+15%</b>',
        weight: 4, apply: M => { M.allSpeed *= 1.15; }
    },
    {
        id: 'bench', icon: '🛠️', title: '加大工作台', desc: '每個零件可容納的<br>工人 <b>+1</b> 人',
        weight: 3, apply: M => { M.benchBonus += 1; }
    },
    {
        id: 'auto', icon: '🤖', title: '自動化開場', desc: '每張訂單的<br><b>第一個工作自動完成</b>',
        weight: 3, apply: M => { M.autoPrep = true; }
    },
    {
        id: 'coffee', icon: '☕', title: '加班券', desc: '「全員加班」<br>可以多用 <b>1 次</b>',
        weight: 3, apply: M => { M.overtimeMax += 1; }
    },
    {
        id: 'prefab', icon: '📦', title: '預製零件', desc: '每張訂單開始時<br>隨機 <b>2 個零件做好一半</b>',
        weight: 3, apply: M => { M.prefab += 2; }
    }
];

/* ---------------- 隨機事件（每關開場） ---------------- */
const EVENTS = [
    {
        icon: '😷', title: '有工人請假了！', text: '這張訂單少 <b>1 位</b>工人，大家辛苦一點。',
        weight: 3, apply: O => { O.workerDelta -= 1; }
    },
    {
        icon: '📦', title: '急件插隊！', text: '客人急著要，目標時間 <b>縮短 25%</b>。',
        weight: 3, apply: O => { O.targetMul *= 0.75; }
    },
    {
        icon: '🎁', title: '顧問來指導', text: '這張訂單所有 <b>🔒 工作快 30%</b>！',
        weight: 3, apply: O => { O.serialMul *= 1.43; }
    },
    {
        icon: '🔧', title: '機器故障', text: '有一個零件的工時 <b>變成兩倍</b>。',
        weight: 3, apply: O => { O.brokenPart = true; }
    },
    {
        icon: '🍀', title: '臨時工來幫忙', text: '這張訂單多 <b>2 位</b>工人！',
        weight: 2, apply: O => { O.workerDelta += 2; }
    },
    {
        icon: '📐', title: '客人改設計', text: '這張訂單 <b>多一個 🔒 工作</b>，只能一個人做。',
        weight: 2, apply: O => { O.extraSerial = true; }
    }
];

/* ---------------- 全域狀態 ---------------- */
let M = null;      // 永久 modifier（roguelike build）
let RUN = null;    // 本局進度
let G = null;      // 當前這關的執行狀態
let rafId = null;
let taskSeq = 0;

const $ = id => document.getElementById(id);

/* ---------------- 小工具 ---------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function pickShuffled(arr, n) {
    const c = arr.slice();
    for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
    }
    return c.slice(0, n);
}

function weightedPick(list) {
    const total = list.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const x of list) { r -= x.weight; if (r <= 0) return x; }
    return list[list.length - 1];
}

/* 抽 n 張不重複的升級卡 */
function drawUpgrades(n) {
    const pool = UPGRADES.filter(u => !(u.id === 'auto' && M.autoPrep));
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 200) {
        const u = weightedPick(pool);
        if (used.has(u.id)) continue;
        used.add(u.id);
        out.push(u);
    }
    return out;
}

/* ---------------- 音效（WebAudio 合成，不需檔案） ---------------- */
let audioCtx = null;
function sfx(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const presets = {
            assign: [520, 0.07, 'triangle'],
            done: [780, 0.16, 'sine'],
            deny: [150, 0.14, 'square'],
            clear: [660, 0.3, 'sine'],
            card: [440, 0.12, 'triangle']
        };
        const [freq, dur, wave] = presets[type] || presets.assign;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        if (type === 'done' || type === 'clear') {
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + dur);
        }
        gain.gain.setValueAtTime(0.10, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (e) { /* 音效失敗不影響遊戲 */ }
}

/* ---------------- Toast ---------------- */
function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = msg;
    $('toastArea').appendChild(el);
    setTimeout(() => el.remove(), 2200);
}

/* ---------------- 彈窗 ---------------- */
function showOverlay(html) {
    $('overlayBox').innerHTML = html;
    $('overlay').classList.add('show');
}
function hideOverlay() { $('overlay').classList.remove('show'); }

/* ================================================================
   訂單生成（程序化）
   結構：準備 → 多條產線（每條 1~2 道工序，彼此平行）→ 接合 → 完工
   ================================================================ */
/* 同一局裡不重複抽到同一個產品，玩起來才有「每張訂單都不一樣」的感覺 */
function pickProduct() {
    const used = (RUN && RUN.usedProducts) || [];
    const avail = PRODUCTS.filter(p => !used.includes(p.name));
    const p = pick(avail.length ? avail : PRODUCTS);
    if (RUN && RUN.usedProducts) RUN.usedProducts.push(p.name);
    return p;
}

function generateOrder(orderNo) {
    const product = pickProduct();
    const lv = orderNo;                       // 1..5，越後面越難

    const colCount = Math.min(3 + Math.floor((lv + 1) / 2), 6);  // 4~6 條產線（越後面越寬，加人才有感）
    const twoStepChance = lv >= 3 ? 0.45 : 0.2;                  // 產線出現第二道工序的機率
    const serialChance = 0.08 + lv * 0.04;                       // 零件是 🔒 的機率（隨關卡上升）

    const partPool = pickShuffled(product.parts, 8);
    let p = 0;
    taskSeq = 0;

    const mk = (name, icon, dur, serial, stage) => ({
        id: 't' + (++taskSeq),
        name, icon,
        baseDur: dur,
        dur: dur,
        serial: serial,
        stage: stage,
        deps: [],
        progress: 0,
        workers: 0,
        done: false,
        el: null
    });

    // 準備工作：永遠只能一個人做（教學上最好懂的 🔒）
    const prep = mk(product.prep.name, product.prep.icon, rand(5, 7), true, 'prep');

    // 產線
    const cols = [];
    for (let c = 0; c < colCount; c++) {
        const col = [];
        const steps = Math.random() < twoStepChance ? 2 : 1;
        for (let s = 0; s < steps; s++) {
            const part = partPool[p++ % partPool.length];
            const name = steps === 2 && s === 1 ? part.name + '打磨' : part.name;
            const t = mk(name, part.icon, rand(5, 11), Math.random() < serialChance, 'line');
            col.push(t);
        }
        cols.push(col);
    }

    // 接合：同步點，要等所有產線做完
    const join = mk(product.join.name, product.join.icon, rand(6, 10), false, 'join');
    // 完工：只能一個人做
    const finish = mk(product.finish.name, product.finish.icon, rand(3, 5), true, 'finish');

    // 依賴關係
    cols.forEach(col => {
        col[0].deps.push(prep.id);
        for (let i = 1; i < col.length; i++) col[i].deps.push(col[i - 1].id);
        join.deps.push(col[col.length - 1].id);
    });
    finish.deps.push(join.id);

    const tasks = [prep, ...cols.flat(), join, finish];

    return { product, orderNo, prep, cols, join, finish, tasks };
}

/* ================================================================
   排程模擬：估算「N 個工人最快能做多久」
   用 list scheduling 貪婪法（先餵剩餘關鍵路徑最長的工作）
   ================================================================ */
function maxWorkersOf(task) {
    return task.serial ? 1 : TUNING.baseMaxWorkers + M.benchBonus;
}

/* 每個任務的「剩餘關鍵路徑」= 自己最快耗時 + 後續最長鏈 */
function computeCriticalRemaining(tasks) {
    const byId = {};
    tasks.forEach(t => { byId[t.id] = t; });
    const children = {};
    tasks.forEach(t => { children[t.id] = []; });
    tasks.forEach(t => t.deps.forEach(d => children[d].push(t.id)));

    const memo = {};
    const walk = id => {
        if (memo[id] !== undefined) return memo[id];
        const t = byId[id];
        const own = t.dur / maxWorkersOf(t);
        let best = 0;
        children[id].forEach(cid => { best = Math.max(best, walk(cid)); });
        return (memo[id] = own + best);
    };
    tasks.forEach(t => walk(t.id));
    return memo;
}

/* 模擬 N 個工人的最佳完成時間（秒） */
function simulateOptimal(order, workerCount) {
    // 一律從頭重跑（不看玩家當下進度），算的是這張訂單的「理想時間」
    const tasks = order.tasks.map(t => ({
        id: t.id, deps: t.deps, serial: t.serial, remain: t.dur, done: false
    }));

    const crit = computeCriticalRemaining(order.tasks);
    const byId = {};
    tasks.forEach(t => { byId[t.id] = t; });

    const dt = 0.05;
    let time = 0;
    let guard = 0;

    while (guard++ < 20000) {
        const ready = tasks.filter(t => !t.done && t.deps.every(d => byId[d].done));
        if (!ready.length) break;

        ready.sort((a, b) => crit[b.id] - crit[a.id]);

        // 分配工人：先每人一個，再把剩下的補給關鍵路徑最長的
        const alloc = {};
        let left = workerCount;
        for (const t of ready) { if (left <= 0) break; alloc[t.id] = 1; left--; }
        for (const t of ready) {
            if (left <= 0) break;
            const cap = t.serial ? 1 : TUNING.baseMaxWorkers + M.benchBonus;
            const add = Math.min(cap - (alloc[t.id] || 0), left);
            if (add > 0) { alloc[t.id] = (alloc[t.id] || 0) + add; left -= add; }
        }
        if (!Object.keys(alloc).length) break;

        for (const t of ready) {
            const w = alloc[t.id] || 0;
            if (w > 0) {
                t.remain -= dt * w;
                if (t.remain <= 0) { t.remain = 0; t.done = true; }
            }
        }
        time += dt;
        if (tasks.every(t => t.done)) break;
    }
    return time;
}

/* 一個人從頭做到尾的時間 */
function singleWorkerTime(order) {
    return order.tasks.reduce((s, t) => s + t.dur, 0);
}

/* ================================================================
   開始新的一局
   ================================================================ */
function newRun() {
    M = {
        workers: TUNING.startWorkers,
        allSpeed: 1,
        serialSpeed: 1,
        benchBonus: 0,
        unlockSerial: 0,
        autoPrep: false,
        overtimeMax: 1,
        prefab: 0,
        picked: []
    };
    RUN = { orderNo: 0, totalTime: 0, stars: 0, usedProducts: [] };
}

function startRun() {
    sfx('card');
    newRun();
    $('startScreen').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    document.body.classList.add('playing');
    nextOrder();
}

/* ---------------- 進入下一張訂單 ---------------- */
function nextOrder() {
    RUN.orderNo++;
    if (RUN.orderNo > TUNING.totalOrders) { showFinal(); return; }

    const order = generateOrder(RUN.orderNo);

    // 本關專屬 modifier（事件用）
    const O = { workerDelta: 0, targetMul: 1, serialMul: 1, brokenPart: false, extraSerial: false };
    let event = null;
    if (RUN.orderNo >= 2 && Math.random() < TUNING.eventChance) {
        event = weightedPick(EVENTS);
        event.apply(O);
    }

    // 套用永久 modifier：解除 🔒
    for (let i = 0; i < M.unlockSerial; i++) {
        const locked = order.tasks.filter(t => t.serial && t.stage === 'line');
        if (locked.length) pick(locked).serial = false;
    }
    // 事件：多一個 🔒
    if (O.extraSerial) {
        const free = order.tasks.filter(t => !t.serial && t.stage === 'line');
        if (free.length) pick(free).serial = true;
    }
    // 事件：機器故障
    if (O.brokenPart) {
        const cands = order.tasks.filter(t => t.stage === 'line');
        if (cands.length) { const t = pick(cands); t.dur *= 2; t.broken = true; }
    }

    // 套用速度 modifier 到實際工時
    order.tasks.forEach(t => {
        let d = t.dur / M.allSpeed;
        if (t.serial) d = d / (M.serialSpeed * O.serialMul);
        t.dur = Math.max(1.5, d);
    });

    const workers = Math.max(TUNING.minWorkers, M.workers + O.workerDelta);
    const ideal = simulateOptimal(order, workers);
    const target = Math.max(5, Math.round(ideal * TUNING.targetSlack * O.targetMul));

    G = {
        order, workers, ideal, target,
        elapsed: 0,
        running: false,
        overtimeLeft: M.overtimeMax,
        overtimeUntil: 0,
        idleAccum: 0,
        hintShown: false,
        crit: computeCriticalRemaining(order.tasks)
    };

    // 開場優惠
    if (M.autoPrep) { order.prep.progress = order.prep.dur; order.prep.done = true; }
    for (let i = 0; i < M.prefab; i++) {
        const cands = order.tasks.filter(t => t.stage === 'line' && t.progress === 0);
        if (cands.length) { const t = pick(cands); t.progress = t.dur * 0.5; }
    }

    showBrief(event);
}

/* ---------------- 訂單簡報 ---------------- */
function showBrief(event) {
    const o = G.order;
    const serialCount = o.tasks.filter(t => t.serial).length;
    const single = singleWorkerTime(o);

    const chips = o.tasks.map(t =>
        `<span class="bf-chip${t.serial ? ' serial' : ''}">${t.icon} ${t.name}${t.serial ? ' 🔒' : ''}</span>`
    ).join('');

    const eventHtml = event ? `
        <div class="lesson" style="background:var(--warn-bg);border-color:var(--warn-border);text-align:center;">
            <h4 style="color:var(--warn);">${event.icon} ${event.title}</h4>
            <p>${event.text}</p>
        </div>` : '';

    showOverlay(`
        <div class="ob-icon">${o.product.icon}</div>
        <h3>訂單 ${RUN.orderNo} / ${TUNING.totalOrders}：${o.product.name}</h3>
        <p>這張訂單有 <b>${o.tasks.length}</b> 個工作，其中 <b>${serialCount} 個是 🔒</b>（只能一個人做）。</p>
        <div class="brief-flow">${chips}</div>
        <div class="stat-row">
            <div class="stat-box">
                <div class="sb-label">你的工人</div>
                <div class="sb-value">${G.workers} 人</div>
            </div>
            <div class="stat-box">
                <div class="sb-label">一個人要做</div>
                <div class="sb-value">${single.toFixed(0)} 秒</div>
            </div>
            <div class="stat-box good">
                <div class="sb-label">目標時間</div>
                <div class="sb-value">${G.target} 秒</div>
            </div>
        </div>
        ${eventHtml}
        <div class="ob-btns">
            <button class="tf-btn big" onclick="beginOrder()"><i class="fa-solid fa-play"></i> 開工！</button>
        </div>
    `);
}

/* ---------------- 開工 ---------------- */
function beginOrder() {
    hideOverlay();
    sfx('card');
    buildBoard();
    refreshHud();
    G.running = true;
    G.last = performance.now();
    rafId = requestAnimationFrame(tick);
}

/* ---------------- 建立產線 DOM ---------------- */
function buildBoard() {
    const o = G.order;
    const board = $('board');
    board.innerHTML = '';

    board.appendChild(stageEl([o.prep]));
    board.appendChild(arrowEl('做完才能開始做零件'));

    const lines = document.createElement('div');
    lines.className = 'stage stage-lines';
    o.cols.forEach(col => {
        const colEl = document.createElement('div');
        colEl.className = 'line-col';
        col.forEach((t, i) => {
            if (i > 0) {
                const a = document.createElement('div');
                a.className = 'mini-arrow';
                a.textContent = '▼';
                colEl.appendChild(a);
            }
            colEl.appendChild(taskEl(t));
        });
        lines.appendChild(colEl);
    });
    board.appendChild(lines);

    board.appendChild(arrowEl('🔗 零件全部到齊才能接合'));
    board.appendChild(stageEl([o.join], true));
    board.appendChild(arrowEl(''));
    board.appendChild(stageEl([o.finish]));

    updateBoard();
    fitBoard();
}

/* 產線太高就整體縮放，保證一頁看得完
   （觸控電視上邊玩邊捲動非常難用，寧可縮小也不要捲） */
function fitBoard() {
    const board = $('board');
    board.style.transform = '';
    board.style.marginBottom = '';
    // 手機螢幕太窄，縮放後卡片會小到按不準；寧可讓它捲動，保住觸控目標大小
    if (window.innerWidth <= 720) return;
    const top = board.getBoundingClientRect().top;
    const avail = window.innerHeight - top - 92;   // 底部留給「全員加班」按鈕
    const full = board.offsetHeight;               // 縮放前的 layout 高度
    if (full > avail && avail > 220) {
        const k = Math.max(0.6, avail / full);
        board.style.transform = `scale(${k})`;
        // transform 不改變 layout，多出來的空間用負 margin 收回
        // （不能改 height：height 也會被 transform 縮放，底部會被裁掉）
        board.style.marginBottom = (14 - full * (1 - k)) + 'px';
    }
}

function stageEl(tasks, wide) {
    const el = document.createElement('div');
    el.className = 'stage';
    tasks.forEach(t => el.appendChild(taskEl(t, wide)));
    return el;
}

function arrowEl(label) {
    const el = document.createElement('div');
    el.className = 'flow-arrow';
    el.innerHTML = `<span>${label || '▼'}</span>`;
    return el;
}

function taskEl(t, wide) {
    const el = document.createElement('div');
    el.className = 'task-card';
    if (wide) el.classList.add('wide');
    el.dataset.id = t.id;
    el.innerHTML = `
        <div class="tc-lock">${t.serial ? '🔒' : ''}</div>
        <button class="tc-recall" title="收回工人">⤺</button>
        <div class="tc-icon">${t.icon}</div>
        <div class="tc-name">${t.name}${t.broken ? ' 🔧' : ''}</div>
        <div class="tc-dur">${t.dur.toFixed(0)} 秒</div>
        <div class="tc-workers"></div>
        <div class="tc-bar"><i></i></div>
    `;
    el.addEventListener('click', e => {
        if (e.target.closest('.tc-recall')) { recallWorkers(t); return; }
        assignWorker(t);
    });
    t.el = el;
    t.barEl = el.querySelector('.tc-bar i');
    t.workersEl = el.querySelector('.tc-workers');
    return el;
}

/* ---------------- 玩家操作 ---------------- */
function isReady(t) {
    return t.deps.every(d => G.order.tasks.find(x => x.id === d).done);
}

function assignedTotal() {
    return G.order.tasks.reduce((s, t) => s + t.workers, 0);
}

function assignWorker(t) {
    if (!G || !G.running) return;
    if (t.done) return;

    if (!isReady(t)) {
        shake(t); sfx('deny');
        const waiting = t.deps.map(d => G.order.tasks.find(x => x.id === d)).filter(x => !x.done);
        toast(`🔗 要等「${waiting.map(w => w.name).join('、')}」做完才行！`);
        return;
    }
    const cap = maxWorkersOf(t);
    if (t.workers >= cap) {
        shake(t); sfx('deny');
        if (t.serial) toast('🔒 這個工作<b>只能一個人做</b>，派再多也不會變快！');
        else toast(`這個零件最多 ${cap} 個人一起做`);
        return;
    }
    if (assignedTotal() >= G.workers) {
        shake(t); sfx('deny');
        toast('👷 沒有空的工人了！等別人做完吧');
        return;
    }
    t.workers++;
    pop(t);
    sfx('assign');
    updateBoard();
}

function recallWorkers(t) {
    if (!G || !G.running || t.workers === 0) return;
    t.workers = 0;
    sfx('deny');
    updateBoard();
}

function shake(t) {
    t.el.classList.remove('shake');
    void t.el.offsetWidth;
    t.el.classList.add('shake');
}
function pop(t) {
    t.el.classList.remove('pop');
    void t.el.offsetWidth;
    t.el.classList.add('pop');
}

/* ---------------- 加班 ---------------- */
function useOvertime() {
    if (!G || !G.running) return;
    if (G.overtimeLeft <= 0) { toast('加班券用完了！'); return; }
    G.overtimeLeft--;
    G.overtimeUntil = G.elapsed + TUNING.overtimeDur;
    document.body.classList.add('overtime-on');
    sfx('clear');
    toast('⚡ 全員加班！速度變兩倍');
    refreshHud();
}

/* ---------------- 主迴圈 ---------------- */
function tick(now) {
    if (!G || !G.running) return;
    const dt = Math.min((now - G.last) / 1000, 0.1);
    G.last = now;
    G.elapsed += dt;

    const overtime = G.elapsed < G.overtimeUntil;
    if (!overtime && document.body.classList.contains('overtime-on')) {
        document.body.classList.remove('overtime-on');
    }
    const mul = overtime ? TUNING.overtimeMul : 1;

    let changed = false;
    G.order.tasks.forEach(t => {
        if (t.done || t.workers === 0) return;
        if (!isReady(t)) { t.workers = 0; changed = true; return; }
        t.progress += dt * t.workers * mul;
        if (t.progress >= t.dur) {
            t.progress = t.dur;
            t.done = true;
            t.workers = 0;
            changed = true;
            sfx('done');
        }
    });

    // 統計閒置工時（教學數據）
    const idle = G.workers - assignedTotal();
    G.idleAccum += idle * dt;

    // 提示：有空工人但沒事可做 → 這就是平行的極限
    if (!G.hintShown && idle > 0 && G.elapsed > 3) {
        const anyAssignable = G.order.tasks.some(t => !t.done && isReady(t) && t.workers < maxWorkersOf(t));
        if (!anyAssignable) {
            G.hintShown = true;
            toast('😴 工人沒事做了！<b>再多人也快不了</b>');
        }
    }

    updateBoard(changed);
    refreshHud();

    if (G.order.tasks.every(t => t.done)) { finishOrder(); return; }
    rafId = requestAnimationFrame(tick);
}

/* ---------------- 畫面更新 ---------------- */
function updateBoard(structural) {
    G.order.tasks.forEach(t => {
        if (!t.el) return;
        const ready = isReady(t);
        const cls = t.el.classList;
        cls.toggle('done', t.done);
        cls.toggle('locked', !t.done && !ready);
        cls.toggle('ready', !t.done && ready && t.workers === 0);
        cls.toggle('working', !t.done && ready && t.workers > 0);

        t.barEl.style.width = Math.min(100, (t.progress / t.dur) * 100) + '%';
        t.workersEl.textContent = t.done ? '' : '👷'.repeat(t.workers);

        // 等待提示
        let wait = t.el.querySelector('.tc-wait');
        if (!t.done && !ready) {
            if (!wait) {
                wait = document.createElement('div');
                wait.className = 'tc-wait';
                wait.textContent = '等前面…';
                t.el.appendChild(wait);
            }
        } else if (wait) { wait.remove(); }
    });
}

function refreshHud() {
    const o = G.order;
    $('hudIcon').textContent = o.product.icon;
    $('hudName').textContent = o.product.name;
    $('hudProgress').textContent = `訂單 ${RUN.orderNo} / ${TUNING.totalOrders}`;
    $('hudTime').textContent = G.elapsed.toFixed(1);
    $('hudTarget').textContent = G.target;
    $('hudTime').parentElement.parentElement.classList.toggle('danger', G.elapsed > G.target);

    const assigned = assignedTotal();
    const idle = G.workers - assigned;
    $('idleCount').textContent = idle;
    $('totalCount').textContent = G.workers;

    const slots = $('workerSlots');
    if (slots.childElementCount !== G.workers) {
        slots.innerHTML = '';
        for (let i = 0; i < G.workers; i++) {
            const w = document.createElement('span');
            w.className = 'worker';
            w.textContent = '👷';
            slots.appendChild(w);
        }
    }
    Array.from(slots.children).forEach((w, i) => {
        w.className = 'worker ' + (i < assigned ? 'busy' : 'idle');
    });

    const ob = $('btnOvertime');
    ob.disabled = G.overtimeLeft <= 0;
    ob.innerHTML = `<i class="fa-solid fa-bolt"></i> 全員加班（剩 ${G.overtimeLeft} 次）`;
}

/* ================================================================
   關卡結算
   ================================================================ */
function finishOrder() {
    G.running = false;
    cancelAnimationFrame(rafId);
    document.body.classList.remove('overtime-on');
    sfx('clear');

    const T = G.elapsed;
    const ideal = G.ideal;
    const single = singleWorkerTime(G.order);
    const limit = simulateOptimal(G.order, 999);
    const speedup = single / T;
    const idleRate = Math.round((G.idleAccum / (G.workers * T)) * 100);

    let stars = 1;
    if (T <= ideal * TUNING.star3) stars = 3;
    else if (T <= ideal * TUNING.star2) stars = 2;

    RUN.totalTime += T;
    RUN.stars += stars;

    const serialSum = G.order.tasks.filter(t => t.serial).reduce((s, t) => s + t.dur, 0);
    const serialPct = Math.round((serialSum / single) * 100);

    showOverlay(`
        <div class="ob-icon">${stars === 3 ? '🏆' : stars === 2 ? '👍' : '📦'}</div>
        <h3>出貨完成！</h3>
        <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div class="stat-row">
            <div class="stat-box good">
                <div class="sb-label">你的時間</div>
                <div class="sb-value">${T.toFixed(1)} 秒</div>
            </div>
            <div class="stat-box">
                <div class="sb-label">一個人做要</div>
                <div class="sb-value">${single.toFixed(0)} 秒</div>
            </div>
            <div class="stat-box">
                <div class="sb-label">快了</div>
                <div class="sb-value">${speedup.toFixed(1)} 倍</div>
            </div>
        </div>
        <div class="lesson">
            <h4>💡 這張訂單告訴我們</h4>
            <p>
                你有 <b>${G.workers} 位</b>工人，但只快了 <b>${speedup.toFixed(1)} 倍</b>，不是 ${G.workers} 倍。<br>
                因為這裡面有 <b>🔒 只能一個人做</b> 的工作，占了大約 <b>${serialPct}%</b> 的時間。<br>
                就算請來 <b>一百個工人</b>，這張訂單最快也只能到 <b>${limit.toFixed(1)} 秒</b>。
            </p>
            <p class="term">工人閒置率 ${idleRate}%　·　電腦科學裡，這叫「阿姆達爾定律 Amdahl's Law」</p>
        </div>
        <div class="ob-btns">
            <button class="tf-btn big" onclick="showUpgrades()">
                ${RUN.orderNo >= TUNING.totalOrders ? '看看總成績' : '選一張升級卡'} <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    `);
}

/* ---------------- 三選一升級卡 ---------------- */
function showUpgrades() {
    if (RUN.orderNo >= TUNING.totalOrders) { showFinal(); return; }
    sfx('card');

    const cards = drawUpgrades(3);
    window.__cards = cards;

    // 依照下一張訂單的狀況給提示，引導思考「加人 vs 改流程」
    const hint = M.workers >= 6
        ? '你的工人已經很多了，想想看：<b>再加人真的有用嗎？</b>'
        : '想想看：這一局你缺的是<b>人手</b>，還是<b>更順的流程</b>？';

    showOverlay(`
        <div class="ob-icon">🎁</div>
        <h3>工廠升級！選一張</h3>
        <p>${hint}</p>
        <div class="card-row">
            ${cards.map((c, i) => `
                <div class="up-card" onclick="chooseUpgrade(${i})">
                    <div class="uc-icon">${c.icon}</div>
                    <div class="uc-title">${c.title}</div>
                    <div class="uc-desc">${c.desc}</div>
                </div>
            `).join('')}
        </div>
    `);
}

function chooseUpgrade(i) {
    const c = window.__cards[i];
    c.apply(M);
    M.picked.push(c.title);
    sfx('done');
    toast(`${c.icon} 已升級：<b>${c.title}</b>`);
    hideOverlay();
    nextOrder();
}

/* ================================================================
   總結：阿姆達爾曲線
   ================================================================ */
function amdahlChart(order) {
    const pts = [];
    for (let n = 1; n <= 16; n++) pts.push({ n, t: simulateOptimal(order, n) });
    const maxT = pts[0].t;
    const limit = pts[pts.length - 1].t;

    const W = 620, H = 240, pad = 42;
    const x = n => pad + ((n - 1) / 15) * (W - pad * 2);
    const y = t => H - pad - (t / maxT) * (H - pad * 2);

    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.t).toFixed(1)}`).join(' ');
    const dots = pts.filter(p => [1, 2, 4, 8, 16].includes(p.n))
        .map(p => `<circle cx="${x(p.n).toFixed(1)}" cy="${y(p.t).toFixed(1)}" r="5" fill="var(--g1)"/>
                   <text x="${x(p.n).toFixed(1)}" y="${(y(p.t) - 12).toFixed(1)}" font-size="12"
                         text-anchor="middle" fill="var(--ink-soft)">${p.t.toFixed(0)}秒</text>`).join('');
    const ticks = [1, 2, 4, 8, 16].map(n =>
        `<text x="${x(n).toFixed(1)}" y="${H - pad + 20}" font-size="12" text-anchor="middle" fill="var(--muted)">${n}人</text>`
    ).join('');

    return `
    <div class="amdahl-chart">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="工人數與完成時間的關係圖">
            <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="var(--border-strong)" stroke-width="2"/>
            <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H - pad}" stroke="var(--border-strong)" stroke-width="2"/>
            <line x1="${pad}" y1="${y(limit).toFixed(1)}" x2="${W - pad}" y2="${y(limit).toFixed(1)}"
                  stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 5"/>
            <text x="${W - pad}" y="${(y(limit) - 8).toFixed(1)}" font-size="12" text-anchor="end" fill="var(--bad)">
                極限 ${limit.toFixed(0)} 秒 · 再多人也下不去
            </text>
            <path d="${path}" fill="none" stroke="var(--g1)" stroke-width="4" stroke-linejoin="round"/>
            ${dots}${ticks}
            <text x="${W / 2}" y="${H - 6}" font-size="13" text-anchor="middle" fill="var(--muted)">工人數量 →</text>
        </svg>
        <div class="ac-caption">
            這是最後一張訂單的模擬：工人從 1 個加到 16 個，時間<b>一開始掉很快，後來幾乎不動</b>。
        </div>
    </div>`;
}

function showFinal() {
    const order = G ? G.order : generateOrder(5);
    const avg = RUN.totalTime / TUNING.totalOrders;

    let best = null;
    try { best = JSON.parse(localStorage.getItem('tf-best')); } catch (e) { best = null; }
    const isNew = !best || RUN.stars > best.stars || (RUN.stars === best.stars && RUN.totalTime < best.totalTime);
    if (isNew) {
        try {
            localStorage.setItem('tf-best', JSON.stringify({ stars: RUN.stars, totalTime: RUN.totalTime }));
        } catch (e) { /* 無痕模式下忽略 */ }
    }

    showOverlay(`
        <div class="ob-icon">🏭</div>
        <h3>五張訂單全部出貨！</h3>
        <div class="stars">${'⭐'.repeat(Math.min(RUN.stars, 15))}</div>
        <div class="stat-row">
            <div class="stat-box good">
                <div class="sb-label">總星數</div>
                <div class="sb-value">${RUN.stars} / ${TUNING.totalOrders * 3}</div>
            </div>
            <div class="stat-box">
                <div class="sb-label">總時間</div>
                <div class="sb-value">${RUN.totalTime.toFixed(0)} 秒</div>
            </div>
            <div class="stat-box">
                <div class="sb-label">最後工人</div>
                <div class="sb-value">${M.workers} 人</div>
            </div>
        </div>
        ${isNew ? '<p style="color:var(--good);font-weight:700;">🎉 破紀錄了！</p>' : ''}
        ${amdahlChart(order)}
        <div class="lesson">
            <h4>💡 今天學到的事</h4>
            <p>
                <b>一、人多真的比較快</b>——大家同時做不同的零件，這叫<b>平行處理</b>。<br>
                <b>二、但快不了幾倍</b>——因為 🔒 只能一個人做的工作，和 🔗 要排隊等的工作，
                不管來幾個人，都得乖乖花那些時間。<br>
                <b>三、所以有時候「改流程」比「加人」更有效</b>——把 🔒 拆開、縮短，
                比多請十個工人還有用。
            </p>
            <p class="term">
                電腦裡的「工人」就是 <b>CPU 核心</b>。核心從 4 個變 8 個，程式卻沒有快一倍，
                就是因為這件事——這叫「<b>阿姆達爾定律</b>（Amdahl's Law）」。
            </p>
        </div>
        <div class="ob-btns">
            <button class="tf-btn big" onclick="restartRun()"><i class="fa-solid fa-rotate-left"></i> 再開一局</button>
            <button class="tf-btn ghost" onclick="backToStart()">回到首頁畫面</button>
        </div>
    `);
}

function restartRun() {
    hideOverlay();
    newRun();
    nextOrder();
}

function backToStart() {
    hideOverlay();
    $('gameScreen').classList.add('hidden');
    $('startScreen').classList.remove('hidden');
    document.body.classList.remove('playing');
    renderBest();
}

/* ---------------- 最佳紀錄 ---------------- */
function renderBest() {
    let best = null;
    try { best = JSON.parse(localStorage.getItem('tf-best')); } catch (e) { best = null; }
    $('bestRecord').innerHTML = best
        ? `🏅 最佳紀錄：<b>${best.stars} 顆星</b>，總共 <b>${best.totalTime.toFixed(0)} 秒</b>`
        : '每一局的訂單、零件、升級卡都不一樣，玩幾次都不會重複 🎲';
}

/* ---------------- 啟動 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
    renderBest();
    $('btnStart').addEventListener('click', startRun);
    $('btnOvertime').addEventListener('click', useOvertime);
    window.addEventListener('resize', () => { if (G && G.order && G.order.prep.el) fitBoard(); });
});
