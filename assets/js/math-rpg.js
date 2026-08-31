// 題庫資料來自 math-rpg-pools.js（須先載入，提供全域變數 QUESTION_POOLS）
let selectedGrade = null;
let selectedPool = null;
let activePool = [];      // 目前題庫：可為題目陣列，或會回傳題目的產生器函式
let currentQuestion = null; // 目前這一題

// ===================================================================
// 平衡的核心：用「刀數」定義戰鬥長度，不是用血量
// ===================================================================
// 舊版寫死 ENEMY_HP_TABLE = [20,28,40,56,76,100] 配固定攻擊力 10，
// 再讓「強力攻擊 +8」去改攻擊力 —— 結果是全場題數在 12 到 33 之間浮動：
//   每次都拿強力攻擊 → 每隻怪都剛好 2 刀 → 12 題
//   完全不拿          → 2,3,4,6,8,10 刀    → 33 題
// 對課堂來說這是實質問題（老師無法預期時長），而且玩得越好練到的題目越少。
//
// 現在反過來：**先決定每隻怪要砍幾刀**，血量由「刀數 x 該關攻擊力」算出來。
// 戰鬥長度變成設計出來的常數（基準 27 題），不再是數值運算的副產品。
// 代價：傷害型強化必須退出卡池（見 UPGRADES），改成隨關卡自動成長。
const ENEMY_HITS_TABLE = [3, 4, 4, 5, 5, 6];   // 基準 27 刀 = 27 題

// 勇者每一關的攻擊力。玩家看到傷害數字從 25 一路長到 75、敵人血條越來越長，
// 「我變強了」的感覺留著，但戰鬥長度不動 —— 成長是演出，不是平衡變數。
const HERO_ATK_TABLE = [25, 32, 40, 50, 62, 75];

// 敵人每一關的攻擊力。會先被勇者的護甲抵銷（見 currentPlayerDamage）。
// 勇者 120 血：第一關扛得住 12 次失誤，最後一關 4 次。
//
// 這組數字是**模擬跑出來的，不是憑感覺訂的**。第一版用 [12,16,20,25,30,36] 配 100 血，
// 3000 場模擬的結果是難度懸崖：
//   準確率 85% → 勝率 81%，但 70% → 27%、60% → 6%
// 一個答對七成的孩子只有四分之一機會通關，對國小課堂太嚴苛。
// 更糟的是**題數**：40% 準確率的孩子只打 12 題就結束 ——
// 最需要練習的人練得最少，這正是舊版「強力攻擊」問題換一個形式重演。
//
// 攻擊力降兩成 ＋ 基礎血量 100→120 之後：
//   85% → 95%(26題)   70% → 49%(29題)   60% → 17%(26題)   25%(亂猜) → 0%(15題)
// 題數對所有程度都拉平到 15~29，弱的孩子練習量幾乎翻倍。
// 亂猜仍然必敗，這條要守住 —— 不然遊戲就不需要算了。
const ENEMY_ATK_TABLE = [10, 13, 16, 20, 24, 28];

// === 每隻怪的特性 ===
// 讓六場戰鬥不再只是血量不同。索引對齊 ENEMY_LOOKS。
//
// special：每 N 次攻擊改打一次「特攻」，附帶狀態。null 就是普通怪。
//   every：幾次攻擊觸發一次   name：畫面上顯示的招式名
//   bleed / fog：施加的狀態層數（見「狀態」一節）
// armor：敵人自己的護甲，每次受擊直接減免這麼多傷害。
//   **會影響刀數**，所以血量是用「扣掉護甲後的有效傷害」回推的（見 spawnEnemy），
//   黑騎士不會因為有護甲就變得比表定更耐打。
// enrage：血量低於 at 時進入狂暴，攻擊力乘 atkMult，並額外附加 bleed 層。
const ENEMY_TRAITS = [
    // 1 暗影小獸：教學關，故意什麼特性都沒有，先讓孩子熟悉基本循環
    null,
    // 2 骨翼渡鴉：撕裂 —— 第一次遇到流血，層數給少一點
    { special: { every: 3, name: '撕裂', bleed: 3 } },
    // 3 提燈幽魂：迷霧 —— 不碰傷害，只壓縮思考時間，壓力來源換一種
    { special: { every: 3, name: '迷霧', fog: 2 } },
    // 4 骨龍：灼燒 —— 流血的強化版，觸發也更頻繁
    { special: { every: 2, name: '灼燒', bleed: 4 } },
    // 5 黑騎士：重甲 —— 敵人也有護甲，跟勇者的護甲是同一個機制，
    //   狀態列上看得到 🛡️12，孩子從對面身上學會這個數字的意義
    { armor: 12 },
    // 6 暗黑魔王：狂暴 —— 半血後攻擊力 1.5 倍，且每一擊都附帶流血
    { special: { every: 3, name: '暗影爪', bleed: 3 }, enrage: { at: 0.5, atkMult: 1.5, bleed: 2 } }
];

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
// normal 每次普攻隨機挑一張——**純視覺**變化，傷害計算完全不受影響。
// crit 固定播十字斬，讓「這一下不一樣」一眼就讀得出來。
//
// 這批圖由 .claude/math-rpg-fx.sh 處理（亮度轉 alpha），不是 keyer.ps1（洋紅去背）。
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

let PLAYER_MAX = 120;   // 見 ENEMY_ATK_TABLE 的註解：這個數字跟敵人攻擊力是一起調出來的
let ROUND_TIME = 30;    // 每關秒數（可被強化延長）

// === 護甲 ===
// 直接抵銷敵人的攻擊力，不是百分比減傷 —— 對小學生來說「30 打過來，我有 6 護甲，
// 所以扣 24」是能心算驗證的，百分比不行。這個數字全程顯示在勇者的狀態列上。
// 唯一穿透護甲的是流血（見 tickStatuses），否則後期堆護甲就等於無敵。
let playerArmor = 0;

// === 連擊 ===
// 連續答對累積層數，每層 +5% 傷害，上限預設 10 層（+50%）。答錯或超時歸零。
// 這是全場唯一會縮短戰鬥的變數：一路答對大約把 27 題壓到 22 題左右。
// 刻意留這個浮動 —— 它是「一路答對」的獎勵，而且範圍遠比舊版的 12~33 可控。
//
// **打倒怪物不會重置連擊。** 打倒本來就是連對的一部分，在那裡歸零等於懲罰打贏的人。
// 加成從第 2 刀才起算（連擊 1 是 +0%）—— 第一刀就加成的話，
// ENEMY_HITS_TABLE 反推出來的血量會對不上表定刀數，而且畫面上徽章要 2 層才出現，
// 「看不到徽章卻已經在加成」對孩子來說是無法驗證的。
const COMBO_STEP = 0.05;
let comboCap = 10;      // 「連擊精通」卡片會把上限往上推
let combo = 0;

function comboBonus() {
    return Math.max(0, Math.min(combo, comboCap) - 1) * COMBO_STEP;
}

// 勇者這一刀對敵人造成的傷害（尚未計爆擊，敵人護甲在 strike 之外另外扣）
function currentHeroDamage() {
    const base = HERO_ATK_TABLE[Math.min(currentEnemyIndex, HERO_ATK_TABLE.length - 1)];
    return Math.round(base * (1 + comboBonus()));
}

// 目前這一關，答錯 / 時間到時勇者實際受到的傷害
function currentPlayerDamage() {
    let base = ENEMY_ATK_TABLE[Math.min(currentEnemyIndex, ENEMY_ATK_TABLE.length - 1)];
    if (enemyEnraged) base = Math.round(base * (traitOf(currentEnemyIndex).enrage.atkMult));
    return Math.max(0, base - playerArmor);
}

// ===================================================================
// 狀態（debuff）
// ===================================================================
// 參考殺戮尖塔：層數制，每「回合」（這裡＝每答完一題）結算一次然後遞減。
//
// bleed 流血：結算時扣掉「層數」點血，**無視護甲**。護甲能擋的話堆滿護甲就免疫了，
//             流血的整個意義就是「你不能只靠護甲」。
// fog   迷霧：作答時間縮短，不碰傷害。壓力來源換一種，對算得慢的孩子最有感，
//             所以只給提燈幽魂一隻，而且下限保護在 8 秒（見 effectiveRoundTime）。
//
// 打倒敵人進下一關時全部清除（見 spawnEnemy）—— 不讓上一關的傷害跨關累積，
// 否則強化面板的正回饋會被一進場就掉血的挫折感抵銷。
const STATUS_DEFS = {
    bleed: { icon: '🩸', name: '流血', desc: '每答一題扣血，無視護甲' },
    fog:   { icon: '🌫️', name: '迷霧', desc: '作答時間縮短' }
};
const FOG_SECONDS = 8;      // 迷霧生效時扣掉的秒數
const FOG_MIN_TIME = 8;     // 但無論如何至少留這麼多秒
let playerStatus = { bleed: 0, fog: 0 };
let bleedResist = 0;        // 「止血繃帶」疊加：1 = 流血傷害減半，2 = 免疫
let playerShield = 0;       // 「護盾祝福」產生的層數，一層抵免一次攻擊
let shieldUnlocked = false; // 抽到護盾卡之後才會累積
const SHIELD_MAX = 3;
const SHIELD_EVERY = 3;     // 連對幾題長一層

function effectiveRoundTime() {
    return playerStatus.fog > 0
        ? Math.max(FOG_MIN_TIME, ROUND_TIME - FOG_SECONDS)
        : ROUND_TIME;
}

function traitOf(index) {
    return ENEMY_TRAITS[index % ENEMY_TRAITS.length] || {};
}

// 敵人的護甲：每次受擊直接減免。spawnEnemy 已經用有效傷害回推血量，
// 所以這裡扣掉之後刀數仍然符合 ENEMY_HITS_TABLE。
function enemyArmorValue() {
    return traitOf(currentEnemyIndex).armor || 0;
}

// === 爆擊 ===
// 15% / 2 倍是刻意保守的起手值。玩家感受到的是「偶爾有一下特別爽」，
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
// fx：選擇後在勇者身上播放的特效（heal 綠光上升 / buff 金色迸發）
// max：這張卡整場最多能拿幾次，拿滿就退出卡池（沒寫＝不限）。
//
// **卡池裡刻意沒有任何「攻擊傷害 +N」。**
// 舊版的「強力攻擊 +8」是嚴格優勢解：基礎傷害只有 10 時它等於 +80%，
// 而且打得快＝出題少＝答錯機會少，它同時還是最好的防禦卡，玩家沒有在做選擇。
// 現在攻擊力改由 HERO_ATK_TABLE 隨關卡自動成長，卡池專心處理「活下去」和「手感」，
// 六張卡之間才真的有取捨。
const UPGRADES = [
    { icon: "💚", title: "治療術", desc: "恢復 35% 最大生命", weight: 17, fx: "heal",
      apply: () => { playerHP = Math.min(PLAYER_MAX, playerHP + Math.round(PLAYER_MAX * 0.35)); } },

    // 護甲是這一版的主力防禦卡，權重給最高：它是唯一能讓後期 36 點攻擊變得可控的東西
    { icon: "🛡️", title: "強化護甲", desc: "護甲 +6（直接抵銷敵人攻擊力）", weight: 20, fx: "buff",
      apply: () => { playerArmor += 6; } },

    { icon: "❤️", title: "強健體魄", desc: "最大生命 +25", weight: 17, fx: "heal",
      apply: () => { PLAYER_MAX += 25; playerHP += 25; } },

    { icon: "⏱️", title: "從容思考", desc: "作答時間 +5 秒", weight: 15, fx: "buff",
      apply: () => { ROUND_TIME += 5; } },

    // 爆擊卡：+10% 機率，五關全拿也只到 65%，不會變成「每擊都爆」
    { icon: "💥", title: "會心一擊", desc: "爆擊機率 +10%", weight: 15, fx: "buff",
      apply: () => { CRIT_CHANCE = Math.min(0.65, CRIT_CHANCE + 0.10); } },

    // 連擊上限 +5 層＝傷害上限從 +50% 拉到 +75%。拿了會讓戰鬥更短，
    // 但那是「一路答對」才兌現得到的，答錯就歸零，所以不會變成無腦強卡
    { icon: "🔥", title: "連擊精通", desc: "連擊上限 +5 層（每層 +5% 傷害）", weight: 15, fx: "buff",
      apply: () => { comboCap += 5; }, max: 2 },

    // 針對流血的解藥。拿兩次就完全免疫 —— 上限訂在 2 是因為第三次沒東西可減，
    // 留在池子裡只會稀釋其他卡的出現率
    { icon: "🩹", title: "止血繃帶", desc: "清除負面狀態，流血傷害減半", weight: 12, fx: "heal",
      apply: () => { playerStatus.bleed = 0; playerStatus.fog = 0; bleedResist = Math.min(2, bleedResist + 1); }, max: 2 },

    // 護盾按使用者的要求放進卡池，而不是預設機制：拿到之後連對才開始有額外回報
    { icon: "✨", title: "護盾祝福", desc: `連對 ${SHIELD_EVERY} 題得 1 層護盾，抵免一次攻擊`, weight: 12, fx: "buff",
      apply: () => { shieldUnlocked = true; playerShield = Math.min(SHIELD_MAX, playerShield + 1); }, max: 1 }
];

// 每張卡已經拿了幾次，用 title 當 key。beginBattle 會清空。
let upgradeTaken = {};

let playerHP = PLAYER_MAX;
let currentEnemyIndex = 0;
let enemyMax = HERO_ATK_TABLE[0] * ENEMY_HITS_TABLE[0];
let enemyHP = enemyMax;
let enemyEnraged = false;   // 魔王是否已進入狂暴
let enemyAttackCount = 0;   // 這一關敵人打了幾次，用來判斷特攻的觸發時機
let timerId = null;
let timeLeft = ROUND_TIME;
// 這一題實際的總秒數。迷霧會讓它比 ROUND_TIME 短，計時條的比例要用它算，
// 不然一上場進度條就不是滿的。
let roundTimeMax = ROUND_TIME;

function startTimer() {
    roundTimeMax = effectiveRoundTime();
    timeLeft = roundTimeMax;
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
    fill.style.width = `${Math.max(0, timeLeft) / roundTimeMax * 100}%`;
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
    renderStatus();
}

// ===================================================================
// 狀態列
// ===================================================================
// 護甲、流血、迷霧、護盾、連擊全部要能一眼看到 —— 這些機制如果只存在於
// 程式碼裡，孩子只會覺得「我的血莫名其妙一直掉」，學不到任何東西。
// 每一顆徽章都帶 title，滑上去有完整說明。
//
// 有數字的徽章在數字變動時加 .bump 播一下放大，否則 3 變 2 完全不會被注意到。
function badge(cls, icon, value, title) {
    return `<span class="st-badge ${cls}" title="${title}" data-v="${value}">` +
           `<span class="st-icon">${icon}</span><span class="st-num">${value}</span></span>`;
}

// 記住上一次的內容，只有真的變了才重播動畫
const statusPrev = { player: '', enemy: '' };

function paintStatus(side, html) {
    const el = document.getElementById(`${side}-status`);
    if (!el) return;
    if (statusPrev[side] === html) return;
    statusPrev[side] = html;
    el.innerHTML = html;
    el.querySelectorAll('.st-badge').forEach(b => {
        b.classList.remove('bump');
        void b.offsetWidth;   // 強制 reflow，否則連續兩次同樣的動畫不會重播
        b.classList.add('bump');
    });
}

function renderStatus() {
    // --- 勇者 ---
    let p = '';
    if (playerArmor > 0) p += badge('armor', '🛡️', playerArmor, `護甲 ${playerArmor}：敵人攻擊力直接減 ${playerArmor}`);
    if (playerShield > 0) p += badge('shield', '✨', playerShield, `護盾 ${playerShield} 層：每層完全抵免一次攻擊`);
    if (playerStatus.bleed > 0) {
        const per = bleedDamagePerTick();
        p += badge('bleed', '🩸', playerStatus.bleed, `流血 ${playerStatus.bleed} 層：每答一題扣 ${per} 血（無視護甲），之後層數 -1`);
    }
    if (playerStatus.fog > 0) p += badge('fog', '🌫️', playerStatus.fog, `迷霧 ${playerStatus.fog} 層：作答時間縮短為 ${effectiveRoundTime()} 秒`);
    if (combo >= 2) {
        const pct = Math.round(comboBonus() * 100);
        p += badge('combo', '🔥', combo, `連擊 ${combo}：傷害 +${pct}%（上限 ${comboCap} 層）`);
    }
    paintStatus('player', p);

    // --- 敵人 ---
    let e = '';
    const trait = traitOf(currentEnemyIndex);
    let charge = 0;
    if (trait.armor) e += badge('armor', '🛡️', trait.armor, `重甲 ${trait.armor}：每次受到的傷害減 ${trait.armor}`);
    if (enemyEnraged) e += badge('enrage', '😡', '狂暴', '狂暴：攻擊力大幅提升，且每一擊都造成流血');
    if (trait.special && !enemyEnraged) {
        const s = trait.special;
        charge = s.every - (enemyAttackCount % s.every);
        e += badge('charge', '⚡', charge, `再攻擊 ${charge} 次就會使出「${s.name}」`);
    }
    paintStatus('enemy', e);

    // 把狀態推給 Pixi 的特效層。**這裡是唯一的推送點** ——
    // renderStatus() 本來就是所有狀態變動的匯流點（連擊、流血、迷霧、特攻倒數
    // 只要一變就會重畫徽章），不必在 checkAnswer / damagePlayer / handleTimeout
    // 各插一次呼叫，也就不會有「某條路徑忘了通知」的漏洞。
    if (typeof MathRpgPixi !== 'undefined' && MathRpgPixi.isReady()) {
        MathRpgPixi.setBattleState({
            combo,
            bleed: playerStatus.bleed,
            fog: playerStatus.fog,
            enemyCharge: charge
        });
    }
}

// 一層流血扣幾點血。止血繃帶疊一次減半、疊兩次免疫。
function bleedDamagePerTick() {
    if (bleedResist >= 2) return 0;
    const raw = playerStatus.bleed;
    return bleedResist === 1 ? Math.floor(raw / 2) : raw;
}

function renderMap() {
    const map = document.getElementById('enemy-map');
    map.innerHTML = '';
    ENEMY_HITS_TABLE.forEach((hits, i) => {
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
        const isBoss = i === ENEMY_HITS_TABLE.length - 1;
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

    // Pixi 介面層再加一層：節點爆開的碎光＋擴散環，以及沿著連線跑過去的流光。
    // CSS 那邊的 .defeat / .flowing 保留 —— 兩者是疊加的，Pixi 關掉仍然看得出地圖前進了。
    if (typeof MathRpgPixiUI !== 'undefined' && MathRpgPixiUI.isReady()) {
        MathRpgPixiUI.mapDefeat(index);
    }
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

    // 血量 = 刀數 x 這一關的有效傷害。
    // 「有效傷害」要先扣掉敵人自己的護甲，否則黑騎士的重甲 12 會憑空多出一刀，
    // ENEMY_HITS_TABLE 就不再是它宣稱的那個意思了。
    // 連擊加成不算進來 —— 那是玩家答對換來的，本來就該讓戰鬥變短。
    const trait = ENEMY_TRAITS[index % ENEMY_TRAITS.length] || {};
    const heroAtk = HERO_ATK_TABLE[Math.min(index, HERO_ATK_TABLE.length - 1)];
    const effective = Math.max(1, heroAtk - (trait.armor || 0));
    enemyMax = effective * ENEMY_HITS_TABLE[index];
    enemyHP = enemyMax;

    // 每一關的狀態全部歸零：上一關的流血不跨關累積，
    // 否則剛選完強化的正回饋會被「一進場就掉血」直接抵銷掉
    enemyEnraged = false;
    enemyAttackCount = 0;
    playerStatus.bleed = 0;
    playerStatus.fog = 0;

    const look = ENEMY_LOOKS[index % ENEMY_LOOKS.length];

    // 讓上一隻的倒下動畫先清掉，新的怪才會從畫面外滑進來
    const sprite = document.getElementById('enemy-sprite');
    sprite.classList.remove('die', 'hurt', 'lunge');
    sprite.querySelector('.sprite-body').style.filter = '';

    applyLook('enemy', look);
    applyStage(index);
    document.getElementById('enemy-name').innerText = look.name;
    document.getElementById('round-label').innerText = `敵人 ${index + 1} / 共 ${ENEMY_HITS_TABLE.length}`;
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

// 一次把整場戰鬥會用到的圖全部抓進快取（共 20 張，約 690KB）。
//
// 舊版只預載「攻擊分鏡」和「劍氣」，漏掉**怪物待機圖**和**場景背景**——
// 那正是打倒一隻怪、切下一關時會卡一下的原因：那兩張是換關當下才第一次去抓的。
// 六關的圖全部先抓不會太重，而且是在玩家還在選年級／題庫時就跑完了。
//
// decode() 是關鍵的第二步：只設 src 只保證「下載完」，圖第一次真正貼上畫面時
// 還要解碼，換關照樣會頓一下。先解碼好就沒有這一拍。不支援或失敗都無所謂，
// 那只是回到「有下載、沒預解碼」的狀態，catch 掉即可。
let assetsPreloaded = false;
function preloadBattleAssets() {
    if (assetsPreloaded) return;
    assetsPreloaded = true;

    const urls = [];
    [PLAYER_LOOK].concat(ENEMY_LOOKS).forEach(l => {
        if (l.img) urls.push(l.img);                       // 待機圖：舊版漏掉的第一項
        framesOf(l).forEach(f => urls.push(f.img));
        if (l.slash && l.slash.img) urls.push(l.slash.img);
    });
    // 劍氣整組都要：隨機挑到還沒下載的那張會閃一格空白，而且只會發生在
    // 「第一次抽到它」的那一擊，很難重現也很難查。
    urls.push(...SLASH_FX.normal, SLASH_FX.crit);
    urls.push(...STAGE_IMAGES.filter(Boolean));            // 場景背景：舊版漏掉的第二項

    urls.forEach(src => {
        const im = new Image();
        im.src = src;
        if (im.decode) im.decode().catch(() => {});
    });

    // Pixi 角色繪製層（assets/js/math-rpg-pixi.js）。
    // 它**只負責「畫」**，動作仍然由這裡的 CSS class 驅動 ——
    // act() / applyLook() / playAttackFrame() 一行都不用改，Pixi 每幀去讀 CSS 算好的結果。
    //
    // 要餵給 Pixi 的圖：角色（含攻擊分鏡）、場景背景（第 9 項視差用）、蓄力光柱（第 7 項）。
    // 劍氣仍然是 DOM 在畫，所以不用給。
    // 啟動失敗就靜靜留在 DOM 版本 —— 絕對不能因為特效層掛掉就讓遊戲玩不了。
    if (typeof MathRpgPixi !== 'undefined') {
        const pixiImgs = [];
        [PLAYER_LOOK].concat(ENEMY_LOOKS).forEach(l => {
            if (l.img) pixiImgs.push(l.img);
            framesOf(l).forEach(f => pixiImgs.push(f.img));
        });
        pixiImgs.push(...STAGE_IMAGES.filter(Boolean));
        pixiImgs.push('../assets/images/math-rpg/charge.webp');
        MathRpgPixi.init(pixiImgs)
            .catch(err => console.warn('Pixi 角色層啟動失敗，改用 DOM：', err));
    }
    // 介面特效層（傷害數字／地圖節點／勝利彩帶）。獨立一張蓋整卡的 canvas，
    // 因為那三樣東西都會超出 #battle-stage 的 overflow:hidden。
    if (typeof MathRpgPixiUI !== 'undefined') {
        MathRpgPixiUI.init()
            .catch(err => console.warn('Pixi 介面層啟動失敗，改用 DOM：', err));
    }
}

// side 為 'player' 或 'enemy'
// asAttack 只在 cls==='lunge' 時有意義：false 代表「借用衝刺的位移，但這不是一次攻擊」，
// 攻擊分鏡和劍氣都不播。
//
// **動作 class 互斥，必須先把其他的拿掉。**
//
// 2026-08-27 抓到的既有 bug：`.sprite.lunge` / `.hurt` / `.die` / `.spawn` 四條規則
// 特異性完全相同（0,2,0），同時命中時由「樣式表裡排最後的那一條」勝出 —— 也就是 `.spawn`。
// 而 restart() 只負責它被傳入的那一個 class，沒有人會把 `spawn` 拿掉，
// 所以 beginBattle / spawnEnemy 之後 `spawn` 就永久黏在元素上，
// 後續每一次 lunge / hurt / die 的 computed animation-name 都還是 `spawn`，
// **角色的衝刺、受擊後仰、倒地整組動畫等於完全沒有在跑**。
//
// 之所以一直沒被發現，是因為打擊感的其他來源都還在：攻擊分鏡換圖、劍氣、
// 畫面震動、粒子、以及 `.sprite.hurt .sprite-body` 的閃白 ——
// 最後這條是**後代選擇器、作用在不同元素上**，不受這個覆蓋影響，所以閃白照常。
//
// **加新動作時記得加進這個陣列**，否則它跟既有的四個同時存在時，
// 誰生效就變成看樣式表的順序，又會回到上面那個 bug。
const ACTION_CLASSES = ['lunge', 'hurt', 'die', 'spawn', 'cheer'];

function act(side, cls, asAttack = true) {
    const sprite = document.getElementById(`${side}-sprite`);
    ACTION_CLASSES.forEach(c => { if (c !== cls) sprite.classList.remove(c); });
    restart(sprite, cls);
    if (cls !== 'lunge' && cls !== 'cheer') return;
    if (cls === 'lunge' && asAttack) { playAttackFrame(side); return; }

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

// 迸散的碎片：往上方扇形噴出。
// Pixi 的粒子層接手之後，命中時的碎片改由 MathRpgPixi.impactFx() 噴（數量多兩個數量級、
// 而且能穿插在角色前後）。這裡保留 DOM 版本當作 Pixi 關掉時的備援，
// 以及**非命中**的用途（選完強化的得意特效、治療）—— 那些不會走 impactFx。
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

// 治療：綠色光點從腳邊往上飄。
// 這是最後一個還留在 DOM 的戰鬥特效，Pixi 在的話交給它（26 顆、能穿插在角色前後）。
function fxHeal(side, count = 10) {
    if (typeof MathRpgPixi !== 'undefined' && MathRpgPixi.isReady()
        && MathRpgPixi.healFx(side)) return;

    const u = unit();
    for (let i = 0; i < count; i++) {
        fxSpawn(side, 'fx-heal', 1700, el => {
            el.style.setProperty('--hx', `${(-2.25 + Math.random() * 4.5) * u}px`);
            el.style.animationDelay = `${Math.random() * 0.5}s`;
        });
    }
}

// raw：不要自動加上「-」前綴。給「格擋」「狂暴」這種不是數字的浮動字用。
function showDamage(side, amount, color = '#e53935', crit = false, raw = false) {
    const text = raw ? String(amount) : (crit ? `-${amount}!` : `-${amount}`);

    // Pixi 的介面層在的話交給它畫（進場超越回彈、上升帶弧線、爆擊多一圈殘影）。
    // 它的 canvas 蓋整張卡片，所以數字可以飄到角色頭頂上方而不被裁掉 ——
    // 戰鬥區那張 canvas 有 overflow:hidden，畫在那裡會被切掉一半。
    if (typeof MathRpgPixiUI !== 'undefined' && MathRpgPixiUI.isReady()
        && MathRpgPixiUI.showDamage(side, text, color, crit)) return;

    const target = document.getElementById(`${side}-sprite`);
    const dmg = document.createElement('span');
    dmg.className = crit ? 'floating-dmg crit' : 'floating-dmg';
    dmg.style.color = color;
    dmg.innerText = text;
    const rect = target.getBoundingClientRect();
    // 加上捲動位移，頁面捲動時數字才不會跑掉
    dmg.style.left = `${rect.left + window.scrollX + rect.width / 2 - 1.5 * unit()}px`;
    dmg.style.top = `${rect.top + window.scrollY}px`;
    document.body.appendChild(dmg);
    setTimeout(() => dmg.remove(), 1600);
}

// 「打到」對方的時間點，所有命中反饋（扣血、碎片、震動、傷害數字）都對齊這一刻。
// 分成兩個值是因為兩種攻擊的節奏不同：
//   190  怪物撲上來咬，近身，衝刺到位就是命中。
//   400  勇者放劍氣，要飛越大半個舞台。兩者原本共用 190ms，飛行只剩 90ms，
//        快到只看得見怪物身上閃一下；400ms 才讀得出「揮劍→飛出去→打中」三拍。
//        此時勇者的衝刺(520ms)已在回位，這是對的：拋射物本來就該在收招後才飛到對面。
const IMPACT_DELAY = 190;
const SLASH_IMPACT_DELAY = 400;

// 只有勇者有 slash，所以看攻擊方就夠。日後若幫怪物補上 slash 也自動成立。
function impactDelayFor(attacker) {
    return currentLook(attacker).slash ? SLASH_IMPACT_DELAY : IMPACT_DELAY;
}

// 一次完整的攻擊：衝刺 → 命中（斬擊＋碎片＋震動＋扣血）→ 回位
// onImpact 會在命中的瞬間呼叫，血條就是在那時候才掉，打擊感才對得上
// crit：爆擊時把每一項反饋都加碼（碎片變多變金、傷害數字放大、震動加重），
// 讓「這下不一樣」從畫面本身讀得出來，而不是只靠文字說明。
function strike(attacker, defender, amount, onImpact, crit = false) {
    act(attacker, 'lunge');

    // 爆擊的蓄力：出手的同時開始聚能，命中在 400ms 之後，中間的窗口剛好夠演。
    // **刻意不加任何等待** —— 蓄力疊在既有的衝刺動作上，時序一點都沒動，
    // 所以 slash.at / slashFly / SLASH_IMPACT_DELAY 那組綁死的數字完全不受影響。
    if (crit && typeof MathRpgPixi !== 'undefined' && MathRpgPixi.isReady()) {
        MathRpgPixi.chargeFx(attacker);
    }

    setTimeout(() => {
        act(defender, 'hurt');
        fxSlash(defender);
        fxRing(defender);

        // 命中的粒子：Pixi 在的時候交給它（爆散 + 衝擊波 + 爆擊的光束/色差/頓幀），
        // 不在就退回 DOM 的 11 顆碎片。**兩邊不能同時噴**，否則畫面上會有兩組碎片。
        const pixiFx = typeof MathRpgPixi !== 'undefined' && MathRpgPixi.isReady();
        if (pixiFx) {
            MathRpgPixi.impactFx(defender, {
                crit,
                tint: defender === 'enemy' ? (crit ? 0xfff59d : 0xffd54f) : 0xff8a80
            });
        } else {
            fxSparks(defender,
                defender === 'enemy' ? (crit ? '#fff59d' : '#ffd54f') : '#ff8a80',
                crit ? 20 : 11);
        }
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
    // 依 weight 加權、不重複地抽出 3 個強化。
    // 拿滿次數上限的卡直接排除（例如止血繃帶疊到 2 就免疫流血了，
    // 再留在池子裡只會稀釋其他卡的出現率）。
    const pool = UPGRADES.filter(u => !u.max || (upgradeTaken[u.title] || 0) < u.max);
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
            upgradeTaken[upg.title] = (upgradeTaken[upg.title] || 0) + 1;
            updateBars(); // 反映治療 / 最大生命 / 護甲 / 護盾的變化
            if (upg.fx === 'heal') fxHeal('player');
            else fxSparks('player', '#ffd54f', 14);
            // 得意動作：原地慶祝的跳躍。**不要用 lunge** ——
            // 那是往前衝 56px 的攻擊位移，前面沒有敵人時只會看起來像莫名其妙抖一下。
            act('player', 'cheer', false);

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

// ===================================================================
// 狀態結算
// ===================================================================
// 每答完一題跑一次，不論對錯。流血先扣血，然後所有狀態層數 -1。
// delay 是為了排在這一題的攻擊演出之後 —— 兩個扣血數字疊在同一個位置上會看不清楚。
//
// 回傳 true = 這次流血會讓勇者倒下，呼叫端就別再排下一題了。
// 這裡先用「現在的 playerHP」預判，是安全的：敵人的傷害在 damagePlayer 一開頭
// 就已經同步扣掉了，這中間沒有別的東西會動到血量。
function tickStatuses(delay) {
    if (playerStatus.bleed <= 0 && playerStatus.fog <= 0) return false;

    const dmg = bleedDamagePerTick();
    const lethal = dmg > 0 && playerHP - dmg <= 0;

    setTimeout(() => {
        if (dmg > 0) {
            playerHP -= dmg;
            showDamage('player', dmg, '#e57373');
            stageFlash('bad');
            updateBars();
        }
        if (playerStatus.bleed > 0) playerStatus.bleed--;
        if (playerStatus.fog > 0) playerStatus.fog--;
        renderStatus();
        if (playerHP <= 0) {
            act('player', 'die');
            setTimeout(() => endGame(false), 900);
        }
    }, delay);

    return lethal;
}

// ===================================================================
// 敵人的一次攻擊
// ===================================================================
// 只在勇者答錯或超時的時候呼叫 —— **答對永遠不會被反擊**。
// 這是刻意的：不能懲罰算對的孩子，所以敵人的所有特性都只能綁在失誤上。
function damagePlayer(prefix, emoji) {
    const feedback = document.getElementById('feedback-msg');
    const trait = traitOf(currentEnemyIndex);
    const sp = trait.special;
    const hitAt = impactDelayFor('enemy');

    enemyAttackCount++;
    // 特攻：每 every 次攻擊改打一次帶狀態的招式。狂暴中的魔王每一擊都算特攻。
    const isSpecial = !!sp && (enemyEnraged || enemyAttackCount % sp.every === 0);

    // --- 護盾優先結算 ---
    // 擋掉的是「整次攻擊」，附帶的流血／迷霧也一起沒了。
    // 規則越簡單，孩子越算得出來自己為什麼沒被打到。
    if (playerShield > 0) {
        playerShield--;
        feedback.innerText = `${prefix}，護盾擋下了這一擊！ ✨`;
        feedback.className = 'feedback-msg';
        act('enemy', 'lunge');
        setTimeout(() => {
            act('player', 'hurt');
            fxRing('player');
            fxSparks('player', '#4fc3f7', 14);
            impact();
            showDamage('player', '擋下！', '#4fc3f7', false, true);
            renderStatus();
        }, hitAt);
        if (!tickStatuses(hitAt + 640)) scheduleNextRound(NEXT_DELAY_WRONG);
        return;
    }

    const dmg = currentPlayerDamage();
    playerHP -= dmg;

    // 護甲擋掉了多少，直接寫在回饋文字裡 —— 這是護甲這張卡唯一能被「看見」的時刻
    const raw = ENEMY_ATK_TABLE[Math.min(currentEnemyIndex, ENEMY_ATK_TABLE.length - 1)];
    const blocked = playerArmor > 0 ? `（護甲擋掉 ${Math.min(playerArmor, enemyEnraged ? Math.round(raw * trait.enrage.atkMult) : raw)}）` : '';

    if (isSpecial) {
        feedback.innerText = `${prefix}，${ENEMY_LOOKS[currentEnemyIndex % ENEMY_LOOKS.length].name}使出「${sp.name}」！受到 ${dmg} 點傷害${blocked} ${emoji}`;
    } else {
        feedback.innerText = `${prefix}，你受到 ${dmg} 點傷害${blocked} ${emoji}`;
    }
    feedback.className = 'feedback-msg bad';

    // 怪物衝過來攻擊，血條在「打到」的那一刻才掉。
    // 特攻借用爆擊的加碼演出（雙重震動、放大的傷害數字），不必另外做一套。
    strike('enemy', 'player', dmg, updateBars, isSpecial);

    // 狀態在命中之後才掛上去，徽章跳出來的時機才對得上「被打到」那一下
    if (isSpecial) {
        setTimeout(() => {
            if (sp.bleed) playerStatus.bleed += sp.bleed;
            if (sp.fog) playerStatus.fog += sp.fog;
            // 狂暴的魔王每一擊額外再疊一點流血
            if (enemyEnraged && trait.enrage.bleed) playerStatus.bleed += trait.enrage.bleed;
            renderStatus();
        }, hitAt + 120);
    }

    if (playerHP <= 0) {
        setTimeout(() => act('player', 'die'), IMPACT_DELAY + 320);
        setTimeout(() => endGame(false), IMPACT_DELAY + 1150);
        return;
    }

    // 這一回合掛上的流血不會馬上生效（層數是在命中後 +120ms 才加的，
    // 而 tickStatuses 的預判在此刻就跑完了）—— 剛中的流血從下一題才開始扣，
    // 跟殺戮尖塔的中毒一樣，玩家有一題的時間可以反應。
    if (!tickStatuses(hitAt + 640)) scheduleNextRound(NEXT_DELAY_WRONG);
}

function handleTimeout() {
    const q = currentQuestion;
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);
    btns[q.correct].classList.add('correct');
    combo = 0;
    renderStatus();
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
        // 連擊先加，這一刀就吃得到新的加成 —— 連對第 2 題就看得到「+5%」跳出來，
        // 回饋越早出現，孩子越容易把「連續答對」和「打得更痛」連起來。
        combo++;
        if (shieldUnlocked && combo % SHIELD_EVERY === 0 && playerShield < SHIELD_MAX) {
            playerShield++;
            setTimeout(() => {
                fxSparks('player', '#4fc3f7', 12);
                showDamage('player', '護盾 +1', '#4fc3f7', false, true);
                renderStatus();
            }, 240);
        }

        // 先擲爆擊，再算傷害：rollCrit() 會順便把這一擊的劍氣指定成十字斬，
        // 必須排在 strike() 之前，否則劍氣已經抽完了。
        const crit = rollCrit();
        // 敵人的護甲直接從這一刀扣掉，但至少留 1 點 —— 讓「答對卻毫無效果」永遠不會發生
        const armor = enemyArmorValue();
        const before = currentHeroDamage() * (crit ? CRIT_MULT : 1);
        const dmg = Math.max(1, Math.round(before) - armor);
        enemyHP -= dmg;

        // 勇者衝刺攻擊，血條在「打到」的那一刻才掉
        strike('player', 'enemy', dmg, updateBars, crit);

        // 後續每一拍都要跟著劍氣的命中時間走，不能再用近身的 IMPACT_DELAY，
        // 否則怪物會在劍氣還沒飛到的時候就先倒下。
        const hitAt = impactDelayFor('player');

        // 狂暴：魔王掉到半血就翻臉。演出排在命中之後，讀起來是「這一刀把牠打火了」
        const trait = traitOf(currentEnemyIndex);
        if (trait.enrage && !enemyEnraged && enemyHP > 0 && enemyHP / enemyMax <= trait.enrage.at) {
            enemyEnraged = true;
            setTimeout(() => {
                showDamage('enemy', '狂暴！', '#ff5252', true, true);
                stageFlash('bad');
                shakeScreen();
                fxSparks('enemy', '#ff5252', 20);
                renderStatus();
            }, hitAt + 420);
        }

        if (enemyHP <= 0) {
            const isLast = currentEnemyIndex >= ENEMY_HITS_TABLE.length - 1;
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
            const comboTag = combo >= 2 ? `連擊 ${combo}（+${Math.round(comboBonus() * 100)}%）！` : '';
            const armorTag = armor > 0 ? `（重甲吸收 ${armor}）` : '';
            feedback.innerText = crit
                ? `${comboTag}爆擊！對怪獸造成 ${dmg} 點傷害${armorTag} 💥`
                : `${comboTag}攻擊成功！對怪獸造成 ${dmg} 點傷害${armorTag} ⚔️`;
            feedback.className = crit ? 'feedback-msg good crit' : 'feedback-msg good';
            // 答對也要結算流血 —— 流血的整個意義就是「時間本身在傷害你」，
            // 答對可以免疫的話它就退化成第二種答錯懲罰了
            if (!tickStatuses(hitAt + 500)) scheduleNextRound(NEXT_DELAY_CORRECT);
        }
    } else {
        combo = 0;
        renderStatus();
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
    // Pixi 版：2000 顆帶重力、翻面、側飄，一次 draw call。
    // DOM 版的 70 顆保留當備援 —— 兩者不能同時噴，數量差太多會看起來很怪。
    if (typeof MathRpgPixiUI !== 'undefined' && MathRpgPixiUI.isReady()
        && MathRpgPixiUI.confettiBurst()) return;

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
    PLAYER_MAX = 120;
    ROUND_TIME = 30;
    playerArmor = 0;
    CRIT_CHANCE = 0.15;
    combo = 0;
    comboCap = 10;
    playerShield = 0;
    shieldUnlocked = false;
    bleedResist = 0;
    playerStatus = { bleed: 0, fog: 0 };
    upgradeTaken = {};
    enemyEnraged = false;
    enemyAttackCount = 0;
    // 狀態列的快取也要清掉，否則上一場的徽章 HTML 會被當成「沒變」而不重畫
    statusPrev.player = statusPrev.enemy = '';
    // 上一場的特效全部清掉。**不只是灰階** —— 戰鬥畫面被藏起來時 Pixi 的 frame()
    // 會直接 return，粒子與碎片是「凍住」而不是繼續衰減，不清的話新局第一幀
    // 會原封不動接著播上一場的爆炸（中途按返回、或輸了再挑戰都會遇到）。
    if (typeof MathRpgPixi !== 'undefined' && MathRpgPixi.isReady()) MathRpgPixi.reset();
    if (typeof MathRpgPixiUI !== 'undefined' && MathRpgPixiUI.isReady()) MathRpgPixiUI.reset();
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

    preloadBattleAssets();   // 已在載入頁面時跑過，這裡是保險（內部有 guard，重複呼叫免費）

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

// 一進頁面就開始抓圖，不等到按下「開始戰鬥」。
// 玩家選年級、選題庫、讀說明的那十幾秒，足夠把 690KB 全部抓完並解碼好，
// 等真的開打時六關的怪物與場景都已經在記憶體裡了。
(function initPreload() {
    preloadBattleAssets();
})();

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
