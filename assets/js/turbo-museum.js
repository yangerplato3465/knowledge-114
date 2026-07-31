'use strict';

/* ================================================================
   極速博物館 Turbo Museum
   ----------------------------------------------------------------
   故事：你是博物館館長，帶學者把一件件古物修復好、送上展櫃。
   教學目標：平行處理的「加速」與「極限」（阿姆達爾定律 Amdahl's Law）
     · 多學者同時清不同碎片 → 變快（平行）
     · 🔒 有些工作只能一個人做 → 加人也沒用（序列部分）
     · 🔗 有些工作要等前面做完 → 關鍵路徑（依賴 / 同步）

   可重玩性（roguelike）三支柱：
     1. 委託程序化生成（古物、碎片、工時、依賴、🔒 每局都不同）
     2. 每件古物結束三選一升級卡，效果永久累積成不同 build
     3. 隨機事件，每件古物開場可能翻盤

   平衡數值集中在 TUNING / LEVELS / UPGRADES / EVENTS，改這裡就好。
   ================================================================ */

/* ---------------- 平衡數值 ---------------- */
const TUNING = {
    totalOrders: 5,          // 一局幾件古物
    startWorkers: 3,         // 起始學者數
    baseMaxWorkers: 3,       // 一般碎片最多幾人同時做
    minWorkers: 2,           // 事件扣人後的保底（低於 2 就感受不到「平行」了）
    eventChance: 0.4,        // 每關出現隨機事件的機率（第 1 關不觸發，先讓學生熟悉操作）
    /* 星等門檻 = 理想時間 × 倍率 + 反應寬限。理想時間是電腦用最佳派工法跑出來的，
       玩家不可能比它快，所以門檻一定要比它寬。

       關鍵是「寬多少」要拆成兩份：
         grace  人不是機器 —— 每張卡亮起來到手指點下去的固定成本，跟關卡長短無關
         star3  真正的難度旋鈕 —— 按比例給的餘裕
       以前只有倍率（×1.20），於是短關卡只多給 3.6 秒、長關卡卻多給 10 秒，
       越後面反而越好拿三星。改成 ×1.10 + 1.5 秒之後，把「每張卡最多能慢幾秒」
       壓成第 1 關 0.82 秒、第 5 關 1.43 秒（原本是 0.87 → 2.06 秒）：
       第 1 關門檻沒變（22 秒，還是學得起來），後面四關全部收緊
       （29→28、39→37、48→45、61→57 秒）。 */
    star3: 1.10,             // ⭐⭐⭐
    star2: 1.55,             // ⭐⭐（再慢就是 ⭐，做完至少有一顆）
    grace: 1.5               // 兩級門檻共用的反應寬限（秒）
};

/* ---------------- 關卡設計（一行一件古物） ----------------
   修復線一律 3 條。欄數固定，任務卡每關才能一樣大、位置也不會跳
   （欄數 4~6 浮動時，卡片得跟著縮，同一台電視上每關手感都不一樣）。
   規模與難度改成往「深度 → 🔒 數量 → 工時」三個方向疊：
     lines  ：3 條修復線各要做幾道工序（同一塊碎片的第 2、3 道要等前一道 → 🔗）
              碎片工作數 = 陣列總和，3 → 4 → 6 → 7 → 9，越後面越多
     locks  ：修復線上有幾項工作是 🔒（讀資料和展出本來就是 🔒，不算在內）
     part / prep / join / finish：各階段工時的隨機範圍（秒）
   3 條修復線 × 每項工作最多 3 人 = 最多 9 位同時有事做，
   學者再多就會閒著 —— 這正是要讓學生看見的「平行極限」。 */
const LINE_COUNT = 3;
const LEVELS = [
    // 古物 1：3 塊碎片，最單純，先學會「點一下就派人」
    { lines: [1, 1, 1], locks: 0, part: [6, 9],  prep: [4, 6],  join: [5, 8],  finish: [3, 4] },
    // 古物 2：4 項碎片工作，出現第一條兩道工序的修復線 → 開始有「要等前面」
    { lines: [2, 1, 1], locks: 1, part: [6, 10], prep: [5, 7],  join: [6, 9],  finish: [3, 5] },
    // 古物 3：6 項，三條都變兩道，學者開始不夠分
    { lines: [2, 2, 2], locks: 1, part: [7, 11], prep: [5, 8],  join: [7, 10], finish: [4, 5] },
    // 古物 4：7 項，出現三道工序的長修復線，關鍵路徑明顯變長
    { lines: [3, 2, 2], locks: 2, part: [7, 12], prep: [6, 9],  join: [8, 11], finish: [4, 6] },
    // 古物 5：9 項、🔒 最多、工時最長 —— 加人幾乎沒用，收尾點出阿姆達爾定律
    { lines: [3, 3, 3], locks: 3, part: [8, 13], prep: [7, 10], join: [9, 13], finish: [5, 7] }
];

/* ---------------- 古物資料池 ----------------
   一件古物 = 一張委託：先讀資料（prep）→ 各修復台清碎片 → 拼合（join）→ 展出（finish）。
   stages：同一塊碎片第 2、3 道工序的名字（例：頭骨 → 頭骨清理 → 頭骨加固）。
   一條修復線做的是「同一塊碎片的好幾道工序」，學生才看得懂為什麼要排隊等。 */
const ARTIFACTS = [
    {
        name: '恐龍化石', icon: '🦖',
        stages: ['清理', '加固'],
        prep: { name: '研究文獻', icon: '📚' },
        join: { name: '骨架拼合', icon: '🔗' },
        finish: { name: '上架展示', icon: '🖼️' },
        parts: [
            { name: '頭骨', icon: '💀' }, { name: '尾椎', icon: '〰️' }, { name: '前爪', icon: '🦶' },
            { name: '肋骨', icon: '🩻' }, { name: '牙齒', icon: '🦷' }, { name: '腿骨', icon: '🦴' },
            { name: '背鰭', icon: '🔻' }, { name: '底座', icon: '🟫' }
        ]
    },
    {
        name: '法老金面具', icon: '👑',
        stages: ['清潔', '補金'],
        prep: { name: '判讀象形文字', icon: '📜' },
        join: { name: '面具拼合', icon: '🔗' },
        finish: { name: '入櫃展示', icon: '🪟' },
        parts: [
            { name: '額飾', icon: '✨' }, { name: '眼線', icon: '👁️' }, { name: '假鬍', icon: '🧔' },
            { name: '耳環', icon: '💍' }, { name: '頸圈', icon: '📿' }, { name: '寶石', icon: '💎' },
            { name: '金箔', icon: '🟨' }, { name: '面頰', icon: '🎭' }
        ]
    },
    {
        name: '青銅古鼎', icon: '⚱️',
        stages: ['除鏽', '拓印'],
        prep: { name: '判讀銘文', icon: '🔍' },
        join: { name: '鼎身接合', icon: '🔗' },
        finish: { name: '佈展打光', icon: '💡' },
        parts: [
            { name: '鼎足', icon: '🦵' }, { name: '鼎耳', icon: '👂' }, { name: '銘文', icon: '✍️' },
            { name: '紋飾', icon: '🌀' }, { name: '鼎腹', icon: '🫖' }, { name: '提梁', icon: '⛓️' },
            { name: '鏽層', icon: '🟢' }, { name: '底座', icon: '🟫' }
        ]
    },
    {
        name: '彩繪陶罐', icon: '🏺',
        stages: ['拼補', '上釉'],
        prep: { name: '對照圖錄', icon: '🗂️' },
        join: { name: '陶片拼合', icon: '🔗' },
        finish: { name: '拍照建檔', icon: '📷' },
        parts: [
            { name: '罐口', icon: '⭕' }, { name: '罐身', icon: '🏺' }, { name: '彩繪', icon: '🎨' },
            { name: '頸部', icon: '🧴' }, { name: '裂縫', icon: '⚡' }, { name: '紋路', icon: '🌀' },
            { name: '殘片', icon: '🧩' }, { name: '罐底', icon: '🔵' }
        ]
    },
    {
        name: '古代竹簡', icon: '📜',
        stages: ['除霉', '裱褙'],
        prep: { name: '查閱字典', icon: '📖' },
        join: { name: '簡冊編繩', icon: '🔗' },
        finish: { name: '翻譯導覽', icon: '🗣️' },
        parts: [
            { name: '竹片', icon: '🎋' }, { name: '墨字', icon: '🖋️' }, { name: '編繩', icon: '🧵' },
            { name: '封泥', icon: '🟤' }, { name: '蟲蛀處', icon: '🐛' }, { name: '卷軸', icon: '📃' },
            { name: '標題簡', icon: '🏷️' }, { name: '木盒', icon: '📦' }
        ]
    },
    {
        name: '石雕神像', icon: '🗿',
        stages: ['除苔', '補土'],
        prep: { name: '測量比例', icon: '📐' },
        join: { name: '石件組立', icon: '🔗' },
        finish: { name: '立座展示', icon: '🏛️' },
        parts: [
            { name: '頭部', icon: '🗿' }, { name: '手臂', icon: '💪' }, { name: '冠飾', icon: '👑' },
            { name: '衣紋', icon: '〽️' }, { name: '眼睛', icon: '👁️' }, { name: '基石', icon: '🧱' },
            { name: '銘牌', icon: '🏷️' }, { name: '底座', icon: '🟫' }
        ]
    }
];

/* ---------------- 升級卡（每關結束三選一） ----------------
   八張卡的強度用排程模擬跑過（第 2~5 關各 150 局，比「有這張卡」和「沒有」的
   理想時間差幾 %）。原本從 0% 到 20% 都有，等於三選一裡常常有兩張是白牌：
     加大修復台 0.0%   ← 底子只有 3 位學者、剛好 3 條修復線，
     拆解工序   1.3%      根本湊不出第 4 個人去塞同一塊碎片，
                          解開修復線上的 🔒 也一樣沒有多的人可以派
     整理研究手冊/助理先開工 20.4%   ← 明顯的必選牌
   調完之後八張都落在 10~18%，每一張都值得考慮，也才選得下去。 */
const UPGRADES = [
    {
        id: 'hire2', icon: '👥', title: '招募學者', desc: '學者 <b>+2</b> 人',
        weight: 4, apply: M => { M.workers += 2; }            // 17.6%
    },
    {
        id: 'hire3', icon: '🏢', title: '大擴編', desc: '學者 <b>+3</b> 人<br>但所有工時 <b>+5%</b>',
        weight: 2, apply: M => { M.workers += 3; M.allSpeed *= 0.95; }   // 14.5%（原 -10% 只有 9.8%）
    },
    {
        id: 'simplify', icon: '📖', title: '整理研究手冊', desc: '🔒 只能一個人做的工作<br>時間 <b>-30%</b>',
        weight: 4, apply: M => { M.serialSpeed *= 1.43; }     // 15.3%（原 -40% 是 20.4%）
    },
    {
        // 改成固定拆「讀資料」：那是全場最前面、大家都在乾等的 🔒，
        // 也是「改流程」最好懂的示範。原本隨機拆修復線上的 🔒 只值 1.3%
        id: 'unlock', icon: '🔓', title: '拆解工序', desc: '<b>讀資料</b>不再是 🔒<br>大家可以一起查',
        weight: 3, apply: M => { M.unlockPrep = true; }       // 13.5%
    },
    {
        id: 'skilled', icon: '⚡', title: '熟練學者', desc: '所有工作速度 <b>+15%</b>',
        weight: 4, apply: M => { M.allSpeed *= 1.15; }        // 13.0%
    },
    {
        // 光是加容量沒有用（沒有多的人可以塞），一定要配一位學者才成立。
        // 跟「招募學者 +2」的差別是：人少一個，但可以疊在同一塊碎片上
        id: 'bench', icon: '🛠️', title: '加大修復台', desc: '學者 <b>+1</b> 人<br>每塊碎片可多容納 <b>1 位</b>',
        weight: 3, apply: M => { M.workers += 1; M.benchBonus += 1; }    // 15.5%
    },
    {
        id: 'auto', icon: '📋', title: '助理先開工', desc: '每件古物的<br><b>第一項工作先做好一半</b>',
        weight: 3, apply: M => { M.prepBoost = 0.5; }         // 10.2%（原本整項做完是 20.4%）
    },
    {
        id: 'prefab', icon: '🧹', title: '預先清理', desc: '每件古物開始時<br>隨機 <b>3 塊碎片做好一半</b>',
        weight: 3, apply: M => { M.prefab += 3; }             // 13.0%（原 2 塊是 8.4%）
    }
];

/* ---------------- 隨機事件（每關開場） ---------------- */
const EVENTS = [
    {
        icon: '😷', title: '有學者請假了！', text: '這件古物少 <b>1 位</b>學者，大家辛苦一點。',
        weight: 3, apply: O => { O.workerDelta -= 1; }
    },
    {
        // 門檻本身已經收緊到「理想時間 × 1.12」，這裡再砍 10% 等於只剩 1%，
        // 神也拿不到三顆星。跟著改成 5%，還是有壓力但不是死局
        icon: '🎫', title: '特展提前開幕！', text: '館長把檔期提前，星等時間全部 <b>縮短 5%</b>。',
        weight: 3, apply: O => { O.targetMul *= 0.95; }
    },
    {
        icon: '🎓', title: '資深研究員來指導', text: '這件古物所有 <b>🔒 工作快 30%</b>！',
        weight: 3, apply: O => { O.serialMul *= 1.43; }
    },
    {
        icon: '💔', title: '碎片比想像脆弱', text: '有一塊碎片的工時 <b>變成兩倍</b>。',
        weight: 3, apply: O => { O.brokenPart = true; }
    },
    {
        icon: '🍀', title: '志工來幫忙', text: '這件古物多 <b>2 位</b>學者！',
        weight: 2, apply: O => { O.workerDelta += 2; }
    },
    {
        icon: '📐', title: '策展人改方案', text: '這件古物 <b>多一項 🔒 工作</b>，只能一個人做。',
        weight: 2, apply: O => { O.extraSerial = true; }
    }
];

/* ---------------- 全域狀態 ---------------- */
let BASE = null;   // 一整局不變的底子（起始學者數、原始速度…）
let M = null;      // 這一件古物實際生效的能力值 = BASE + 這件古物抽到的升級卡
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

/* 抽 n 張不重複的升級卡
   （升級卡只在下一件古物生效，所以同一張卡下次再出現也沒關係，不用過濾） */
function drawUpgrades(n) {
    const pool = UPGRADES;
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

/* ---------------- Toast ----------------
   學生會連續猛點同一張 🔒 卡片，一次跳十則一樣的訊息會蓋住整個畫面。
   三道防線：同一則訊息有冷卻、任何訊息之間有最小間隔、畫面上最多疊 3 則。 */
const TOAST_LIFE = 2200;   // 一則訊息在畫面上待多久（要跟 CSS 動畫長度一致）
const TOAST_SAME = 2200;   // 同一則訊息的冷卻：講過了就等它自己消失再說
const TOAST_ANY = 350;     // 不同訊息之間的最小間隔，避免連點時一次噴一疊
const TOAST_MAX = 3;       // 畫面上最多同時幾則

let toastLast = { msg: '', at: -1e9, anyAt: -1e9 };

function toast(msg) {
    const now = performance.now();
    if (msg === toastLast.msg && now - toastLast.at < TOAST_SAME) return;
    if (now - toastLast.anyAt < TOAST_ANY) return;
    toastLast = { msg, at: now, anyAt: now };

    const area = $('toastArea');
    while (area.childElementCount >= TOAST_MAX) area.firstElementChild.remove();

    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = msg;
    area.appendChild(el);
    setTimeout(() => el.remove(), TOAST_LIFE);
}

/* ---------------- 彈窗 ---------------- */
function showOverlay(html) {
    $('overlayBox').innerHTML = html;
    $('overlay').classList.add('show');
}
function hideOverlay() { $('overlay').classList.remove('show'); }

/* ================================================================
   委託生成（程序化）
   結構：讀資料 → 多條修復線（每條 1~3 道工序，彼此平行）→ 拼合 → 展出
   ================================================================ */
/* 同一局裡不重複抽到同一件古物，玩起來才有「每件都不一樣」的感覺 */
function pickArtifact() {
    const used = (RUN && RUN.usedArtifacts) || [];
    const avail = ARTIFACTS.filter(a => !used.includes(a.name));
    const a = pick(avail.length ? avail : ARTIFACTS);
    if (RUN && RUN.usedArtifacts) RUN.usedArtifacts.push(a.name);
    return a;
}

function generateOrder(orderNo) {
    const artifact = pickArtifact();
    const L = LEVELS[Math.min(orderNo, LEVELS.length) - 1];

    // 長的修復線排在哪一條，每件古物隨機（難度一樣，但每次看起來不一樣）
    const stepPlan = pickShuffled(L.lines, LINE_COUNT);
    const partPool = pickShuffled(artifact.parts, LINE_COUNT);
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

    // 讀資料：永遠只能一個人做（教學上最好懂的 🔒）
    const prep = mk(artifact.prep.name, artifact.prep.icon, rand(L.prep[0], L.prep[1]), true, 'prep');

    // 修復線：固定 3 條，一條做一塊碎片的 1~3 道工序
    const cols = [];
    stepPlan.forEach((steps, c) => {
        const part = partPool[c % partPool.length];
        const col = [];
        for (let s = 0; s < steps; s++) {
            const name = s === 0 ? part.name : part.name + artifact.stages[s - 1];
            col.push(mk(name, part.icon, rand(L.part[0], L.part[1]), false, 'line'));
        }
        cols.push(col);
    });

    // 🔒 的「數量」由關卡決定、位置隨機：序列比重才穩定，不會偶爾難爆、偶爾太輕鬆。
    // 同一條修復線最多一個 🔒 —— 兩個 🔒 連在一起會變成誰都加速不了的長鏈，
    // 那條路一長，加人就完全沒感覺，「先變快、後來卡住」的曲線也就看不到了
    pickShuffled(cols, Math.min(L.locks, cols.length)).forEach(col => { pick(col).serial = true; });

    // 拼合：同步點，要等所有修復線做完
    const join = mk(artifact.join.name, artifact.join.icon, rand(L.join[0], L.join[1]), false, 'join');
    // 展出：只能一個人做
    const finish = mk(artifact.finish.name, artifact.finish.icon, rand(L.finish[0], L.finish[1]), true, 'finish');

    // 依賴關係
    cols.forEach(col => {
        col[0].deps.push(prep.id);
        for (let i = 1; i < col.length; i++) col[i].deps.push(col[i - 1].id);
        join.deps.push(col[col.length - 1].id);
    });
    finish.deps.push(join.id);

    const tasks = [prep, ...cols.flat(), join, finish];

    return { artifact, orderNo, prep, cols, join, finish, tasks };
}

/* ================================================================
   排程模擬：估算「N 個學者最快能做多久」
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

/* 模擬 N 個學者的最佳完成時間（秒）
   head：開場就先送的進度（id → 秒），升級卡「助理先開工 / 預先清理」用。
   不傳就是從零開始 —— 一律不看玩家當下的進度，算的是這件古物的「理想時間」 */
function simulateOptimal(order, workerCount, head) {
    const tasks = order.tasks.map(t => {
        const got = (head && head[t.id]) || 0;
        return {
            id: t.id, deps: t.deps, serial: t.serial,
            remain: Math.max(0, t.dur - got), done: t.dur - got <= 0
        };
    });

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

        // 分配學者：先每人一個，再把剩下的補給關鍵路徑最長的
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
    BASE = {
        workers: TUNING.startWorkers,
        allSpeed: 1,
        serialSpeed: 1,
        benchBonus: 0,
        unlockPrep: false,
        prepBoost: 0,      // 開場先幫「讀資料」做掉幾成
        prefab: 0
    };
    M = Object.assign({}, BASE);
    RUN = {
        orderNo: 0, totalTime: 0, stars: 0,
        usedArtifacts: [],
        picked: [],        // 這一局用過哪些升級卡（純紀錄）
        nextCard: null     // 已選好、要在下一件古物生效的那張
    };
}

function startRun() {
    sfx('card');
    newRun();
    $('startScreen').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    document.body.classList.add('playing');
    nextOrder();
}

/* ---------------- 進入下一件古物 ---------------- */
function nextOrder() {
    RUN.orderNo++;
    if (RUN.orderNo > TUNING.totalOrders) { showFinal(); return; }

    // 升級卡「只有下一件古物」生效：每件古物開頭都從底子重算一次，用完就丟。
    // 這樣每一關的選擇都是新的判斷，不會前面選錯就整局爬不起來
    M = Object.assign({}, BASE);
    M.card = RUN.nextCard;
    if (M.card) M.card.apply(M);
    RUN.nextCard = null;

    const order = generateOrder(RUN.orderNo);

    // 本關專屬 modifier（事件用）
    const O = { workerDelta: 0, targetMul: 1, serialMul: 1, brokenPart: false, extraSerial: false };
    let event = null;
    if (RUN.orderNo >= 2 && Math.random() < TUNING.eventChance) {
        event = weightedPick(EVENTS);
        event.apply(O);
    }

    // 升級卡「拆解工序」：讀資料改成大家可以一起查
    if (M.unlockPrep) order.prep.serial = false;
    // 事件：多一個 🔒（優先挑還沒有 🔒 的修復線，一條線兩個 🔒 會變成沒人加速得了的長鏈）
    if (O.extraSerial) {
        const clean = order.cols.filter(col => col.every(t => !t.serial));
        const free = (clean.length ? pick(clean) : order.cols.flat()).filter(t => !t.serial);
        if (free.length) pick(free).serial = true;
    }
    // 事件：碎片特別脆弱
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

    /* 開場優惠要先發，星等門檻才知道玩家已經先賺到多少。
       以前是先算門檻、再送進度 —— 那等於白送一段時間，「助理先開工」和
       「預先清理」兩張卡就成了穩拿三星的選擇，另外六張卡因為都算進理想時間裡
       反而不影響星等。同樣是三選一，強度差這麼多就沒得選了 */
    const head = {};
    if (M.prepBoost) head[order.prep.id] = order.prep.dur * M.prepBoost;
    for (let i = 0; i < M.prefab; i++) {
        const cands = order.tasks.filter(t => t.stage === 'line' && !head[t.id]);
        if (cands.length) { const t = pick(cands); head[t.id] = t.dur * 0.5; }
    }
    const ideal = simulateOptimal(order, workers, head);

    // 星等門檻先算成「整數秒」再存起來，之後評分也用同一組數字，
    // 畫面上寫 24 秒就真的是 24 秒（不會出現 24.4 秒被判失敗這種事）
    const t3 = Math.max(4, Math.round((ideal * TUNING.star3 + TUNING.grace) * O.targetMul));
    const t2 = Math.max(t3 + 2, Math.round((ideal * TUNING.star2 + TUNING.grace) * O.targetMul));

    G = {
        order, workers, ideal,
        star3Time: t3,
        star2Time: t2,
        elapsed: 0,
        running: false,
        idleAccum: 0,
        hintShown: false,
        crit: computeCriticalRemaining(order.tasks)
    };

    // 開場優惠：發的就是上面算門檻時已經算進去的那一份
    Object.keys(head).forEach(id => {
        const t = order.tasks.find(x => x.id === id);
        if (!t) return;
        t.progress = head[id];
        if (t.progress >= t.dur) { t.progress = t.dur; t.done = true; }
    });

    // 記下開工前的狀態，「重新挑戰」時原封不動還原
    // （同一件古物重打，才比得出換一種派工法差多少）
    G.snapshot = order.tasks.map(t => ({ id: t.id, progress: t.progress, done: t.done }));
    G.retries = 0;

    showBrief(event);
}

/* ---------------- 委託簡報 ---------------- */
function showBrief(event) {
    const o = G.order;
    const serialCount = o.tasks.filter(t => t.serial).length;
    const single = singleWorkerTime(o);

    // 關卡配置預覽：排成等一下真正要玩的形狀
    //（讀資料 → 3 條修復線 → 拼合 → 展出），先看清楚再決定怎麼派人
    const chip = t =>
        `<span class="bf-chip${t.serial ? ' serial' : ''}">${t.icon} ${t.name}`
        + ` <b>${t.dur.toFixed(0)}秒</b>${t.serial ? ' 🔒' : ''}</span>`;

    const layout = `
        <div class="brief-flow">
            <div class="bf-row">${chip(o.prep)}</div>
            <div class="bf-sep">讀完才能開始清碎片</div>
            <div class="bf-lines">
                ${o.cols.map(col =>
                    `<div class="bf-col">${col.map(chip).join('<span class="bf-down">▼</span>')}</div>`
                ).join('')}
            </div>
            <div class="bf-sep">🔗 碎片全部處理完才能拼合</div>
            <div class="bf-row">${chip(o.join)}<span class="bf-down">▶</span>${chip(o.finish)}</div>
        </div>`;

    // 本關生效的升級卡（下一關就沒了，講明白）
    const cardHtml = M.card ? `
        <div class="brief-card">
            <span class="bc-icon">${M.card.icon}</span>
            <span><b>${M.card.title}</b> 生效中<br>
            <small>${M.card.desc.replace(/<br>/g, ' ')}　·　<b>只有這一件古物有效</b></small></span>
        </div>` : '';

    const eventHtml = event ? `
        <div class="lesson" style="background:var(--warn-bg);border-color:var(--warn-border);text-align:center;">
            <h4 style="color:var(--warn);">${event.icon} ${event.title}</h4>
            <p>${event.text}</p>
        </div>` : '';

    showOverlay(`
        <div class="ob-icon">${o.artifact.icon}</div>
        <h3>古物 ${RUN.orderNo} / ${TUNING.totalOrders}：${o.artifact.name}</h3>
        <p>這件古物有 <b>${o.tasks.length}</b> 項工作，其中 <b>${serialCount} 項是 🔒</b>（只能一個人做）。</p>
        ${cardHtml}
        ${layout}
        <div class="stat-row">
            <div class="stat-box">
                <div class="sb-label">你的學者</div>
                <div class="sb-value">${G.workers} 人</div>
            </div>
            <div class="stat-box">
                <div class="sb-label">一個人要做</div>
                <div class="sb-value">${single.toFixed(0)} 秒</div>
            </div>
            <div class="stat-box good">
                <div class="sb-label">⭐⭐⭐ 要在</div>
                <div class="sb-value">${G.star3Time} 秒內</div>
            </div>
        </div>
        <div class="goal-note">
            <span class="goal g3">⭐⭐⭐ ${G.star3Time} 秒內</span>
            <span class="goal g2">⭐⭐ ${G.star2Time} 秒內</span>
            <span class="goal g1">⭐ 做完就有</span>
        </div>
        ${eventHtml}
        <div class="ob-btns">
            <button class="tm-btn big" onclick="beginOrder()"><i class="fa-solid fa-play"></i> 開始修復！</button>
        </div>
    `);
}

/* ---------------- 開工 ---------------- */
function beginOrder() {
    hideOverlay();
    sfx('card');
    buildBoard();
    refreshHud();
    // refreshHud() 之後才知道待命學者區有幾個圖示、星等門檻的字有多長 ——
    // 這兩塊一換行，修復線可用的高度就少一截，卡片尺寸得重算
    fitBoard();
    G.running = true;
    G.last = performance.now();
    rafId = requestAnimationFrame(tick);
}

/* ---------------- 建立修復線 DOM ---------------- */
function buildBoard() {
    const o = G.order;
    const board = $('board');
    board.innerHTML = '';

    board.appendChild(stageEl([o.prep], true));
    board.appendChild(arrowEl('讀完才能開始清碎片'));

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

    // 拼合 → 展出 橫著排：一樣是先後順序，但省下一整列高度給卡片放大
    board.appendChild(arrowEl('🔗 碎片全部處理完才能拼合'));
    const tail = document.createElement('div');
    tail.className = 'stage stage-tail';
    tail.appendChild(taskEl(o.join, true));
    const tailArrow = document.createElement('div');
    tailArrow.className = 'tail-arrow';
    tailArrow.textContent = '▶';
    tail.appendChild(tailArrow);
    tail.appendChild(taskEl(o.finish, true));
    board.appendChild(tail);

    updateBoard();
    fitBoard();
}

/* 把任務卡放到「整條修復線還能一頁看完」的最大尺寸
   （觸控電視上邊玩邊捲動非常難用；而整塊 scale() 縮放等於把按鈕又縮回去，
     所以改成直接調卡片大小 —— 螢幕越大按鈕就真的越大）

   三個變數各管一件事，兩軸分開量：
     --card-w    ：圖示、文字、內距的尺寸尺標 = 兩軸較小者（字才不會爆版）
     --card-wide ：只把卡片往橫向拉寬的倍率，由「一欄有多寬」決定
     --card-h    ：卡片高度，由「垂直空間 ÷ 列數」決定
   高度以前是寬度的固定比例（0.6 倍）且封頂在 320 —— 結果是只要一軸鬆一軸緊
   （4:3、直立平板鬆在垂直；21:9 鬆在水平）就一定浪費鬆的那軸。分開量才填得滿。 */
const CARD_MIN = 104;    // 再小就按不準了
const CARD_MAX = 320;    // 尺寸尺標的上限（圖示、文字的 clamp 到這裡也都頂到上限了）
const WIDE_MAX = 1.9;    // 最多拉寬到 1.9 倍；再寬中間的圖示和字就顯得空
const ASPECT_MAX = 0.90; // 卡片高 ÷ 尺標 的上限：垂直再鬆也不要變成一張直立長條
// 高度的下限不寫死比例：圖示＋名稱＋進度條的自然高度不是尺標的固定倍數
// （小尺標時佔比更高），寫死就會算出「塞不下卻以為塞得下」。改成每次量。
// 一律用最深的關卡（第 5 關 3 道工序）當基準算尺寸：五關的卡片一樣大、位置不跳。
// 觸控電視上換關卡時按鈕位移是會點錯的，比「前幾關按鈕更大」更要緊
const BASE_ROWS = Math.max(...LEVELS.map(l => Math.max(...l.lines)));

const SIZE_VARS = ['--card-w', '--card-h', '--card-wide', '--flat-w', '--content-w'];

/* 修復線的可用高度不是只有視窗大小會變：待命學者變多會多一列、星等門檻的字
   一長也會擠到換行，狀態列一變高，修復線就矮一截 —— 卡片尺寸是照舊的高度算的，
   下面那幾排就會被 .tm-card 的 overflow:hidden 裁掉（第 4、5 關學者最多，最容易中）。
   盯著 board 自己的尺寸重算，不管是誰把它擠矮的都補得回來 */
let fitting = false;
let lastFitBox = '';

function watchBoardSize() {
    if (!window.ResizeObserver) return;
    const board = $('board');
    new ResizeObserver(() => {
        if (fitting || !G || !G.order || !G.order.prep.el) return;
        if (board.clientWidth + 'x' + board.clientHeight === lastFitBox) return;
        fitBoard();
    }).observe(board);
}

function fitBoard() {
    const board = $('board');
    const body = document.body;
    fitting = true;
    try { fitBoardInner(board, body); } finally { fitting = false; }
    lastFitBox = board.clientWidth + 'x' + board.clientHeight;
}

function fitBoardInner(board, body) {
    board.style.transform = '';

    // 手機螢幕太窄，縮到能一頁看完會小到按不準；寧可讓它捲動，保住觸控目標大小
    if (window.innerWidth <= 720) {
        SIZE_VARS.forEach(v => body.style.removeProperty(v));
        return;
    }

    // .board 已經是 flex:1（見 CSS），它的內距框「就是」可用空間 ——
    // 不必再從 window.innerHeight 反推標題列佔多少，也不會跟卡片大小互相牽動
    const bs = getComputedStyle(board);
    const availW = board.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
    const availH = board.clientHeight - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom);
    if (availH < 80 || availW < 200) return;   // 還沒排版好（display:none 等），下次再算

    // 間距和箭頭寬度都是 clamp(…vw…)，跟著視窗變 —— 直接量，不要猜，
    // 少算幾 px 那一排就會 flex-wrap 折行，board 憑空多一列高度
    const tail = board.querySelector('.stage-tail');
    const gap = parseFloat(getComputedStyle(board.querySelector('.stage')).columnGap) || 22;
    const arrowW = tail ? tail.querySelector('.tail-arrow').offsetWidth : 26;
    const colW = (availW - (LINE_COUNT - 1) * gap - 4) / LINE_COUNT;   // 一欄能用多寬
    const rowStep = rowStepHeight(board);   // 多一道工序要多花的高度（▼ 加兩個列距）

    /* 先用「一欄有多寬」開一個尺標，再看垂直塞不塞得下：
       塞不下就按比例縮尺標（橫躺卡、箭頭、卡片內容的自然高度都會跟著變小），
       直到 BASE_ROWS 列剛好放得進去。通常一兩輪就收斂 */
    let u = clampNum(colW, CARD_MIN, CARD_MAX);
    let h = u * 0.6;
    for (let i = 0; i < 6; i++) {
        applyCardScale(u, colW, gap, arrowW, availW);
        const { fixed, rows, cardMin } = probeBoardHeight(board);
        // fixed 是「這一關」的固定成本；補上到 BASE_ROWS 還差幾列，五關才會一樣大
        const perRow = (availH - fixed - (BASE_ROWS - rows) * rowStep) / BASE_ROWS;
        if (perRow >= cardMin || u <= CARD_MIN) {
            h = clampNum(perRow, cardMin, u * ASPECT_MAX);
            break;
        }
        // 差多少就縮多少（再多縮 2% 當安全值），下一輪重量
        u = clampNum(u * (perRow / cardMin) * 0.98, CARD_MIN, CARD_MAX);
        h = cardMin;
    }
    applyCardScale(u, colW, gap, arrowW, availW);
    body.style.setProperty('--card-h', Math.floor(h) + 'px');

    // 連最小尺寸都塞不下（很矮的視窗）才退回整體縮放。
    // board 的高度已經被 flex/grid 釘死，所以不必再用負 margin 把多出來的空間收回
    const need = boardContentHeight(board);
    if (need > availH + 2) {
        board.style.transform = `scale(${Math.max(0.6, availH / need)})`;
    }
}

const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* 修復線上多一道工序要多花多少高度：一個 ▼ 加上它前後兩個列距。
   第 1、2 關可能一個 ▼ 都沒有，量不到就臨時放一個進去量 */
function rowStepHeight(board) {
    const col = board.querySelector('.line-col');
    if (!col) return 30;
    const gap = parseFloat(getComputedStyle(col).rowGap) || 8;
    let arrow = board.querySelector('.mini-arrow');
    let temp = null;
    if (!arrow) {
        temp = document.createElement('div');
        temp.className = 'mini-arrow';
        temp.textContent = '▼';
        col.appendChild(temp);
        arrow = temp;
    }
    const step = arrow.offsetHeight + gap * 2;
    if (temp) temp.remove();
    return step;
}

/* 修復線需要的高度 = 固定成本 + 列數 × 卡片高，對卡片高是線性的。
   與其去猜每一列、每個箭頭、每個間距各幾 px（改個 CSS 就會算錯），
   不如直接餵兩個高度量兩次，斜率就是列數、截距就是固定成本 */
function probeBoardHeight(board) {
    const body = document.body;
    // cardMin：卡片被圖示、名稱、進度條撐出來的自然高度，--card-h 再小也壓不下去。
    // 要取所有卡片的最大值 —— 名字長到折行的那張會比別人高，只看第一張會低估
    body.style.setProperty('--card-h', '0px');
    let cardMin = 0;
    board.querySelectorAll('.stage-lines .task-card').forEach(c => {
        cardMin = Math.max(cardMin, c.offsetHeight);
    });
    const p1 = 240, p2 = 340;   // 兩個探測高度都遠高於 cardMin，斜率才準
    body.style.setProperty('--card-h', p1 + 'px');
    const h1 = boardContentHeight(board);
    body.style.setProperty('--card-h', p2 + 'px');
    const h2 = boardContentHeight(board);
    const rows = Math.max(1, Math.round((h2 - h1) / (p2 - p1)));
    return { rows, cardMin, fixed: h1 - rows * p1 };
}

/* 修復線「真正需要」多高。不能直接量 board：它被 flex:1 / grid 1fr 撐滿了容器，
   量到的永遠是容器高度。各列本身的高度不受容器影響，加起來才是需求
   （.board 沒有設 row-gap，子元素也沒有上下 margin） */
function boardContentHeight(board) {
    let h = 0;
    for (const el of board.children) h += el.offsetHeight;
    return h;
}

/* 尺標定了之後，把寬度相關的變數一起算出來 */
function applyCardScale(u, colW, gap, arrowW, availW) {
    const body = document.body;
    const wide = clampNum(colW / u, 1, WIDE_MAX);
    // 卡片放大到上限後、內容實際需要的寬度。超寬螢幕就靠它把內容收在中間
    const contentW = Math.min(availW, u * wide * LINE_COUNT + (LINE_COUNT - 1) * gap);
    body.style.setProperty('--card-w', Math.floor(u) + 'px');
    body.style.setProperty('--card-wide', wide.toFixed(3));
    body.style.setProperty('--content-w', Math.floor(contentW) + 'px');
    // 橫躺卡：兩張並排剛好填滿一排（扣掉中間箭頭、兩個間距，再留 4px 安全值）
    body.style.setProperty('--flat-w', Math.floor((contentW - arrowW - gap * 2 - 4) / 2) + 'px');
}

function stageEl(tasks, flat) {
    const el = document.createElement('div');
    el.className = 'stage';
    tasks.forEach(t => el.appendChild(taskEl(t, flat)));
    return el;
}

function arrowEl(label) {
    const el = document.createElement('div');
    el.className = 'flow-arrow';
    el.innerHTML = `<span>${label || '▼'}</span>`;
    return el;
}

/* flat：讀資料 / 拼合 / 展出 這種一排只有一張的卡，改成橫躺省高度 */
function taskEl(t, flat) {
    const el = document.createElement('div');
    el.className = 'task-card';
    if (flat) el.classList.add('flat');
    el.dataset.id = t.id;
    el.innerHTML = `
        <div class="tc-lock">${t.serial ? '🔒' : ''}</div>
        <button class="tc-recall" title="收回學者">⤺</button>
        <div class="tc-icon">${t.icon}</div>
        <div class="tc-name">${t.name}${t.broken ? ' 🔧' : ''}</div>
        <div class="tc-meta">
            <span class="tc-dur">${t.dur.toFixed(0)} 秒</span>
            <span class="tc-workers"></span>
        </div>
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
        if (t.serial) toast('🔒 這項工作<b>只能一個人做</b>，派再多也不會變快！');
        else toast(`這塊碎片最多 ${cap} 位學者一起做`);
        return;
    }
    if (assignedTotal() >= G.workers) {
        shake(t); sfx('deny');
        toast('<i class="w-icon"></i> 沒有空的學者了！等別人做完吧');
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

/* ---------------- 主迴圈 ---------------- */
function tick(now) {
    if (!G || !G.running) return;
    const dt = Math.min((now - G.last) / 1000, 0.1);
    G.last = now;
    G.elapsed += dt;

    let changed = false;
    G.order.tasks.forEach(t => {
        if (t.done || t.workers === 0) return;
        if (!isReady(t)) { t.workers = 0; changed = true; return; }
        t.progress += dt * t.workers;
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

    // 提示：有空學者但沒事可做 → 這就是平行的極限
    if (!G.hintShown && idle > 0 && G.elapsed > 3) {
        const anyAssignable = G.order.tasks.some(t => !t.done && isReady(t) && t.workers < maxWorkersOf(t));
        if (!anyAssignable) {
            G.hintShown = true;
            toast('😴 學者沒事做了！<b>再多人也快不了</b>');
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
        t.workersEl.innerHTML = t.done ? '' : '<i class="w-icon"></i>'.repeat(t.workers);

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
    $('hudIcon').textContent = o.artifact.icon;
    $('hudName').textContent = o.artifact.name;
    $('hudProgress').textContent = `古物 ${RUN.orderNo} / ${TUNING.totalOrders}`;
    $('hudTime').textContent = G.elapsed.toFixed(1);

    // 三個星等門檻同時攤在檯面上：現在還拿得到哪一級（now）、哪一級已經飛了（gone）
    const nowStars = G.elapsed <= G.star3Time ? 3 : G.elapsed <= G.star2Time ? 2 : 1;
    [3, 2, 1].forEach(s => {
        const el = $('goal' + s);
        el.classList.toggle('now', s === nowStars);
        el.classList.toggle('gone', s > nowStars);
    });
    $('goal3Time').textContent = G.star3Time;
    $('goal2Time').textContent = G.star2Time;
    $('hudTimer').classList.toggle('danger', nowStars === 1);

    const assigned = assignedTotal();
    const idle = G.workers - assigned;
    $('idleCount').textContent = idle;
    $('totalCount').textContent = G.workers;

    const slots = $('workerSlots');
    if (slots.childElementCount !== G.workers) {
        slots.innerHTML = '';
        for (let i = 0; i < G.workers; i++) {
            const w = document.createElement('span');
            w.className = 'worker w-icon';
            slots.appendChild(w);
        }
    }
    Array.from(slots.children).forEach((w, i) => {
        w.className = 'worker w-icon ' + (i < assigned ? 'busy' : 'idle');
    });
}

/* ================================================================
   關卡結算
   ================================================================ */
function finishOrder() {
    G.running = false;
    cancelAnimationFrame(rafId);
    sfx('clear');

    const T = G.elapsed;
    const single = singleWorkerTime(G.order);
    const limit = simulateOptimal(G.order, 999);
    const speedup = single / T;
    const idleRate = Math.round((G.idleAccum / (G.workers * T)) * 100);

    // 用畫面上顯示的整數秒判定，玩家看到的門檻就是實際門檻
    let stars = 1;
    if (T <= G.star3Time) stars = 3;
    else if (T <= G.star2Time) stars = 2;

    RUN.totalTime += T;
    RUN.stars += stars;
    // 重新挑戰時要把這次的成績扣掉，只算最後一次
    G.lastResult = { time: T, stars };

    const serialSum = G.order.tasks.filter(t => t.serial).reduce((s, t) => s + t.dur, 0);
    const serialPct = Math.round((serialSum / single) * 100);

    // 差幾秒就升一級，講清楚才知道下一次要拚什麼
    const nextTier = stars === 3 ? '' :
        `<p class="goal-gap">再快 <b>${(T - (stars === 2 ? G.star3Time : G.star2Time)).toFixed(1)} 秒</b>`
        + `就能拿到 ${stars === 2 ? '⭐⭐⭐' : '⭐⭐'}！</p>`;

    showOverlay(`
        <div class="ob-icon">${stars === 3 ? '🏆' : stars === 2 ? '👍' : '🖼️'}</div>
        <h3>順利展出！</h3>
        <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div class="goal-note">
            <span class="goal g3${stars === 3 ? ' now' : ' gone'}">⭐⭐⭐ ${G.star3Time} 秒內</span>
            <span class="goal g2${stars === 2 ? ' now' : stars < 2 ? ' gone' : ''}">⭐⭐ ${G.star2Time} 秒內</span>
            <span class="goal g1${stars === 1 ? ' now' : ''}">⭐ 做完就有</span>
        </div>
        ${nextTier}
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
            <h4>💡 這件古物告訴我們</h4>
            <p>
                你有 <b>${G.workers} 位</b>學者，但只快了 <b>${speedup.toFixed(1)} 倍</b>，不是 ${G.workers} 倍。<br>
                因為這裡面有 <b>🔒 只能一個人做</b> 的工作，占了大約 <b>${serialPct}%</b> 的時間。<br>
                就算請來 <b>一百位學者</b>，這件古物最快也只能到 <b>${limit.toFixed(1)} 秒</b>。
            </p>
            <p class="term">學者閒置率 ${idleRate}%　·　電腦科學裡，這叫「阿姆達爾定律 Amdahl's Law」</p>
        </div>
        <div class="ob-btns">
            <button class="tm-btn ghost" onclick="retryOrder()">
                <i class="fa-solid fa-rotate-left"></i> 重新挑戰這件古物
            </button>
            <button class="tm-btn big" onclick="showUpgrades()">
                ${RUN.orderNo >= TUNING.totalOrders ? '看看總成績' : '選一張升級卡'} <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
        <p class="retry-note">換一種派工法，看看能不能更快 —— 重打不會累積時間，只算最後一次</p>
    `);
}

/* ---------------- 重新挑戰同一件古物 ---------------- */
function retryOrder() {
    if (!G || !G.snapshot) return;

    // 撤銷剛剛那次的成績（總時間 / 星星只算最後一次）
    if (G.lastResult) {
        RUN.totalTime -= G.lastResult.time;
        RUN.stars -= G.lastResult.stars;
        G.lastResult = null;
    }
    G.retries++;

    // 還原每個工作到開工前
    const byId = {};
    G.order.tasks.forEach(t => { byId[t.id] = t; });
    G.snapshot.forEach(s => {
        const t = byId[s.id];
        t.progress = s.progress;
        t.done = s.done;
        t.workers = 0;
    });

    G.elapsed = 0;
    G.running = false;
    G.idleAccum = 0;
    G.hintShown = false;

    toast(`🔄 重新挑戰（第 ${G.retries + 1} 次）`);
    beginOrder();
}

/* ---------------- 三選一升級卡 ---------------- */
function showUpgrades() {
    if (RUN.orderNo >= TUNING.totalOrders) { showFinal(); return; }
    sfx('card');

    const cards = drawUpgrades(3);
    window.__cards = cards;

    // 修復台同時最多站得下 3 條線 × 每項工作的上限 —— 拿這個引導「加人 vs 改流程」
    const capacity = LINE_COUNT * (TUNING.baseMaxWorkers + BASE.benchBonus);
    const hint = `下一件古物的修復台最多只站得下 <b>${capacity} 位</b>學者，你手上有 <b>${BASE.workers} 位</b>。`
        + `想想看：缺的是<b>人手</b>，還是<b>更順的流程</b>？`;

    showOverlay(`
        <div class="ob-icon">🎁</div>
        <h3>研究室升級！選一張</h3>
        <p>${hint}</p>
        <div class="notice">
            ⏳ 升級卡<b>只在下一件古物生效</b>，做完就失效 —— 每一件都要重新選一張，
            所以要看「<b>下一件古物長什麼樣</b>」來挑。選完會先讓你看配置再開工。
        </div>
        <div class="card-row">
            ${cards.map((c, i) => `
                <div class="up-card" onclick="chooseUpgrade(${i})">
                    <div class="uc-tag">只有下一件</div>
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
    // 不直接改 BASE：存起來，等 nextOrder() 只套用在下一件古物上
    RUN.nextCard = c;
    RUN.picked.push(c.title);
    sfx('done');
    toast(`${c.icon} <b>${c.title}</b>　只有下一件古物有效！`);
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
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="學者數與完成時間的關係圖">
            <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="var(--border-strong)" stroke-width="2"/>
            <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H - pad}" stroke="var(--border-strong)" stroke-width="2"/>
            <line x1="${pad}" y1="${y(limit).toFixed(1)}" x2="${W - pad}" y2="${y(limit).toFixed(1)}"
                  stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 5"/>
            <text x="${W - pad}" y="${(y(limit) - 8).toFixed(1)}" font-size="12" text-anchor="end" fill="var(--bad)">
                極限 ${limit.toFixed(0)} 秒 · 再多人也下不去
            </text>
            <path d="${path}" fill="none" stroke="var(--g1)" stroke-width="4" stroke-linejoin="round"/>
            ${dots}${ticks}
            <text x="${W / 2}" y="${H - 6}" font-size="13" text-anchor="middle" fill="var(--muted)">學者數量 →</text>
        </svg>
        <div class="ac-caption">
            這是最後一件古物的模擬：學者從 1 位加到 16 位，時間<b>一開始掉很快，後來幾乎不動</b>。
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
        <div class="ob-icon">🏛️</div>
        <h3>五件古物全部展出！</h3>
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
                <div class="sb-label">用過升級卡</div>
                <div class="sb-value">${RUN.picked.length} 張</div>
            </div>
        </div>
        ${isNew ? '<p style="color:var(--good);font-weight:700;">🎉 破紀錄了！</p>' : ''}
        ${amdahlChart(order)}
        <div class="lesson">
            <h4>💡 今天學到的事</h4>
            <p>
                <b>一、人多真的比較快</b>——大家同時處理不同的碎片，這叫<b>平行處理</b>。<br>
                <b>二、但快不了幾倍</b>——因為 🔒 只能一個人做的工作，和 🔗 要排隊等的工作，
                不管來幾個人，都得乖乖花那些時間。<br>
                <b>三、所以有時候「改流程」比「加人」更有效</b>——把 🔒 拆開、縮短，
                比多請十位學者還有用。
            </p>
            <p class="term">
                電腦裡的「學者」就是 <b>CPU 核心</b>。核心從 4 個變 8 個，程式卻沒有快一倍，
                就是因為這件事——這叫「<b>阿姆達爾定律</b>（Amdahl's Law）」。
            </p>
        </div>
        <div class="ob-btns">
            <button class="tm-btn big" onclick="restartRun()"><i class="fa-solid fa-rotate-left"></i> 再開一局</button>
            <button class="tm-btn ghost" onclick="backToStart()">回到首頁畫面</button>
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

/* ---------------- 最佳紀錄 ----------------
   儲存鍵沿用舊的 'tf-best'：改名等於把每台電腦上已經存的紀錄清成空白 */
function renderBest() {
    let best = null;
    try { best = JSON.parse(localStorage.getItem('tf-best')); } catch (e) { best = null; }
    $('bestRecord').innerHTML = best
        ? `🏅 最佳紀錄：<b>${best.stars} 顆星</b>，總共 <b>${best.totalTime.toFixed(0)} 秒</b>`
        : '每一局的古物、碎片、升級卡都不一樣';
}

/* ---------------- 啟動 ---------------- */
document.addEventListener('DOMContentLoaded', () => {
    renderBest();
    $('btnStart').addEventListener('click', startRun);
    window.addEventListener('resize', () => { if (G && G.order && G.order.prep.el) fitBoard(); });
    watchBoardSize();
});
