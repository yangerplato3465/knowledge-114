/* 字尾大分流 · 特效層（PixiJS）
   ------------------------------------------------------------------
   為什麼這裡才用 Pixi，別的地方不用？

   遊戲本體整個是文字 —— 英文單字、中文解釋、陣列內容。文字交給 DOM 畫，
   在 65 吋電視上是用螢幕原生解析度渲染，永遠銳利；改用 Canvas 畫文字反而
   是把字變成點陣圖再放大，會糊。所以本體堅持用 DOM + CSS。

   但「答對瞬間噴 160 片彩帶」這件事 DOM 做不好 —— 那是 160 個節點在跑
   transform，低階教室電腦會掉幀。這正是 Pixi 的守備範圍，所以只有這一層
   用它。

   代價要說清楚：本地那份 pixi.min.js 是 818 KB 完整包（沒有 Node.js 可以
   自己 build 瘦身版）。這對一個彩帶效果來說不便宜。所以這一層設計成
   **完全可拆**：word-sort.html 裡把 pixi 跟本檔兩行 script 刪掉，
   遊戲照常運作，只是沒有彩帶。本檔所有方法在 PIXI 不存在時都是空操作。

   對外介面只有三個：
     WordSortFX.warm()             預先初始化（選好題庫時呼叫，避免第一次答對才卡）
     WordSortFX.burst(x, y, opts)  在畫面座標噴一次粒子
     WordSortFX.clear()            清空所有粒子
   ------------------------------------------------------------------ */

window.WordSortFX = (function () {
    'use strict';

    var GRAVITY = 0.28;       /* 每幀往下加多少速度 */
    var DRAG = 0.992;         /* 空氣阻力，讓彩帶飄起來比較自然 */
    var LIFE = 90;            /* 粒子壽命（幀） */
    var MAX_PARTICLES = 900;  /* 上限，連續答對也不會無限累積 */

    var app = null;
    var container = null;
    var texture = null;
    var particles = [];       /* 每個元素 { p: PIXI.Particle, vx, vy, vr, life } */
    var initPromise = null;
    var available = typeof window.PIXI !== 'undefined';

    if (!available) {
        console.info('[word-sort] 找不到 PIXI，特效層停用（遊戲不受影響）');
    }

    /* 產生一張小方塊貼圖當彩帶。用 1x1 的白色貼圖拉伸也可以，
       但獨立畫一張圓角的看起來比較不像色塊。 */
    function makeTexture() {
        var c = document.createElement('canvas');
        c.width = 12;
        c.height = 18;
        var g = c.getContext('2d');
        g.fillStyle = '#ffffff';
        g.beginPath();
        if (g.roundRect) {
            g.roundRect(0, 0, 12, 18, 3);
        } else {
            g.rect(0, 0, 12, 18);
        }
        g.fill();
        return PIXI.Texture.from(c);
    }

    function init() {
        if (initPromise) return initPromise;
        if (!available) return Promise.resolve(false);

        initPromise = (function () {
            var canvas = document.getElementById('fx');
            if (!canvas) return Promise.resolve(false);

            app = new PIXI.Application();
            return app.init({
                canvas: canvas,
                resizeTo: window,
                backgroundAlpha: 0,          /* 透明，蓋在 DOM 上面 */
                antialias: true,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1
            }).then(function () {
                texture = makeTexture();

                /* ParticleContainer 才有辦法一次畫幾百片而不掉幀。
                   會逐幀變動的屬性要明講，沒宣告的 Pixi 會當成靜態的不更新。 */
                container = new PIXI.ParticleContainer({
                    dynamicProperties: {
                        position: true,
                        rotation: true,
                        scale: false,
                        color: true          /* tint 與 alpha 都算在 color 裡 */
                    }
                });
                app.stage.addChild(container);
                app.ticker.add(step);

                /* Pixi Devtools 的標準勾子。專案裡 detective.js 也掛同一個，
                   有了它才能從 console 檢查粒子狀態、手動推 ticker 驗動畫。 */
                globalThis.__PIXI_APP__ = app;
                return true;
            }).catch(function (err) {
                console.warn('[word-sort] Pixi 初始化失敗，特效層停用', err);
                available = false;
                return false;
            });
        })();

        return initPromise;
    }

    function step() {
        for (var i = particles.length - 1; i >= 0; i--) {
            var it = particles[i];
            var p = it.p;

            it.vy += GRAVITY;
            it.vx *= DRAG;
            p.x += it.vx;
            p.y += it.vy;
            p.rotation += it.vr;

            it.life--;
            /* 最後三分之一才開始淡出，前面維持不透明比較鮮明 */
            if (it.life < LIFE * 0.35) {
                p.alpha = Math.max(0, it.life / (LIFE * 0.35));
            }

            if (it.life <= 0 || p.y > app.screen.height + 60) {
                container.removeParticle(p);
                particles.splice(i, 1);
            }
        }
    }

    function spawn(x, y, opts) {
        var count = opts.count || 120;
        var colors = opts.colors || [0xd98026, 0x3f7fb5, 0x2e8b5e, 0xe8c34a];
        var spread = opts.spread || Math.PI * 2;
        var baseAngle = (typeof opts.angle === 'number') ? opts.angle : -Math.PI / 2;
        var power = opts.power || 13;

        for (var i = 0; i < count; i++) {
            if (particles.length >= MAX_PARTICLES) break;

            var a = baseAngle + (Math.random() - 0.5) * spread;
            var s = power * (0.35 + Math.random() * 0.85);

            var p = new PIXI.Particle({
                texture: texture,
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                anchorX: 0.5,
                anchorY: 0.5,
                scaleX: 0.5 + Math.random() * 0.75,
                scaleY: 0.5 + Math.random() * 0.75,
                rotation: Math.random() * Math.PI * 2,
                tint: colors[(Math.random() * colors.length) | 0]
            });

            container.addParticle(p);
            particles.push({
                p: p,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                vr: (Math.random() - 0.5) * 0.34,
                life: LIFE * (0.7 + Math.random() * 0.5)
            });
        }
    }

    return {
        /* 選好題庫時先呼叫，把 818 KB 的初始化成本挪到還沒開始計時的時候 */
        warm: function () {
            return init();
        },

        /* x, y 是 CSS 像素的畫面座標（跟 getBoundingClientRect 同一個座標系） */
        burst: function (x, y, opts) {
            if (!available) return;
            init().then(function (ok) {
                if (ok) spawn(x, y, opts || {});
            });
        },

        clear: function () {
            if (!container) return;
            for (var i = 0; i < particles.length; i++) {
                container.removeParticle(particles[i].p);
            }
            particles.length = 0;
        }
    };
})();
