import {
    Application, Assets, AnimatedSprite, Container, Graphics, Rectangle, Text, Texture
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';

// ============================================================
// 班級 RPG · 冒險世界（Pixi.js v8 基礎架構）
// 角色使用 Mana Seed Character Base 素材（64×64 格、8×8 張圖）。
// 動畫對照（animations, page 1）：
//   上半 rows 0–3：stand = col 0，方向順序 下、上、右、左
//   下半 rows 4–7：walk = cols 0–5 六格循環
//                  run  = walk 的第 3、6 格換成 cols 6、7
// ============================================================

const container = document.getElementById('gameContainer');
const cssVar = name => getComputedStyle(document.body).getPropertyValue(name).trim();

// ---- 建立 Pixi 應用 ----
const app = new Application();
await app.init({
    resizeTo: container,                       // 跟著容器自動調整大小
    background: cssVar('--surface') || '#ffffff',
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
document.getElementById('gameLoading')?.remove();
container.appendChild(app.canvas);

// ---- 角色圖集 ----
const CELL = 64;
const sheet = await Assets.load('../assets/images/char/char1.png');
sheet.source.scaleMode = 'nearest';            // 像素風：放大不模糊

const frameAt = (col, row) =>
    new Texture({ source: sheet.source, frame: new Rectangle(col * CELL, row * CELL, CELL, CELL) });

const DIRS = ['down', 'up', 'right', 'left'];  // 圖集的方向列順序
const ANIMS = {};
DIRS.forEach((dir, row) => {
    ANIMS[dir] = {
        stand: [frameAt(0, row)],
        walk:  [0, 1, 2, 3, 4, 5].map(c => frameAt(c, row + 4)),
        run:   [0, 1, 6, 3, 4, 7].map(c => frameAt(c, row + 4)),
    };
});

// ---- 場景層級 ----
const world = new Container();   // 地圖 / 裝飾 / 物品
const hud = new Container();     // 固定在畫面上的介面
app.stage.addChild(world, hud);

const emoji = (char, size) => {
    const t = new Text({ text: char, style: { fontSize: size } });
    t.anchor.set(0.5);
    return t;
};

// ---- 裝飾（樹木）----
const rand = (min, max) => min + Math.random() * (max - min);
for (let i = 0; i < 8; i++) {
    const tree = emoji('🌲', rand(34, 52));
    tree.position.set(rand(40, app.screen.width - 40), rand(60, app.screen.height - 40));
    world.addChild(tree);
}

// ---- 金幣 ----
const coin = emoji('🪙', 26);
function placeCoin() {
    coin.position.set(rand(50, app.screen.width - 50), rand(70, app.screen.height - 50));
}
placeCoin();
world.addChild(coin);

// ---- 主角 ----
const WALK_FPS = 0.13;           // AnimatedSprite 的速度（每 tick 前進的影格數）
const RUN_FPS = 0.2;
const player = new Container();
const shadow = new Graphics().ellipse(0, 50, 18, 6).fill({ color: 0x000000, alpha: 0.15 });
const hero = new AnimatedSprite(ANIMS.down.stand);
hero.anchor.set(0.5);
hero.scale.set(2);
hero.animationSpeed = WALK_FPS;
hero.play();
player.addChild(shadow, hero);
player.position.set(app.screen.width / 2, app.screen.height / 2);
world.addChild(player);

let facing = 'down';
let state = 'stand';
function setAnim(nextState, nextFacing) {
    if (nextState === state && nextFacing === facing) return;
    state = nextState;
    facing = nextFacing;
    hero.textures = ANIMS[facing][state];
    hero.animationSpeed = state === 'run' ? RUN_FPS : WALK_FPS;
    hero.play();
}

// ---- HUD：金幣數 ----
let gold = 0;
const goldText = new Text({
    text: '🪙 0',
    style: {
        fontFamily: 'Fredoka, "Noto Sans TC", sans-serif',
        fontSize: 20,
        fontWeight: '700',
        fill: cssVar('--ink') || '#2f3e60',
    },
});
goldText.position.set(16, 12);
hud.addChild(goldText);

// ---- 鍵盤 ----
const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
};
const keys = new Set();
window.addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); }
});
window.addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (k) keys.delete(k);
});

// ---- 主迴圈 ----
const WALK_SPEED = 3;
const RUN_SPEED = 5.5;
app.ticker.add(ticker => {
    const dt = ticker.deltaTime;
    let dx = 0, dy = 0;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; } // 斜向等速

    const running = keys.has('run');
    const speed = running ? RUN_SPEED : WALK_SPEED;
    player.x += dx * speed * dt;
    player.y += dy * speed * dt;

    // 動畫狀態：移動中依方向播 walk / run，停下播 stand
    if (dx || dy) {
        const dir = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
        setAnim(running ? 'run' : 'walk', dir);
    } else {
        setAnim('stand', facing);
    }

    // 限制在畫面內
    player.x = Math.min(Math.max(player.x, 32), app.screen.width - 32);
    player.y = Math.min(Math.max(player.y, 48), app.screen.height - 56);

    // 金幣旋轉 + 撿取判定
    coin.rotation += 0.03 * dt;
    const d = Math.hypot(player.x - coin.x, player.y - coin.y);
    if (d < 40) {
        gold++;
        goldText.text = `🪙 ${gold}`;
        placeCoin();
    }
});
