// 題庫資料來自 math-rpg-pools.js（須先載入，提供全域變數 QUESTION_POOLS）
let selectedGrade = null;
let selectedPool = null;
let activePool = [];      // 目前題庫：可為題目陣列，或會回傳題目的產生器函式
let currentQuestion = null; // 目前這一題

// === 敵人血量表：依序出現，第一隻 20，之後越來越多。可自行調整數值來平衡 ===
const ENEMY_HP_TABLE = [20, 28, 40, 56, 76, 100];

// 每隻敵人的外觀（數量不足時會循環使用）
const ENEMY_LOOKS = [
    { emoji: "👾", name: "史萊姆怪" },
    { emoji: "👻", name: "幽靈怪" },
    { emoji: "🦇", name: "蝙蝠怪" },
    { emoji: "🐲", name: "小巨龍" },
    { emoji: "👹", name: "惡鬼" },
    { emoji: "😈", name: "魔王" }
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

// === 打倒敵人後可三選一的強化（依 weight 加權隨機抽 3 個）===
// 強力攻擊 32%，其餘各 17%（總和 100）
const UPGRADES = [
    { icon: "💚", title: "治療術", desc: "恢復 20% 最大生命", weight: 17, apply: () => { playerHP = Math.min(PLAYER_MAX, playerHP + Math.round(PLAYER_MAX * 0.2)); } },
    { icon: "⚔️", title: "強力攻擊", desc: "攻擊傷害 +8", weight: 32, apply: () => { HIT_TO_ENEMY += 8; } },
    { icon: "🛡️", title: "堅韌護甲", desc: "受到傷害 -5", weight: 17, apply: () => { defenseReduction += 5; } },
    { icon: "❤️", title: "強健體魄", desc: "最大生命 +15", weight: 17, apply: () => { PLAYER_MAX += 15; playerHP += 15; } },
    { icon: "⏱️", title: "從容思考", desc: "作答時間 +5 秒", weight: 17, apply: () => { ROUND_TIME += 5; } }
];

let playerHP = PLAYER_MAX;
let currentEnemyIndex = 0;
let enemyMax = ENEMY_HP_TABLE[0];
let enemyHP = enemyMax;
let timerId = null;
let timeLeft = ROUND_TIME;

function startTimer() {
    clearInterval(timerId);
    timeLeft = ROUND_TIME;
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
    fill.style.width = `${Math.max(0, timeLeft) / ROUND_TIME * 100}%`;
    const low = timeLeft <= 10;
    fill.classList.toggle('low', low);
    text.classList.toggle('low', low);
}

function updateBars() {
    document.getElementById('player-hp').style.width = `${Math.max(0, playerHP) / PLAYER_MAX * 100}%`;
    document.getElementById('enemy-hp').style.width = `${Math.max(0, enemyHP) / enemyMax * 100}%`;
    document.getElementById('player-hp-text').innerText = `${Math.max(0, playerHP)} / ${PLAYER_MAX}`;
    document.getElementById('enemy-hp-text').innerText = `${Math.max(0, enemyHP)} / ${enemyMax}`;
}

function renderMap() {
    const map = document.getElementById('enemy-map');
    map.innerHTML = '';
    ENEMY_HP_TABLE.forEach((hp, i) => {
        if (i > 0) {
            const line = document.createElement('div');
            line.className = 'map-line' + (i <= currentEnemyIndex ? ' done' : '');
            map.appendChild(line);
        }
        const node = document.createElement('div');
        let state = 'upcoming';
        if (i < currentEnemyIndex) state = 'done';
        else if (i === currentEnemyIndex) state = 'current';
        const isBoss = i === ENEMY_HP_TABLE.length - 1;
        node.className = `map-node ${state}` + (isBoss ? ' boss' : '');
        node.innerHTML = isBoss
            ? '<span class="boss-crown">👑</span><i class="fa-solid fa-skull-crossbones"></i>'
            : '<i class="fa-solid fa-skull"></i>';
        map.appendChild(node);
    });
}

function spawnEnemy(index) {
    currentEnemyIndex = index;
    enemyMax = ENEMY_HP_TABLE[index];
    enemyHP = enemyMax;
    const look = ENEMY_LOOKS[index % ENEMY_LOOKS.length];
    document.getElementById('enemy-avatar').innerText = look.emoji;
    document.getElementById('enemy-name').innerText = look.name;
    document.getElementById('round-label').innerText = `敵人 ${index + 1} / 共 ${ENEMY_HP_TABLE.length}`;
    animate('enemy-avatar', 'attack');
    renderMap();
    updateBars();
}

function showDamage(targetId, amount, color) {
    const target = document.getElementById(targetId);
    const dmg = document.createElement('span');
    dmg.className = 'floating-dmg';
    dmg.style.color = color;
    dmg.innerText = `-${amount}`;
    const rect = target.getBoundingClientRect();
    dmg.style.left = `${rect.left + rect.width / 2 - 24}px`;
    dmg.style.top = `${rect.top}px`;
    document.body.appendChild(dmg);
    setTimeout(() => dmg.remove(), 1600);
}

function animate(id, cls) {
    const el = document.getElementById(id);
    el.classList.remove(cls);
    void el.offsetWidth; // reflow to restart animation
    el.classList.add(cls);
}

function shakeScreen() {
    const card = document.querySelector('.game-card');
    card.classList.remove('shake');
    void card.offsetWidth; // reflow to restart animation
    card.classList.add('shake');
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
        btn.addEventListener('click', () => chooseUpgrade(upg));
        container.appendChild(btn);
    });
    document.getElementById('upgrade-overlay').classList.remove('hidden');
}

function chooseUpgrade(upg) {
    upg.apply();
    document.getElementById('upgrade-overlay').classList.add('hidden');
    updateBars(); // 反映治療 / 最大生命變化
    spawnEnemy(currentEnemyIndex + 1);
    loadQuestion();
}

function loadQuestion() {
    currentQuestion = (typeof activePool === 'function')
        ? activePool()
        : activePool[Math.floor(Math.random() * activePool.length)];
    const q = currentQuestion;
    document.getElementById('question-text').innerText = q.q;

    const grid = document.getElementById('option-grid');
    grid.innerHTML = q.a.map((opt, i) =>
        `<button class="option-btn" onclick="checkAnswer(${i})">${opt}</button>`
    ).join('');

    const feedback = document.getElementById('feedback-msg');
    feedback.innerText = '';
    feedback.className = 'feedback-msg';
    document.getElementById('next-btn').classList.add('hidden');

    startTimer();
}

function revealNextButton() {
    const nextBtn = document.getElementById('next-btn');
    nextBtn.innerHTML = '繼續 <i class="fa-solid fa-arrow-right"></i>';
    nextBtn.classList.remove('hidden');
}

function damagePlayer(prefix, emoji) {
    const dmg = currentPlayerDamage();
    playerHP -= dmg;
    animate('enemy-avatar', 'attack');
    animate('player-avatar', 'hit');
    shakeScreen();
    showDamage('player-avatar', dmg, '#e53935');
    const feedback = document.getElementById('feedback-msg');
    feedback.innerText = `${prefix}，你受到 ${dmg} 點傷害 ${emoji}`;
    feedback.className = 'feedback-msg bad';
    updateBars();
    if (playerHP <= 0) { setTimeout(() => endGame(false), 700); return; }
    revealNextButton();
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
        enemyHP -= HIT_TO_ENEMY;
        animate('player-avatar', 'attack');
        animate('enemy-avatar', 'hit');
        shakeScreen();
        showDamage('enemy-avatar', HIT_TO_ENEMY, '#e53935');
        updateBars();

        if (enemyHP <= 0) {
            const isLast = currentEnemyIndex >= ENEMY_HP_TABLE.length - 1;
            if (isLast) {
                feedback.innerText = '攻擊成功！最後的敵人也被打倒了！ 🎉';
                feedback.className = 'feedback-msg good';
                setTimeout(() => endGame(true), 700);
                return;
            }
            feedback.innerText = '打倒敵人！選擇一項強化吧！ ⭐';
            feedback.className = 'feedback-msg good';
            setTimeout(showUpgradePanel, 600);
            return; // 由強化面板接手後續流程
        } else {
            feedback.innerText = `攻擊成功！對怪獸造成 ${HIT_TO_ENEMY} 點傷害 ⚔️`;
            feedback.className = 'feedback-msg good';
            revealNextButton();
        }
    } else {
        btns[index].classList.add('wrong');
        damagePlayer(`答錯了！正確答案是 ${q.a[q.correct]}`, '💥');
    }
}

function nextRound() {
    loadQuestion();
}

function endGame(win) {
    stopTimer();
    document.getElementById('battle-screen').classList.add('hidden');
    const end = document.getElementById('end-screen');
    end.classList.remove('hidden');
    if (win) {
        document.getElementById('end-icon').innerText = '🏆';
        document.getElementById('end-title').innerText = '勝利！你打倒了所有敵人！';
        document.getElementById('end-text').innerText = `剩餘血量：${Math.max(0, playerHP)} / ${PLAYER_MAX}`;
    } else {
        document.getElementById('end-icon').innerText = '💀';
        document.getElementById('end-title').innerText = '勇者倒下了…';
        document.getElementById('end-text').innerText = '再接再厲，多練習算術就能反敗為勝！';
    }
}

function beginBattle() {
    // 重置所有可被強化的數值回到初始狀態
    PLAYER_MAX = 100;
    HIT_TO_ENEMY = 10;
    ROUND_TIME = 30;
    defenseReduction = 0;
    playerHP = PLAYER_MAX;
    currentEnemyIndex = 0;
    document.getElementById('upgrade-overlay').classList.add('hidden');
    document.getElementById('howto-overlay').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('grade-screen').classList.add('hidden');
    document.getElementById('pool-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    spawnEnemy(0);
    loadQuestion();
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

function selectPool(grade, pool) {
    selectedPool = pool;
    activePool = QUESTION_POOLS[grade][pool];
    document.getElementById('howto-pool-label').innerText = `${grade} ・ ${pool}`;
    document.getElementById('howto-overlay').classList.remove('hidden');
}

function startGame() {
    beginBattle();
}

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
