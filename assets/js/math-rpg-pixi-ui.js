// ===================================================================
// 數學勇者 · Pixi 介面特效層
// ===================================================================
// 跟 math-rpg-pixi.js 分開，是因為**畫布蓋的範圍不一樣**。
//
//   math-rpg-pixi.js  → canvas 在 #battle-stage 裡，被它的 overflow:hidden 夾住。
//                       角色、粒子、背景本來就該被夾在舞台裡，沒問題。
//   這一支            → canvas 蓋整張 .game-card，z-index 65。
//                       傷害數字要飄到角色頭頂上方、彩帶要蓋過結算畫面、
//                       地圖節點在舞台外面 —— 這三件事在舞台那張 canvas 上會被裁掉。
//
// z-index 65 的位置是算過的：
//   .upgrade-overlay 50 < 這一層 65 < .fs-btn 70
// 所以它蓋得過強化面板與結算畫面，但不會擋住右上角的全螢幕按鈕。
// canvas 本身 pointer-events:none，完全不吃點擊。
//
// 對應 docs/math-rpg-pixi.md 的 #13 傷害數字、#15 地圖節點、#18 勝利彩帶。

const MathRpgPixiUI = (() => {
    'use strict';

    let enabled = !new URLSearchParams(location.search).has('nopixi');
    let app = null, ready = false, ro = null;
    let dmgLayer = null, mapLayer = null, confettiLayer = null;
    let dotTex = null, rectTex = null;

    // ---------------------------------------------------------------
    // 貼圖（跟戰鬥層一樣在執行期用 canvas 2D 畫，不另外進素材）
    // ---------------------------------------------------------------
    function makeDot() {
        const S = 64, c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.fillRect(0, 0, S, S);
        return PIXI.Texture.from(c);
    }
    // 彩帶是紙片不是光點，要硬邊的長方形。用柔邊光點拉長會變成光束，讀起來完全不一樣。
    function makeRect() {
        const W = 8, H = 14, c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        return PIXI.Texture.from(c);
    }

    // ===============================================================
    // #13 傷害數字
    // ===============================================================
    // **這裡用 Text 不是 BitmapText**，跟 docs 當初的規劃不同，理由：
    //   BitmapText 的優勢在「每幀改字」與「上千個實例」——
    //   我們同時最多三個短命標籤，完全吃不到那個好處。
    //   代價卻很實在：字形要事先宣告，而畫面上會出現中文（擋下！／狂暴！／護盾 +1），
    //   還得等 Google Fonts 的 Fredoka / Noto Sans TC 載完才能建字圖。
    //   Text 直接吃 DOM 的字型堆疊，那個問題整個消失。
    //
    // 比 DOM 版多出來的東西：進場有超越再回彈的縮放、上升帶一點側向弧線、
    // 爆擊會多一圈殘影 —— 這些在 DOM 版是靠一條 CSS keyframe，改起來很受限。
    const labels = [];
    const DMG_STYLE_CACHE = new Map();

    function styleFor(color, crit) {
        const key = color + '|' + crit;
        if (DMG_STYLE_CACHE.has(key)) return DMG_STYLE_CACHE.get(key);
        const u = unitPx();
        const s = new PIXI.TextStyle({
            fontFamily: ['Fredoka', 'Noto Sans TC', 'system-ui', 'sans-serif'],
            fontSize: (crit ? 2.6 : 1.9) * u,
            fontWeight: '700',
            fill: color,
            stroke: { color: '#1a1a2e', width: Math.max(2, 0.16 * u), join: 'round' },
            dropShadow: { color: '#000000', alpha: 0.45, blur: 3, distance: 2, angle: Math.PI / 2 }
        });
        DMG_STYLE_CACHE.set(key, s);
        return s;
    }

    function unitPx() {
        const probe = document.getElementById('u-probe');
        if (probe) { const v = probe.getBoundingClientRect().width; if (v) return v; }
        return 16;
    }

    function showDamage(side, text, color, crit) {
        if (!ready) return false;
        const target = document.getElementById(`${side}-sprite`);
        const card = document.querySelector('.game-card');
        if (!target || !card) return false;
        const r = target.getBoundingClientRect(), c = card.getBoundingClientRect();

        const t = new PIXI.Text({ text: String(text), style: styleFor(color, crit) });
        t.anchor.set(0.5, 1);
        t.x = r.left + r.width / 2 - c.left;
        t.y = r.top - c.top + r.height * 0.18;
        t.scale.set(0.2);
        dmgLayer.addChild(t);

        labels.push({
            t, life: 1.5, max: 1.5,
            vx: (Math.random() - 0.5) * 26,
            vy: -(crit ? 78 : 62),
            crit
        });

        // 爆擊多一圈往外擴的殘影，讓「這下不一樣」在數字本身就讀得出來
        if (crit) {
            const ghost = new PIXI.Text({ text: String(text), style: styleFor(color, true) });
            ghost.anchor.set(0.5, 1);
            ghost.x = t.x; ghost.y = t.y;
            ghost.alpha = 0.55;
            ghost.blendMode = 'add';
            dmgLayer.addChild(ghost);
            labels.push({ t: ghost, life: 0.42, max: 0.42, vx: 0, vy: -30, ghost: true });
        }
        return true;
    }

    function updateLabels(dt) {
        for (let i = labels.length - 1; i >= 0; i--) {
            const L = labels[i];
            L.life -= dt;
            if (L.life <= 0) { L.t.destroy(); labels.splice(i, 1); continue; }
            const p = 1 - L.life / L.max;          // 0→1
            L.t.x += L.vx * dt;
            L.t.y += L.vy * dt;
            L.vy += 52 * dt;                        // 慢慢被拉回來，像被拋上去的
            if (L.ghost) {
                L.t.scale.set(1 + p * 1.5);
                L.t.alpha = 0.55 * (1 - p);
            } else {
                // 進場超越再回彈：0.2 →(20%) 1.25 → 1.0
                const s = p < 0.2 ? 0.2 + (1.25 - 0.2) * (p / 0.2)
                        : p < 0.35 ? 1.25 - 0.25 * ((p - 0.2) / 0.15)
                        : 1;
                L.t.scale.set(s);
                L.t.alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
            }
        }
    }

    // ===============================================================
    // #15 地圖節點
    // ===============================================================
    // 打倒敵人時節點爆開，通往下一關的連線有光點流過去。
    // 座標每次現場量 DOM —— 地圖是 flex 排版，節點位置隨視窗寬度變，寫死一定會歪。
    const mapFx = [];
    function mapDefeat(index) {
        if (!ready) return;
        const card = document.querySelector('.game-card');
        const node = document.querySelector(`.map-node[data-i="${index}"]`);
        if (!card || !node) return;
        const c = card.getBoundingClientRect(), r = node.getBoundingClientRect();
        const cx = r.left + r.width / 2 - c.left, cy = r.top + r.height / 2 - c.top;
        const u = unitPx();

        // 節點爆開
        for (let i = 0; i < 34; i++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = (2 + Math.random() * 6) * u;
            const s = new PIXI.Sprite(dotTex);
            s.anchor.set(0.5); s.position.set(cx, cy);
            s.tint = [0xffd54f, 0xffffff, 0xffa726][i % 3];
            s.blendMode = 'add';
            const size = (0.14 + Math.random() * 0.3) * u;
            s.scale.set(size / 64);
            mapLayer.addChild(s);
            mapFx.push({ s, life: 0.6, max: 0.6, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, grav: 18 * u, size });
        }
        // 擴散光環
        const ring = new PIXI.Sprite(dotTex);
        ring.anchor.set(0.5); ring.position.set(cx, cy);
        ring.tint = 0xffe082; ring.blendMode = 'add';
        ring.scale.set(0.2);
        mapLayer.addChild(ring);
        mapFx.push({ s: ring, life: 0.5, max: 0.5, vx: 0, vy: 0, grav: 0, ring: true });

        // 連線流光：往下一個節點灑光點
        const line = document.querySelector(`.map-line[data-i="${index + 1}"]`);
        if (line) {
            const lr = line.getBoundingClientRect();
            const x0 = lr.left - c.left, y0 = lr.top + lr.height / 2 - c.top, w = lr.width;
            for (let i = 0; i < 16; i++) {
                const s = new PIXI.Sprite(dotTex);
                s.anchor.set(0.5); s.position.set(x0, y0);
                s.tint = 0xfff59d; s.blendMode = 'add';
                const size = (0.16 + Math.random() * 0.2) * u;
                s.scale.set(size / 64);
                mapLayer.addChild(s);
                mapFx.push({ s, life: 0.7, max: 0.7, flow: { x0, y0, w, delay: i * 0.022 }, size });
            }
        }
    }

    function updateMapFx(dt) {
        for (let i = mapFx.length - 1; i >= 0; i--) {
            const f = mapFx[i];
            f.life -= dt;
            if (f.life <= 0) { f.s.destroy(); mapFx.splice(i, 1); continue; }
            const p = 1 - f.life / f.max;
            if (f.ring) {
                f.s.scale.set(0.2 + p * 2.4);
                f.s.alpha = 1 - p;
            } else if (f.flow) {
                const q = Math.max(0, Math.min(1, (p - f.flow.delay) / (1 - f.flow.delay)));
                f.s.x = f.flow.x0 + f.flow.w * q;
                f.s.y = f.flow.y0 + Math.sin(q * Math.PI) * 3;
                f.s.alpha = q <= 0 ? 0 : Math.sin(q * Math.PI);
            } else {
                f.vy += f.grav * dt;
                f.s.x += f.vx * dt; f.s.y += f.vy * dt;
                f.s.alpha = 1 - p * p;
                f.s.scale.set(f.size * (1 - p * 0.6) / 64);
            }
        }
    }

    // ===============================================================
    // #18 勝利彩帶
    // ===============================================================
    // 舊版是 70 顆 DOM span。這裡 2000 顆，帶重力、翻轉、側飄。
    // 用 ParticleContainer，所以 2000 顆是一次 draw call。
    //
    // 翻轉不是靠 rotation —— 紙片在空中翻面看到的是**寬度變窄再變寬**，
    // 所以是 scaleX 隨相位振盪。只轉 rotation 會像小風車，不像紙屑。
    const CONFETTI_MAX = 2000;
    let confettiPC = null;
    const confetti = [];

    function initConfetti() {
        const card = document.querySelector('.game-card');
        confettiPC = new PIXI.ParticleContainer({
            texture: rectTex,
            boundsArea: new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height),
            dynamicProperties: { vertex: true, position: true, rotation: true, uvs: false, color: true }
        });
        for (let i = 0; i < CONFETTI_MAX; i++) {
            const p = new PIXI.Particle({ texture: rectTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
            confettiPC.addParticle(p);
            confetti.push({ p, life: 0, max: 1, vx: 0, vy: 0, spin: 0, flip: 0, phase: 0, sx: 1 });
        }
        confettiLayer.addChild(confettiPC);
    }

    const CONFETTI_COLORS_HEX = [0xffd54f, 0xef5350, 0x66bb6a, 0x42a5f5, 0xab47bc, 0xff8a65, 0xffffff];

    function confettiBurst(count = CONFETTI_MAX) {
        if (!ready) return false;
        const W = app.screen.width, H = app.screen.height;
        let n = 0;
        for (const c of confetti) {
            if (n >= count) break;
            if (c.life > 0) continue;
            n++;
            const p = c.p;
            p.x = Math.random() * W;
            p.y = -20 - Math.random() * H * 0.7;      // 從畫面上方外面陸續落下
            p.tint = CONFETTI_COLORS_HEX[(Math.random() * CONFETTI_COLORS_HEX.length) | 0];
            p.rotation = Math.random() * Math.PI * 2;
            p.alpha = 1;
            const sc = 0.7 + Math.random() * 0.9;
            p.scaleX = sc; p.scaleY = sc;
            c.sx = sc;
            c.life = c.max = 2.6 + Math.random() * 2.2;
            c.vx = (Math.random() - 0.5) * 90;
            c.vy = 90 + Math.random() * 150;
            c.spin = (Math.random() - 0.5) * 7;
            c.flip = 3 + Math.random() * 7;
            c.phase = Math.random() * Math.PI * 2;
        }
        return true;
    }

    function updateConfetti(dt) {
        const H = app.screen.height;
        for (const c of confetti) {
            if (c.life <= 0) continue;
            c.life -= dt;
            if (c.life <= 0) { c.p.alpha = 0; c.life = 0; continue; }
            c.phase += c.flip * dt;
            c.p.x += (c.vx + Math.cos(c.phase * 0.6) * 26) * dt;
            c.p.y += c.vy * dt;
            c.vy += 120 * dt;                       // 重力
            c.p.rotation += c.spin * dt;
            c.p.scaleX = c.sx * Math.cos(c.phase);  // 翻面：寬度振盪
            const t = 1 - c.life / c.max;
            c.p.alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
            if (c.p.y > H + 30) { c.life = 0; c.p.alpha = 0; }
        }
    }

    // ===============================================================
    // 生命週期
    // ===============================================================
    let lastW = 0, lastH = 0;
    function resize() {
        if (!ready) return;
        const card = document.querySelector('.game-card');
        if (!card) return;
        const w = card.clientWidth, h = card.clientHeight;
        if (!w || !h || (w === lastW && h === lastH)) return;
        lastW = w; lastH = h;
        app.renderer.resize(w, h);
        if (confettiPC) confettiPC.boundsArea = new PIXI.Rectangle(0, 0, w, h);
        DMG_STYLE_CACHE.clear();      // 字級是跟著 --u 算的，版面變了要重算
    }

    function frame(ticker) {
        resize();
        const dt = Math.min(0.05, (ticker && ticker.deltaMS != null ? ticker.deltaMS : 16.7) / 1000);
        updateLabels(dt);
        updateMapFx(dt);
        updateConfetti(dt);
    }

    async function init() {
        if (!enabled || typeof PIXI === 'undefined') return false;
        const card = document.querySelector('.game-card');
        if (!card) return false;

        app = new PIXI.Application();
        await app.init({
            width: card.clientWidth || 900,
            height: card.clientHeight || 600,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            preference: 'webgl'
        });

        const canvas = app.canvas;
        canvas.className = 'pixi-ui';
        // 65：蓋得過強化面板(50)與結算畫面，但在全螢幕按鈕(70)之下
        canvas.style.cssText = 'position:absolute;inset:0;z-index:65;pointer-events:none;';
        card.appendChild(canvas);

        dotTex = makeDot();
        rectTex = makeRect();

        dmgLayer = new PIXI.Container();
        mapLayer = new PIXI.Container();
        confettiLayer = new PIXI.Container();
        app.stage.addChild(mapLayer, confettiLayer, dmgLayer);
        initConfetti();

        app.ticker.add(frame, null, PIXI.UPDATE_PRIORITY?.LOW ?? -25);
        ready = true;
        ro = new ResizeObserver(resize);
        ro.observe(card);
        resize();
        return true;
    }

    return {
        init,
        isReady: () => ready,
        showDamage,
        mapDefeat,
        confettiBurst,
        get app() { return app; },
        stats() {
            if (!ready) return { ready: false, enabled };
            return {
                ready, fps: +app.ticker.FPS.toFixed(1),
                canvas: [app.screen.width, app.screen.height],
                傷害標籤: labels.length,
                地圖特效: mapFx.length,
                彩帶: confetti.filter(c => c.life > 0).length
            };
        }
    };
})();
