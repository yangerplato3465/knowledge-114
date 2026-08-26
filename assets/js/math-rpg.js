// 題庫資料來自 math-rpg-pools.js（須先載入，提供全域變數 QUESTION_POOLS）
let selectedGrade = null;
let selectedPool = null;
let activePool = [];      // 目前題庫：可為題目陣列，或會回傳題目的產生器函式
let currentQuestion = null; // 目前這一題

// === 敵人血量表：依序出現，第一隻 20，之後越來越多。可自行調整數值來平衡 ===
const ENEMY_HP_TABLE = [20, 28, 40, 56, 76, 100];

// 每隻敵人的外觀（數量不足時會循環使用）
// img：日後補圖時填入圖片路徑（例如 "../assets/images/math-rpg/enemy1.webp"），
//      填了就自動改用圖片、不再顯示 emoji，動畫完全不用改。
// idle：待機動作。省略＝站立呼吸；"float"＝離地飄浮；"heavy"＝大型怪的緩慢重量感。
const ENEMY_LOOKS = [
    { emoji: "🐾", name: "暗影小獸", img: "../assets/images/math-rpg/enemy1.webp" },
    { emoji: "🪶", name: "骨翼渡鴉", img: "../assets/images/math-rpg/enemy2.webp", idle: "float" },
    { emoji: "🏮", name: "提燈幽魂", img: "../assets/images/math-rpg/enemy3.webp", idle: "float" },
    { emoji: "🦴", name: "骨龍",     img: "../assets/images/math-rpg/enemy4.webp" },
    { emoji: "⚔️", name: "黑騎士",   img: "../assets/images/math-rpg/enemy5.webp", idle: "heavy" },
    { emoji: "👑", name: "暗黑魔王", img: "../assets/images/math-rpg/enemy6.webp", idle: "heavy" }
];

// 勇者的外觀（同樣預留 img 插槽）
//
// atkFrames：攻擊動作的分鏡，衝刺途中依序換上（見 playAttackFrame）。
//   每格是 { at: 佔 LUNGE_MS 的比例 0~1, img: 圖片路徑 }，必須由小到大排好。
//   跑完最後一格後會在 ATK_END 換回站姿。留空陣列就維持「整段都是站姿」的單張表現。
//   舊的單張 atk 欄位仍然支援（見 framesOf），六隻怪目前都還沒有攻擊圖。
//
// slash：劍氣。**刻意獨立成一張圖、不畫在勇者身上** —— 去背腳本是抓
//   「全圖不透明像素的外框」再正規化高度的，特效畫進角色圖會把外框撐大，
//   角色本體就會被等比縮小（小巨龍的火焰踩過這個坑）。獨立之後還能自己做飛行與淡出。
const PLAYER_LOOK = {
    emoji: "🧙", name: "勇者",
    img: "../assets/images/math-rpg/hero.webp",
    // 只有兩幀攻擊。原本規劃 4 幀（起手/斬上/斬下/收招），實作時砍掉後兩幀：
    //   「斬下」跟「斬上」在 Gemini 手上差異太細，每次都畫成斬上的變體；
    //   「收招」則是寫成「接近中立站姿」之後直接收斂回站姿，等於沒有資訊量。
    // 而且收招本來就不必用圖演 —— CSS 的 .lunge 會把角色平移出去再平移回來，
    // **回程本身就是收招**，回程時顯示站姿讀起來完全自然。
    atkFrames: [
        { at: 0.16, img: "../assets/images/math-rpg/hero-atk1.webp" },  // 起手：劍往後舉、身體壓低蓄力
        { at: 0.34, img: "../assets/images/math-rpg/hero-atk2.webp" }   // 斬擊：劍掃到身前（劍氣在此出現）
    ],
    slash: {
        // 0.26 x LUNGE_MS = 135ms：劍正掃到身前的那一刻（分鏡第二格在 0.34，
        // 劍氣要比「劍到位」再早一點出現才像是被揮出去的，不是憑空冒出來）。
        // 之後 CSS 動畫走 53% x 0.5s = 265ms 飛到怪物身上 = 400ms，
        // 剛好對上 SLASH_IMPACT_DELAY。三個數字綁在一起，改一個就要重算另外兩個。
        at: 0.26
        // img 不寫死：每次出手由 takeSlashImg() 決定要播哪一張（見 SLASH_FX）
    }
};

// === 劍氣圖庫 ===
// normal 每次普攻隨機挑一張。這是**純視覺**的變化，傷害計算完全不受影響——
// 玩家看到的攻擊不再是重複播同一個動畫，但數值平衡一個字都不用動。
// crit 則是固定的：爆擊必定播十字斬，讓「這一下不一樣」一眼就讀得出來。
//
// 這批圖跟角色圖走不同的處理流程（見 .claude/math-rpg-fx.sh）：
// 它們**保留純黑底、沒有去背**，靠 CSS 的 mix-blend-mode:screen 讓黑色變透明。
// 所以不要拿 math-rpg-keyer.ps1 去處理它們，那支是洋紅去背用的。
//
// 舊的 slash.webp 是洋紅去背產出的透明圖，混合方式跟這批不同，已退出圖庫；
// 檔案還留著，要回頭比對時可以直接改路徑試。
const SLASH_FX = {
    normal: [
        "../assets/images/math-rpg/slash-wide.webp",    // 寬橫斬：弧度最飽滿，主力
        "../assets/images/math-rpg/slash-arc.webp",     // 新月弧
        "../assets/images/math-rpg/slash-thrust.webp"   // 突刺：方向感最強
    ],
    crit: "../assets/images/math-rpg/slash-cross.webp"  // 十字斬：中心爆閃，爆擊專用
};

// 這一擊指定要用的劍氣。爆擊時先設好，playSlash 取用後自動清掉；
// null 就從 SLASH_FX.normal 隨機挑。
let pendingSlashImg = null;

function takeSlashImg() {
    if (pendingSlashImg) {
        const img = pendingSlashImg;
        pendingSlashImg = null;
        return img;
    }
    const pool = SLASH_FX.normal;
    return pool[Math.floor(Math.random() * pool.length)];
}

// 每一關的場景背景圖，null 就用 CSS 漸層的暫時配色。
// 這些圖是寬扁的帶狀（1600x286），不是原始的 16:9——戰鬥區的容器大約 6:1，
// 直接放 16:9 的圖只會顯示最底部那條純地面，天空與遠景全被 cover 裁掉。
// 裁切位置是逐張抓的，讓每張圖的「地面線」對齊角色腳底。
const STAGE_IMAGES = [
    "../assets/images/math-rpg/stage1.webp",
    "../assets/images/math-rpg/stage2.webp",
    "../assets/images/math-rpg/stage3.webp",
    "../assets/images/math-rpg/stage4.webp",
    "../assets/images/math-rpg/stage5.webp",
    "../assets/images/math-rpg/stage6.webp"
];

let PLAYER_MAX = 100;
let HIT_TO_ENEMY = 10;  // 勇者每次攻擊對敵人造成的固定傷害（可被強化提升）
let ROUND_TIME = 30;    // 每關秒數（可被強化延長）

// 每隻敵人造成的傷害：10 起跳，每關 +4 直到 30（對應 6 隻敵人）
const HIT_TO_PLAYER_TABLE = [10, 14, 18, 22, 26, 30];
let defenseReduction = 0; // 堅韌護甲累積的減傷量

// 目前這一關，答錯 / 時間到時勇者實際受到的傷害
function currentPlayerDamage() {
    const base = HIT_TO_PLAYER_TABLE[Math.min(currentEnemyIndex, HIT_TO_PLAYER_TABLE.length - 1)];
    return Math.max(0, base - defenseReduction);
}

// === 爆擊 ===
// 15% / 2 倍是刻意保守的起手值：期望傷害只上升 15%，而六隻怪的血量表
// （20→100）本來就有餘裕，不必重算平衡。玩家感受到的是「偶爾有一下特別爽」，
// 不是「難度變簡單了」。要調整就動這兩個數字，其他地方都不用改。
//
// 對答題遊戲來說爆擊還有一個好處：它是**唯一不由對錯決定的變數**。
// 答對一定打中，這是設計上的正確選擇（不能懲罰算對的孩子），
// 但也讓每一擊都一模一樣。爆擊在不引入「答對卻沒效果」的前提下補上了隨機性。
let CRIT_CHANCE = 0.15;   // 爆擊機率
let CRIT_MULT = 2;        // 爆擊傷害倍率

// 這一擊是否爆擊。抽到就順便把劍氣指定成十字斬。
function rollCrit() {
    const crit = Math.random() < CRIT_CHANCE;
    if (crit) pendingSlashImg = SLASH_FX.crit;
    return crit;
}

// === 打倒敵人後可三選一的強化（依 weight 加權隨機抽 3 個）===
// weight 是相對值，pickWeighted 會自己算總和，不必湊成 100。
// 目前：強力攻擊 32，其餘各 17（共 6 張，每次抽 3 張）
// fx：選擇後在勇者身上播放的特效（heal 綠光上升 / buff 金色迸發）
const UPGRADES = [
    { icon: "💚", title: "治療術", desc: "恢復 20% 最大生命", weight: 17, fx: "heal", apply: () => { playerHP = Math.min(PLAYER_MAX, playerHP + Math.round(PLAYER_MAX * 0.2)); } },
    { icon: "⚔️", title: "強力攻擊", desc: "攻擊傷害 +8", weight: 32, fx: "buff", apply: () => { HIT_TO_ENEMY += 8; } },
    { icon: "🛡️", title: "堅韌護甲", desc: "受到傷害 -5", weight: 17, fx: "buff", apply: () => { defenseReduction += 5; } },
    { icon: "❤️", title: "強健體魄", desc: "最大生命 +15", weight: 17, fx: "heal", apply: () => { PLAYER_MAX += 15; playerHP += 15; } },
    { icon: "⏱️", title: "從容思考", desc: "作答時間 +5 秒", weight: 17, fx: "buff", apply: () => { ROUND_TIME += 5; } },
    // 爆擊卡：+10% 機率，五關全拿也只到 65%，不會變成「每擊都爆」。
    // 它跟「強力攻擊 +8」是兩種成長路線——穩定加傷 vs 期望值加傷，
    // 期望傷害相近（+8 固定 ≈ +10% 爆擊在 HIT_TO_ENEMY≈40 時），但手感完全不同。
    { icon: "💥", title: "會心一擊", desc: "爆擊機率 +10%", weight: 17, fx: "buff", apply: () => { CRIT_CHANCE = Math.min(0.65, CRIT_CHANCE + 0.10); } }
];

let playerHP = PLAYER_MAX;
let currentEnemyIndex = 0;
let enemyMax = ENEMY_HP_TABLE[0];
let enemyHP = enemyMax;
let timerId = null;
let timeLeft = ROUND_TIME;

function startTimer() {
    timeLeft = ROUND_TIME;
    resumeTimer();
}

// 從目前的 timeLeft 接著跑，不歸零。給「離開確認」用：
// 跳出確認框時把時間凍住，選擇繼續戰鬥就從剛才那一秒接下去。
function resumeTimer() {
    clearInterval(timerId);
    renderTimer();
    timerId = setInterval(() => {
        timeLeft--;
        renderTimer();
        if (timeLeft <= 0) {
            clearInterval(timerId);
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() { clearInterval(timerId); }

function renderTimer() {
    document.getElementById('timer-secs').innerText = timeLeft;
    const fill = document.getElementById('timer-fill');
    const text = document.getElementById('timer-text');
    const track = document.querySelector('.timer-track');
    fill.style.width = `${Math.max(0, timeLeft) / ROUND_TIME * 100}%`;
    // 兩段警示：10 秒開始變紅慢跳，5 秒開始急跳
    const low = timeLeft <= 10;
    const danger = timeLeft <= 5;
    fill.classList.toggle('low', low);
    text.classList.toggle('low', low);
    fill.classList.toggle('danger', danger);
    text.classList.toggle('danger', danger);
    track.classList.toggle('danger', danger);
}

// 更新一條血條：實心條立刻縮，殘影條慢半拍才跟上，扣了多少血一眼看得出來
function setBar(side, current, max) {
    const ratio = `${Math.max(0, current) / max * 100}%`;
    document.getElementById(`${side}-hp`).style.width = ratio;
    document.getElementById(`${side}-hp-ghost`).style.width = ratio;
    document.getElementById(`${side}-hp-text`).innerText = `${Math.max(0, current)} / ${max}`;
    document.getElementById(`${side}-hp-track`).classList.toggle('low', current / max <= 0.3 && current > 0);
}

function updateBars() {
    setBar('player', playerHP, PLAYER_MAX);
    setBar('enemy', enemyHP, enemyMax);
}

function renderMap() {
    const map = document.getElementById('enemy-map');
    map.innerHTML = '';
    ENEMY_HP_TABLE.forEach((hp, i) => {
        if (i > 0) {
            const line = document.createElement('div');
            line.className = 'map-line' + (i <= currentEnemyIndex ? ' done' : '');
            line.dataset.i = i;   // 這條線通往第 i 個節點
            map.appendChild(line);
        }
        const node = document.createElement('div');
        let state = 'upcoming';
        if (i < currentEnemyIndex) state = 'done';
        else if (i === currentEnemyIndex) state = 'current';
        const isBoss = i === ENEMY_HP_TABLE.length - 1;
        // arrive：新的一關彈一下再開始脈動
        node.className = `map-node ${state}` + (isBoss ? ' boss' : '') + (state === 'current' ? ' arrive' : '');
        node.dataset.i = i;
        node.innerHTML = isBoss
            ? '<span class="boss-crown">👑</span><i class="fa-solid fa-skull-crossbones"></i>'
            : '<i class="fa-solid fa-skull"></i>';
        map.appendChild(node);
    });
}

// 打倒敵人的瞬間讓地圖前進一格：節點爆開，通往下一關的連接線發光填滿。
// 不重畫整張地圖，否則動畫會被砍掉。
function mapDefeat(index) {
    const map = document.getElementById('enemy-map');
    const node = map.querySelector(`.map-node[data-i="${index}"]`);
    if (node) {
        node.classList.remove('current', 'arrive');
        node.classList.add('done', 'defeat');
    }
    const line = map.querySelector(`.map-line[data-i="${index + 1}"]`);
    if (line) line.classList.add('flowing');
}

// === 角色外觀插槽 ===
// 有 img 就用圖片、沒有就用 emoji。未來補圖只要在 ENEMY_LOOKS / PLAYER_LOOK 填路徑，
// 所有動畫（呼吸、衝刺、受擊、倒下）都不用動。
function applyLook(side, look) {
    const sprite = document.getElementById(`${side}-sprite`);
    const glyph = document.getElementById(`${side}-avatar`);
    // 換角色時取消還在排程中的攻擊換圖，否則上一隻的計時器會把新角色的圖蓋掉
    clearAtkTimers(side);
    // 待機動作：飄浮的渡鴉／幽魂、笨重的黑騎士／暗黑魔王，其餘用預設的站立呼吸
    sprite.classList.remove('idle-float', 'idle-heavy');
    if (look.idle) sprite.classList.add(`idle-${look.idle}`);
    if (look.img) {
        sprite.style.setProperty('--sprite', `url("${look.img}")`);
        sprite.classList.add('has-img');
    } else {
        sprite.style.removeProperty('--sprite');
        sprite.classList.remove('has-img');
        glyph.innerText = look.emoji;
    }
}

// 切換關卡場景：有背景圖就用圖，沒有就用 data-stage 對應的 CSS 漸層
function applyStage(index) {
    const stage = document.getElementById('battle-stage');
    const bg = stage.querySelector('.stage-bg');
    const img = STAGE_IMAGES[index % STAGE_IMAGES.length];
    stage.dataset.stage = String((index % 6) + 1);
    if (img) {
        bg.style.setProperty('--stage-img', `url("${img}")`);
        stage.classList.add('has-stage-img');
    } else {
        bg.style.removeProperty('--stage-img');
        stage.classList.remove('has-stage-img');
    }
}

function spawnEnemy(index) {
    currentEnemyIndex = index;
    enemyMax = ENEMY_HP_TABLE[index];
    enemyHP = enemyMax;
    const look = ENEMY_LOOKS[index % ENEMY_LOOKS.length];

    // 讓上一隻的倒下動畫先清掉，新的怪才會從畫面外滑進來
    const sprite = document.getElementById('enemy-sprite');
    sprite.classList.remove('die', 'hurt', 'lunge');
    sprite.querySelector('.sprite-body').style.filter = '';

    applyLook('enemy', look);
    applyStage(index);
    document.getElementById('enemy-name').innerText = look.name;
    document.getElementById('round-label').innerText = `敵人 ${index + 1} / 共 ${ENEMY_HP_TABLE.length}`;
    act('enemy', 'spawn');
    renderMap();
    updateBars();
}

// ===================================================================
// 動畫與特效
// 這一層完全不依賴角色長什麼樣子（emoji 或圖片都一樣跑），
// 之後補圖只要填 ENEMY_LOOKS[].img，這裡一行都不用改。
// ===================================================================

// 目前的縮放單位（CSS 的 --u）。特效尺寸是用 JS 算的，要跟著介面一起縮放，
// 否則在觸控電視上放到最大時，碎片和彩帶會小得像灰塵。
// 不能用 getComputedStyle(...).getPropertyValue('--u')：自訂屬性拿回來的是
// 還沒求值的 "clamp(...)" 字串，parseFloat 會得到 NaN。改量一個寬度設成
// var(--u) 的隱形探針元素，讓瀏覽器把值算好。
function unit() {
    const probe = document.getElementById('u-probe');
    const w = probe ? probe.getBoundingClientRect().width : 0;
    return w > 0 ? w : 16;
}

// 重新播放一個 CSS 動畫（先移除 class 並強制 reflow，否則同一個 class 不會重播）
function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

// ===== 攻擊動作換圖 =====
// 衝刺途中依序播放 atkFrames 的分鏡，回位前換回站姿。
// 時間點是照 CSS 的 lunge keyframes 抓的：0~18% 反向蓄力（still 站姿才對），
// 18~70% 衝出並停留（攻擊動作），70% 之後回位（換回站姿）。
// 整段都用同一張攻擊圖的話就只是「平移一張圖」，要分拍才有「起手→揮擊→收招」。
const LUNGE_MS = 520;               // 對應 .sprite.lunge 的 0.52s
const ATK_END = 0.70;               // 換回站姿的時機：lunge 開始回位的那一刻，回程即收招
const atkTimers = { player: [], enemy: [] };

function currentLook(side) {
    return side === 'player'
        ? PLAYER_LOOK
        : ENEMY_LOOKS[currentEnemyIndex % ENEMY_LOOKS.length];
}

// 統一取分鏡：新的 atkFrames 優先，沒有就把舊的單張 atk 包成一格（向下相容）
function framesOf(look) {
    if (Array.isArray(look.atkFrames) && look.atkFrames.length) return look.atkFrames;
    if (look.atk) return [{ at: 0.18, img: look.atk }];
    return [];
}

function clearAtkTimers(side) {
    atkTimers[side].forEach(clearTimeout);
    atkTimers[side] = [];
}

// 只在「真的是一次攻擊」時才會被呼叫（見 act 的 asAttack）
function playAttackFrame(side) {
    const look = currentLook(side);
    const frames = framesOf(look);
    if (!frames.length || !look.img) return;   // 沒有分鏡就維持原本的單張表現
    const sprite = document.getElementById(`${side}-sprite`);
    clearAtkTimers(side);

    frames.forEach(f => {
        atkTimers[side].push(setTimeout(() => {
            sprite.style.setProperty('--sprite', `url("${f.img}")`);
        }, LUNGE_MS * f.at));
    });
    // 收尾一定要排在最後，且不能早於任何一格分鏡
    const endAt = Math.max(ATK_END, frames[frames.length - 1].at + 0.05);
    atkTimers[side].push(setTimeout(() => {
        sprite.style.setProperty('--sprite', `url("${look.img}")`);
    }, LUNGE_MS * endAt));

    if (look.slash) playSlash(side, look.slash);
}

// 劍氣：橫跨舞台的獨立一層，從攻擊方飛向被攻擊方。
//
// 軌跡是**每次出手現量的**，不是寫死的座標：量攻守雙方 sprite 的中心點，
// 換算成相對於 battle-stage 左緣的 px 再交給 CSS 變數。
// 這樣視窗縮放、換關卡、角色圖換大小都不用回來改，怪物反打也自動成立。
function playSlash(side, slash) {
    const el = document.getElementById('stage-slash');
    const stage = document.getElementById('battle-stage');
    if (!el || !stage) return;

    // 勇者的劍氣每次隨機（爆擊時已由 pendingSlashImg 指定）；
    // 怪物若日後補上自己的 slash.img，就照它自己的走。
    const img = (side === 'player') ? takeSlashImg() : slash.img;
    if (!img) return;

    const foe = side === 'player' ? 'enemy' : 'player';
    const attacker = document.getElementById(`${side}-sprite`);
    const defender = document.getElementById(`${foe}-sprite`);
    if (!attacker || !defender) return;

    const dir = side === 'player' ? 1 : -1;
    const stageLeft = stage.getBoundingClientRect().left;
    const centerOf = e => {
        const r = e.getBoundingClientRect();
        return r.left + r.width / 2 - stageLeft;
    };
    const u = unit();
    const from = centerOf(attacker) + dir * 2.5 * u;  // 起點在劍尖前方，不是角色正中央
    const to   = centerOf(defender);                  // 終點正是對手身上
    const over = to + dir * 6 * u;                    // 命中後再往前衝一段，才有貫穿感

    el.style.setProperty('--dir', dir);
    el.style.setProperty('--from', `${from}px`);
    el.style.setProperty('--to', `${to}px`);
    el.style.setProperty('--over', `${over}px`);
    el.style.setProperty('--slash', `url("${img}")`);

    atkTimers[side].push(setTimeout(() => {
        restart(el, 'slashing');
    }, LUNGE_MS * slash.at));
}

// 先把攻擊圖抓進快取，否則第一次出手會閃一下空白。
// 劍氣整組都要預載：隨機挑到還沒下載的那張會閃一格空白，而且只會發生在
// 「第一次抽到它」的那一擊，很難重現也很難查。
function preloadAttackFrames() {
    [PLAYER_LOOK].concat(ENEMY_LOOKS).forEach(l => {
        framesOf(l).forEach(f => { const im = new Image(); im.src = f.img; });
        if (l.slash && l.slash.img) { const im = new Image(); im.src = l.slash.img; }
    });
    SLASH_FX.normal.concat(SLASH_FX.crit).forEach(src => {
        const im = new Image(); im.src = src;
    });
}

// side 為 'player' 或 'enemy'
// asAttack 只在 cls==='lunge' 時有意義。false 代表「借用衝刺的位移，但這不是一次攻擊」：
// 攻擊分鏡和劍氣都不播，角色維持站姿往前跳一下而已。升級後的得意動作就是這樣。
function act(side, cls, asAttack = true) {
    const sprite = document.getElementById(`${side}-sprite`);
    restart(sprite, cls);
    if (cls !== 'lunge') return;
    if (asAttack) { playAttackFrame(side); return; }

    // 不是攻擊：把可能還停在攻擊分鏡上的圖拉回站姿，並取消排程中的換圖，
    // 否則上一次攻擊的收尾 timer 會在這一跳的中途把圖換掉。
    clearAtkTimers(side);
    const look = currentLook(side);
    if (look.img) sprite.style.setProperty('--sprite', `url("${look.img}")`);
}

function impact() {
    restart(document.getElementById('battle-stage'), 'impact');
}

function shakeScreen() {
    restart(document.querySelector('.game-card'), 'shake');
}

// 全場閃光：'bad' 紅色暈染（勇者受傷）、'good' 白色一閃（命中敵人）
function stageFlash(kind) {
    const el = document.getElementById('stage-flash');
    el.classList.remove('bad', 'good');
    void el.offsetWidth;
    el.classList.add(kind);
}

// 在某一側插入一個短命的特效節點，播完自動移除
function fxSpawn(side, cls, life, setup) {
    const el = document.createElement('span');
    el.className = `fx ${cls}`;
    if (setup) setup(el);
    document.getElementById(`${side}-slot`).appendChild(el);
    setTimeout(() => el.remove(), life);
    return el;
}

function fxSlash(side) { fxSpawn(side, 'fx-slash', 500); }
function fxRing(side)  { fxSpawn(side, 'fx-ring', 600); }

// 迸散的碎片：往上方扇形噴出
function fxSparks(side, color = '#ffd54f', count = 11) {
    const u = unit();
    for (let i = 0; i < count; i++) {
        fxSpawn(side, 'fx-spark', 850, el => {
            const angle = (-155 + Math.random() * 130) * Math.PI / 180;
            const dist = (2.5 + Math.random() * 3.6) * u;
            const size = (0.3 + Math.random() * 0.45) * u;
            el.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            el.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
            el.style.setProperty('--spark', color);
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.animationDelay = `${Math.random() * 0.08}s`;
        });
    }
}

// 治療：綠色光點從腳邊往上飄
function fxHeal(side, count = 10) {
    const u = unit();
    for (let i = 0; i < count; i++) {
        fxSpawn(side, 'fx-heal', 1700, el => {
            el.style.setProperty('--hx', `${(-2.25 + Math.random() * 4.5) * u}px`);
            el.style.animationDelay = `${Math.random() * 0.5}s`;
        });
    }
}

function showDamage(side, amount, color = '#e53935', crit = false) {
    const target = document.getElementById(`${side}-sprite`);
    const dmg = document.createElement('span');
    dmg.className = crit ? 'floating-dmg crit' : 'floating-dmg';
    dmg.style.color = color;
    dmg.innerText = crit ? `-${amount}!` : `-${amount}`;
    const rect = target.getBoundingClientRect();
    // 加上捲動位移，頁面捲動時數字才不會跑掉
    dmg.style.left = `${rect.left + window.scrollX + rect.width / 2 - 1.5 * unit()}px`;
    dmg.style.top = `${rect.top + window.scrollY}px`;
    document.body.appendChild(dmg);
    setTimeout(() => dmg.remove(), 1600);
}

// 「打到」對方的時間點。所有命中反饋（扣血、碎片、震動、傷害數字）都對齊這一刻。
//
// 兩種攻擊的節奏本來就不同，所以分成兩個值：
//   MELEE  怪物撲上來咬 —— 近身，衝刺到位就是命中，190ms。
//   SLASH  勇者放劍氣 —— 劍氣要飛越大半個舞台才打得到，命中必然比較晚。
//
// 400ms 是為了「看得清楚」訂的。原本兩者共用 190ms，劍氣只有 90ms 的飛行時間，
// 快到只看得見怪物身上閃一下。改成 400ms 後飛行有 265ms，
// 讀起來才是「揮劍 → 劍氣飛出去 → 打中怪物」三拍，而不是一團模糊。
// 勇者的衝刺動作 520ms 在此期間已經開始回位 —— 這是對的：
// 劍氣是拋射物，本來就該在揮劍收招之後才飛到對面。
const IMPACT_DELAY = 190;
const SLASH_IMPACT_DELAY = 400;

// 只有勇者會放劍氣（ENEMY_LOOKS 目前都沒有 slash），所以用攻擊方判斷就夠。
// 之後若幫怪物補上 slash，改成看 currentLook(attacker).slash 即可。
function impactDelayFor(attacker) {
    return currentLook(attacker).slash ? SLASH_IMPACT_DELAY : IMPACT_DELAY;
}

// 一次完整的攻擊：衝刺 → 命中（斬擊＋碎片＋震動＋扣血）→ 回位
// onImpact 會在命中的瞬間呼叫，血條就是在那時候才掉，打擊感才對得上
// crit：爆擊時把每一項反饋都加碼（碎片變多變金、傷害數字放大、震動加重），
// 讓「這下不一樣」從畫面本身讀得出來，而不是只靠文字說明。
function strike(attacker, defender, amount, onImpact, crit = false) {
    act(attacker, 'lunge');
    setTimeout(() => {
        act(defender, 'hurt');
        fxSlash(defender);
        fxRing(defender);
        fxSparks(defender,
            defender === 'enemy' ? (crit ? '#fff59d' : '#ffd54f') : '#ff8a80',
            crit ? 20 : 11);
        stageFlash(defender === 'enemy' ? 'good' : 'bad');
        impact();
        shakeScreen();
        if (crit) {
            // 第二次震動晚 90ms 疊上去，讀起來是「一記更重的撞擊」而不是抖兩下
            setTimeout(shakeScreen, 90);
            fxRing(defender);
        }
        showDamage(defender, amount, crit ? '#ffca28' : undefined, crit);
        if (onImpact) onImpact();
    }, impactDelayFor(attacker));
}

function pickWeighted(pool) {
    const total = pool.reduce((sum, u) => sum + u.weight, 0);
    let r = Math.random() * total;
    for (const u of pool) {
        r -= u.weight;
        if (r < 0) return u;
    }
    return pool[pool.length - 1];
}

function showUpgradePanel() {
    // 依 weight 加權、不重複地抽出 3 個強化
    const pool = [...UPGRADES];
    const picks = [];
    while (picks.length < 3 && pool.length) {
        const chosen = pickWeighted(pool);
        picks.push(chosen);
        pool.splice(pool.indexOf(chosen), 1);
    }
    const container = document.getElementById('upgrade-options');
    container.innerHTML = '';
    picks.forEach(upg => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-card';
        btn.innerHTML = `<div class="up-icon">${upg.icon}</div>` +
                        `<div class="up-title">${upg.title}</div>` +
                        `<div class="up-desc">${upg.desc}</div>`;
        btn.addEventListener('click', () => chooseUpgrade(upg, btn));
        container.appendChild(btn);
    });
    upgradeLocked = false;
    document.getElementById('upgrade-overlay').classList.remove('hidden');
}

// 防止連點：選中之後的演出期間不再接受點擊
let upgradeLocked = false;

function chooseUpgrade(upg, cardEl) {
    if (upgradeLocked) return;
    upgradeLocked = true;

    // 1) 被選中的卡放大發光，另外兩張縮小淡出
    document.querySelectorAll('#upgrade-options .upgrade-card')
        .forEach(c => c.classList.add(c === cardEl ? 'chosen' : 'dimmed'));

    setTimeout(() => {
        // 2) 整個面板縮小淡出
        const panel = document.querySelector('#upgrade-overlay .upgrade-panel');
        panel.classList.add('dismiss');

        setTimeout(() => {
            document.getElementById('upgrade-overlay').classList.add('hidden');
            panel.classList.remove('dismiss');

            // 3) 套用效果，並在勇者身上播特效，讓玩家看到「我變強了」
            upg.apply();
            updateBars(); // 反映治療 / 最大生命變化
            if (upg.fx === 'heal') fxHeal('player');
            else fxSparks('player', '#ffd54f', 14);
            act('player', 'lunge', false);   // 得意動作，不是攻擊 —— 不放劍氣

            // 4) 下一隻怪登場
            setTimeout(() => {
                spawnEnemy(currentEnemyIndex + 1);
                loadQuestion();
            }, 560);
        }, 260);
    }, 380);
}

function loadQuestion() {
    currentQuestion = (typeof activePool === 'function')
        ? activePool()
        : activePool[Math.floor(Math.random() * activePool.length)];
    const q = currentQuestion;
    document.getElementById('question-text').innerText = q.q;
    restart(document.getElementById('question-box'), 'enter');

    const grid = document.getElementById('option-grid');
    grid.innerHTML = q.a.map((opt, i) =>
        `<button class="option-btn enter" onclick="checkAnswer(${i})">${opt}</button>`
    ).join('');

    const feedback = document.getElementById('feedback-msg');
    feedback.innerText = '';
    feedback.className = 'feedback-msg';
    cancelNextRound();

    startTimer();
}

// === 答完題後自動進下一題 ===
// 答對要看的東西少，等短一點；答錯／時間到要留時間看正確答案，等久一點。
const NEXT_DELAY_CORRECT = 1.6; // 秒
const NEXT_DELAY_WRONG = 3.0;   // 秒

let nextRoundTimer = null;
let countdownTicker = null;

function cancelNextRound() {
    clearTimeout(nextRoundTimer);
    clearInterval(countdownTicker);
    nextRoundTimer = null;
    countdownTicker = null;
    document.getElementById('next-countdown').classList.add('hidden');
}

function scheduleNextRound(seconds) {
    cancelNextRound();
    const wrap = document.getElementById('next-countdown');
    const fill = document.getElementById('countdown-fill');
    const text = document.getElementById('countdown-text');

    wrap.classList.remove('hidden');

    // 進度條從滿到空。先把 transition 關掉歸位，強制 reflow 後再開，否則不會重播
    fill.style.transition = 'none';
    fill.style.width = '100%';
    void fill.offsetWidth;
    fill.style.transition = `width ${seconds}s linear`;
    fill.style.width = '0%';

    const endAt = performance.now() + seconds * 1000;
    const render = () => {
        const left = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
        text.innerText = `${left} 秒後繼續`;
    };
    render();
    countdownTicker = setInterval(render, 200);

    nextRoundTimer = setTimeout(() => {
        cancelNextRound();
        nextRound();
    }, seconds * 1000);
}

function damagePlayer(prefix, emoji) {
    const dmg = currentPlayerDamage();
    playerHP -= dmg;
    const feedback = document.getElementById('feedback-msg');
    feedback.innerText = `${prefix}，你受到 ${dmg} 點傷害 ${emoji}`;
    feedback.className = 'feedback-msg bad';

    // 怪物衝過來攻擊，血條在「打到」的那一刻才掉
    strike('enemy', 'player', dmg, updateBars);

    if (playerHP <= 0) {
        setTimeout(() => act('player', 'die'), IMPACT_DELAY + 320);
        setTimeout(() => endGame(false), IMPACT_DELAY + 1150);
        return;
    }
    scheduleNextRound(NEXT_DELAY_WRONG);
}

function handleTimeout() {
    const q = currentQuestion;
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);
    btns[q.correct].classList.add('correct');
    damagePlayer(`時間到！正確答案是 ${q.a[q.correct]}`, '⏰');
}

function checkAnswer(index) {
    stopTimer();
    const q = currentQuestion;
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);
    btns[q.correct].classList.add('correct');

    const feedback = document.getElementById('feedback-msg');

    if (index === q.correct) {
        // 先擲爆擊，再算傷害：rollCrit() 會順便把這一擊的劍氣指定成十字斬，
        // 必須排在 strike() 之前，否則劍氣已經抽完了。
        const crit = rollCrit();
        const dmg = crit ? Math.round(HIT_TO_ENEMY * CRIT_MULT) : HIT_TO_ENEMY;
        enemyHP -= dmg;

        // 勇者衝刺攻擊，血條在「打到」的那一刻才掉
        strike('player', 'enemy', dmg, updateBars, crit);

        // 後續每一拍都要跟著劍氣的命中時間走，不能再用近身的 IMPACT_DELAY，
        // 否則怪物會在劍氣還沒飛到的時候就先倒下。
        const hitAt = impactDelayFor('player');

        if (enemyHP <= 0) {
            const isLast = currentEnemyIndex >= ENEMY_HP_TABLE.length - 1;
            // 命中後停頓一下再倒下，最後的爆散比較有分量
            setTimeout(() => {
                act('enemy', 'die');
                fxSparks('enemy', '#fff59d', 18);
                mapDefeat(currentEnemyIndex); // 地圖同步前進一格
            }, hitAt + 300);

            if (isLast) {
                feedback.innerText = '攻擊成功！最後的敵人也被打倒了！ 🎉';
                feedback.className = 'feedback-msg good';
                setTimeout(() => endGame(true), hitAt + 1250);
                return;
            }
            feedback.innerText = '打倒敵人！選擇一項強化吧！ ⭐';
            feedback.className = 'feedback-msg good';
            setTimeout(showUpgradePanel, hitAt + 1150);
            return; // 由強化面板接手後續流程
        } else {
            feedback.innerText = crit
                ? `爆擊！對怪獸造成 ${dmg} 點傷害 💥`
                : `攻擊成功！對怪獸造成 ${dmg} 點傷害 ⚔️`;
            feedback.className = crit ? 'feedback-msg good crit' : 'feedback-msg good';
            scheduleNextRound(NEXT_DELAY_CORRECT);
        }
    } else {
        btns[index].classList.add('wrong');
        damagePlayer(`答錯了！正確答案是 ${q.a[q.correct]}`, '💥');
    }
}

function nextRound() {
    loadQuestion();
}

// 數字從 0 滾到目標值（ease-out）。
// 分頁被切到背景時 requestAnimationFrame 會暫停，所以用 timeout 保底補上終點值。
function rollNumber(el, to, ms, delay = 0) {
    const startAt = performance.now() + delay;
    let settled = false;
    const finish = () => { if (!settled) { settled = true; el.innerText = String(to); } };
    const step = now => {
        if (settled) return;
        const t = Math.min(1, Math.max(0, (now - startAt) / ms));
        el.innerText = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
    setTimeout(finish, delay + ms + 400);
}

const CONFETTI_COLORS = ['#ffd54f', '#ef5350', '#66bb6a', '#42a5f5', '#ab47bc', '#ff8a65'];

function fxConfetti(container, count = 70) {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 400;
    for (let i = 0; i < count; i++) {
        const c = document.createElement('span');
        c.className = 'confetti';
        c.style.left = `${Math.random() * w}px`;
        c.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        c.style.setProperty('--fall', `${h + 80}px`);
        c.style.setProperty('--drift', `${-70 + Math.random() * 140}px`);
        c.style.setProperty('--spin', `${360 + Math.random() * 720}deg`);
        c.style.setProperty('--dur', `${1.6 + Math.random() * 1.5}s`);
        c.style.setProperty('--delay', `${Math.random() * 0.9}s`);
        if (i % 3 === 0) c.style.borderRadius = '50%'; // 混一些圓形紙屑
        container.appendChild(c);
        setTimeout(() => c.remove(), 4500);
    }
}

function endGame(win) {
    stopTimer();
    cancelNextRound();
    document.getElementById('battle-screen').classList.add('hidden');
    document.body.classList.remove('in-battle');

    const end = document.getElementById('end-screen');
    end.querySelectorAll('.confetti').forEach(c => c.remove()); // 清掉上一場殘留的
    end.classList.remove('hidden', 'win', 'lose');
    void end.offsetWidth; // 重播進場動畫
    end.classList.add(win ? 'win' : 'lose');

    if (win) {
        document.getElementById('end-icon').innerText = '🏆';
        document.getElementById('end-title').innerText = '勝利！你打倒了所有敵人！';
        // 剩餘血量從 0 滾上去，等文字浮現後才開始跑
        document.getElementById('end-text').innerHTML =
            `剩餘血量：<span id="end-count">0</span> / ${PLAYER_MAX}`;
        rollNumber(document.getElementById('end-count'), Math.max(0, playerHP), 900, 700);
        fxConfetti(end, 70);
    } else {
        document.getElementById('end-icon').innerText = '💀';
        document.getElementById('end-title').innerText = '勇者倒下了…';
        document.getElementById('end-text').innerText = '再接再厲，多練習算術就能反敗為勝！';
    }
}

function beginBattle() {
    cancelNextRound(); // 上一場可能還有排程中的倒數
    // 重置所有可被強化的數值回到初始狀態
    PLAYER_MAX = 100;
    HIT_TO_ENEMY = 10;
    ROUND_TIME = 30;
    defenseReduction = 0;
    CRIT_CHANCE = 0.15;
    pendingSlashImg = null;   // 上一場若在爆擊途中離開，指定的劍氣會殘留到下一場
    playerHP = PLAYER_MAX;
    currentEnemyIndex = 0;
    document.getElementById('upgrade-overlay').classList.add('hidden');
    document.getElementById('howto-overlay').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('grade-screen').classList.add('hidden');
    document.getElementById('pool-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    document.body.classList.add('in-battle'); // 戰鬥中收起標題列，換取垂直空間

    preloadAttackFrames();

    // 重置勇者的外觀與動畫狀態（上一場可能停在倒下的畫面）
    const playerSprite = document.getElementById('player-sprite');
    playerSprite.classList.remove('die', 'hurt', 'lunge');
    playerSprite.querySelector('.sprite-body').style.filter = '';
    applyLook('player', PLAYER_LOOK);
    act('player', 'spawn');

    spawnEnemy(0);
    loadQuestion();
    scheduleClipCheck();
}

function restartGame() { beginBattle(); }

// ===== 開始前的選單流程：選年級 → 選題庫 → 玩法說明 → 開始 =====
function selectGrade(grade) {
    selectedGrade = grade;
    document.getElementById('grade-screen').classList.add('hidden');
    renderPoolScreen(grade);
    document.getElementById('pool-screen').classList.remove('hidden');
}

function renderPoolScreen(grade) {
    document.getElementById('pool-sub').innerText = `${grade}　請選擇一個題庫`;
    const list = document.getElementById('pool-list');
    list.innerHTML = '';
    Object.keys(QUESTION_POOLS[grade]).forEach((poolName, i) => {
        const btn = document.createElement('button');
        btn.className = 'pool-card';
        btn.innerHTML = `<span class="pool-num">${i + 1}</span>` +
                        `<span class="pool-name">${poolName}</span>` +
                        `<i class="fa-solid fa-chevron-right pool-arrow"></i>`;
        btn.addEventListener('click', () => selectPool(grade, poolName));
        list.appendChild(btn);
    });
}

function backToGrade() {
    document.getElementById('pool-screen').classList.add('hidden');
    document.getElementById('grade-screen').classList.remove('hidden');
}

// ===== 戰鬥中離開：左上角的返回鈕 =====
// 中途離開會失去進度，所以先問一次；等待回答期間把計時凍住，
// 否則學生看著確認框的時候答題時間還在流失。
let quitPausedWaitingNext = false;

function askQuit() {
    stopTimer();
    quitPausedWaitingNext = nextRoundTimer !== null; // 當下正在等下一題的倒數
    cancelNextRound();
    document.getElementById('quit-overlay').classList.remove('hidden');
}

function closeQuit() {
    document.getElementById('quit-overlay').classList.add('hidden');
    if (quitPausedWaitingNext) {
        // 剛才是在等下一題，補一段短倒數接回去，不要卡在原地
        scheduleNextRound(NEXT_DELAY_CORRECT);
    } else {
        resumeTimer();
    }
    quitPausedWaitingNext = false;
}

function confirmQuit() {
    stopTimer();
    cancelNextRound();
    clearTimeout(clipCheckTimer);
    quitPausedWaitingNext = false;
    document.getElementById('quit-overlay').classList.add('hidden');
    document.getElementById('upgrade-overlay').classList.add('hidden');
    document.getElementById('howto-overlay').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('pool-screen').classList.add('hidden');
    document.getElementById('grade-screen').classList.remove('hidden');
    document.body.classList.remove('in-battle'); // 標題列放回來
}

function selectPool(grade, pool) {
    selectedPool = pool;
    activePool = QUESTION_POOLS[grade][pool];
    document.getElementById('howto-pool-label').innerText = `${grade} ・ ${pool}`;
    document.getElementById('howto-overlay').classList.remove('hidden');
}

function startGame() {
    beginBattle();
}

// ===================================================================
// 版面保險：內容超出可視範圍時在 console 明講。
// CSS 那邊已經讓畫面可以捲動，不會再有東西憑空消失；這裡是為了讓
// 「本來應該一頁看完卻變成要捲」這件事被發現，而不是默默存在。
// ===================================================================
function warnIfClipped() {
    ['grade-screen', 'pool-screen', 'battle-screen', 'end-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.classList.contains('hidden')) return;
        if (el.scrollHeight > el.clientHeight + 2) {
            console.warn(
                `[數學勇者] #${id} 內容 ${el.scrollHeight}px 超過可視高度 ${el.clientHeight}px，已改為可捲動。` +
                `若想維持一頁到底，需要調小 --u 的高度係數或減少內容高度。`
            );
        }
    });
}

// 尺寸／方向改變後等版面穩定再檢查
let clipCheckTimer = null;
function scheduleClipCheck() {
    clearTimeout(clipCheckTimer);
    clipCheckTimer = setTimeout(warnIfClipped, 350);
}
window.addEventListener('resize', scheduleClipCheck);
window.addEventListener('orientationchange', scheduleClipCheck);

// ===================================================================
// 全螢幕
// 對 documentElement 全螢幕（而不是卡片本身），這樣頁面背景色會保留，
// 卡片在寬螢幕上置中時兩側才不會變成黑的。
// ===================================================================
function fullscreenOn() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function toggleFullscreen() {
    const el = document.documentElement;
    if (!fullscreenOn()) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) Promise.resolve(req.call(el)).catch(() => {});
    } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) Promise.resolve(exit.call(document)).catch(() => {});
    }
}

function syncFullscreenUI() {
    const on = fullscreenOn();
    document.body.classList.toggle('is-fullscreen', on);
    const btn = document.getElementById('fs-btn');
    if (!btn) return;
    btn.querySelector('i').className = on ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    btn.title = on ? '離開全螢幕' : '全螢幕';
    btn.setAttribute('aria-label', btn.title);
}

document.addEventListener('fullscreenchange', syncFullscreenUI);
document.addEventListener('webkitfullscreenchange', syncFullscreenUI);

(function initFullscreenBtn() {
    const el = document.documentElement;
    // iPhone 的 Safari 沒有 Fullscreen API，藏起按鈕免得按了沒反應
    if (!(el.requestFullscreen || el.webkitRequestFullscreen)) {
        const btn = document.getElementById('fs-btn');
        if (btn) btn.style.display = 'none';
    }
})();

// ===== 背景音樂：進入頁面後循環播放（瀏覽器需先有互動才允許播放） =====
const bgMusic = document.getElementById('bg-music');

function startMusic() {
    if (!bgMusic) return;
    bgMusic.volume = 0.4;
    bgMusic.play().catch(() => {}); // 被自動播放政策擋下時忽略，等下一次互動再試
}

(function initMusic() {
    startMusic(); // 先嘗試自動播放
    const playOnce = () => {
        startMusic();
        document.removeEventListener('pointerdown', playOnce);
        document.removeEventListener('keydown', playOnce);
    };
    document.addEventListener('pointerdown', playOnce);
    document.addEventListener('keydown', playOnce);
})();
