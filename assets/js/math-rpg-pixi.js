// ===================================================================
// 數學勇者 · Pixi 角色繪製層
// ===================================================================
// 這一層**只負責「畫」，不負責「動」**。
//
// 動作的唯一真相仍然是 CSS —— `.sprite` 上的 lunge/hurt/die/spawn 和
// `.sprite-body` 上的 breathe/floatIdle/heavyIdle 全部照舊在跑，
// 只是那兩個 DOM 元素被設成透明，改由這裡讀它們每一幀算好的
// transform / filter / opacity，在一張 Pixi canvas 上重畫出來。
//
// **為什麼不直接讓 Pixi 自己跑動畫？**
// 因為 math-rpg.js 有三個地方綁在 DOM 的角色元素上：
//   playSlash   量攻守雙方 sprite 的中心來算劍氣軌跡
//   showDamage  用 sprite 的 rect 定位浮動傷害數字
//   fxSpawn     把碎片/光環插進 #{side}-slot
// 保留 DOM 當位置來源，這三個一行都不用改，這一步就變成純加法、隨時可以撤。
// pages/math-rpg-pixi-spike.html 已經驗證過 Pixi ticker 能 1:1 重現那些動畫
// （四段動畫所有取樣點誤差 0.00px），等這一層穩定了再把動作也搬進來，
// 屆時只要換掉 readPose() 一個函式。
//
// **真正的收穫在 filter。** CSS 的 filter 只能做到 brightness/grayscale 這種等級，
// 搬進 Pixi 之後同一條路上還有溶解、色差、殘影、位移衝擊波 —— 那是 CSS 做不到的。
// 這一版先把受傷閃白與倒下灰階換成 ColorMatrixFilter，路就開了。

const MathRpgPixi = (() => {
    'use strict';

    // 一鍵關閉。載入失敗、或哪天發現在學校的機器上跑不動，
    // 把這個設成 false（或在網址加上 ?nopixi）就完全回到原本的 DOM 版本。
    let enabled = !new URLSearchParams(location.search).has('nopixi');

    let app = null;
    let ro = null;
    let ready = false;
    const sides = ['player', 'enemy'];
    const nodes = {};      // { player: {sprite, body, pixi, box, texKey}, enemy: {...} }
    const filterCache = new Map();

    // ---------------------------------------------------------------
    // CSS filter 字串 → ColorMatrixFilter
    // ---------------------------------------------------------------
    // 直接讀 getComputedStyle(body).filter 再翻譯，**不要在這裡重寫一份閃白邏輯**。
    // CSS 那邊改了時序或數值，這裡自動跟著走，兩份實作不會漂掉。
    //
    // 已知會用到的：
    //   .sprite.hurt .sprite-body  → brightness(2.8) saturate(0.1) contrast(1.3)
    //   .sprite.die  .sprite-body  → grayscale(0.75) brightness(0.85)
    const LUMA = [0.2126, 0.7152, 0.0722];

    function identityMatrix() {
        return [1,0,0,0,0,  0,1,0,0,0,  0,0,1,0,0,  0,0,0,1,0];
    }

    // 4x5 色彩矩陣相乘（b 套在 a 之後）
    function mulColor(a, b) {
        const out = new Array(20).fill(0);
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 5; c++) {
                let v = 0;
                for (let k = 0; k < 4; k++) v += b[r * 5 + k] * a[k * 5 + c];
                if (c === 4) v += b[r * 5 + 4];
                out[r * 5 + c] = v;
            }
        }
        return out;
    }

    function matBrightness(v) {
        return [v,0,0,0,0,  0,v,0,0,0,  0,0,v,0,0,  0,0,0,1,0];
    }
    function matSaturate(s) {
        const [lr, lg, lb] = LUMA;
        return [
            lr + s * (1 - lr), lg * (1 - s),      lb * (1 - s),      0, 0,
            lr * (1 - s),      lg + s * (1 - lg), lb * (1 - s),      0, 0,
            lr * (1 - s),      lg * (1 - s),      lb + s * (1 - lb), 0, 0,
            0, 0, 0, 1, 0
        ];
    }
    function matGrayscale(g) { return matSaturate(1 - g); }
    // contrast 是 out = (in - 0.5) * c + 0.5 —— **需要用到第 5 欄的偏移量**，
    // 只改係數做不出來。這是移植 CSS filter 最容易漏掉的一個。
    function matContrast(c) {
        const off = 0.5 * (1 - c);
        return [c,0,0,0,off,  0,c,0,0,off,  0,0,c,0,off,  0,0,0,1,0];
    }

    function filterFor(css) {
        if (!css || css === 'none') return null;
        if (filterCache.has(css)) return filterCache.get(css);

        let m = identityMatrix();
        let matched = false;
        const re = /(brightness|saturate|grayscale|contrast)\(([\d.]+)%?\)/g;
        let hit;
        while ((hit = re.exec(css)) !== null) {
            let v = parseFloat(hit[2]);
            if (hit[0].includes('%')) v /= 100;
            matched = true;
            if (hit[1] === 'brightness') m = mulColor(m, matBrightness(v));
            else if (hit[1] === 'saturate') m = mulColor(m, matSaturate(v));
            else if (hit[1] === 'grayscale') m = mulColor(m, matGrayscale(v));
            else if (hit[1] === 'contrast') m = mulColor(m, matContrast(v));
        }
        if (!matched) { filterCache.set(css, null); return null; }

        const f = new PIXI.ColorMatrixFilter();
        f.matrix = m;
        filterCache.set(css, f);
        return f;
    }

    // ---------------------------------------------------------------
    // 讀 CSS 算好的姿態
    // ---------------------------------------------------------------
    // `.sprite` 與 `.sprite-body` 的 transform-origin **都是 50% 100%**（底部中央），
    // 兩層是同一個原點，所以合成後的矩陣就是單純相乘、不必各自補原點位移。
    //
    // getComputedStyle().transform 回傳的矩陣**不含 transform-origin 的位移**
    // （瀏覽器是用 T(origin) · M · T(-origin) 套上去的），
    // 所以只要把 Pixi 的錨點放在那個原點上，直接套 M 就是對的。
    function domMatrix(cs) {
        const t = cs.transform;
        return (!t || t === 'none') ? new DOMMatrix() : new DOMMatrix(t);
    }

    function readPose(side) {
        const n = nodes[side];
        const csSprite = getComputedStyle(n.sprite);
        const csBody = getComputedStyle(n.body);
        const m = domMatrix(csSprite).multiply(domMatrix(csBody));
        return {
            m,
            alpha: parseFloat(csSprite.opacity || '1') * parseFloat(csBody.opacity || '1'),
            filterCss: csBody.filter
        };
    }

    // ---------------------------------------------------------------
    // 未經 transform 的版面盒（Pixi 錨點要放的位置）
    // ---------------------------------------------------------------
    // 兩種量法，精度差在**次像素**：
    //
    //  A) offsetLeft/offsetTop/offsetWidth 相加 —— 不受 transform 影響，隨時可量，
    //     但**全部回傳整數**。`.sprite` 的 left 是 calc(50% - 7*var(--u))、寬是 14u，
    //     都是小數，四捨五入之後整個角色會有固定約 0.5~0.7px 的偏移。
    //     實測是 x +0.5、y −0.65 的系統性偏差 —— 肉眼看不出來，
    //     但那是常數偏移，之後在觸控電視上放大就會跟著放大。
    //
    //  B) getBoundingClientRect —— 精確到次像素，但**動畫進行中量到的是被扭過的框**。
    //
    // 所以：優先用 B，只在 `.sprite` 自己沒有 transform 的時候量（待機時它確實是 none，
    // 因為 idle 動畫掛在 .sprite-body 上，不是 .sprite）；量不到就先用 A 頂著，
    // 等動作結束後的某一幀自動換成精確值。exact 這個旗標就是在記「有沒有換過」。
    function readBoxApprox(side) {
        const el = nodes[side].sprite;
        const stage = document.getElementById('battle-stage');
        let x = 0, y = 0, node = el;
        while (node && node !== stage) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
        return { x, y, w: el.offsetWidth, h: el.offsetHeight, exact: false };
    }

    function readBoxExact(side) {
        const el = nodes[side].sprite;
        const t = getComputedStyle(el).transform;
        if (t && t !== 'none') return null;          // 動畫中，量到的框不能用
        const s = document.getElementById('battle-stage').getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, exact: true };
    }

    function ensureBox(side) {
        const n = nodes[side];
        if (!n.box) n.box = readBoxExact(side) || readBoxApprox(side);
        else if (!n.box.exact) {
            const better = readBoxExact(side);
            if (better) { n.box = better; fitTexture(side); }
        }
        return n.box;
    }

    // ---------------------------------------------------------------
    // 貼圖
    // ---------------------------------------------------------------
    // 圖片路徑是 math-rpg.js 寫在 `--sprite` 這個 CSS 變數上的（applyLook / playAttackFrame）。
    // 讀 inline style 就好，不必動用 getComputedStyle —— 那兩個函式都是直接 setProperty。
    function currentTexKey(side) {
        const raw = nodes[side].sprite.style.getPropertyValue('--sprite');
        const m = raw && raw.match(/url\(["']?(.*?)["']?\)/);
        return m ? m[1] : null;
    }

    // ---------------------------------------------------------------
    // 每一幀
    // ---------------------------------------------------------------
    function frame() {
        const screen = document.getElementById('battle-screen');
        if (!screen || screen.classList.contains('hidden')) return;

        for (const side of sides) {
            const n = nodes[side];
            const key = currentTexKey(side);

            // 沒有圖（還在用 emoji）就讓 DOM 自己顯示，Pixi 這邊留空
            if (!key) {
                n.holder.visible = false;
                n.sprite.classList.remove('pixi-drawn');
                continue;
            }
            const tex = PIXI.Assets.get(key);
            if (!tex) { n.holder.visible = false; n.sprite.classList.remove('pixi-drawn'); continue; }

            if (n.texKey !== key) {
                n.texKey = key;
                n.pixi.texture = tex;
                fitTexture(side);
            }
            n.holder.visible = true;
            n.sprite.classList.add('pixi-drawn');   // 這個 class 才會把 DOM 的圖藏起來

            const box = ensureBox(side);
            const pose = readPose(side);

            // 錨點放在版面盒的底部中央 = CSS 的 transform-origin: 50% 100%。
            // ⚠️ setFromMatrix 會**整個覆寫**這個物件的 local transform ——
            // 所以貼圖的等比縮放不能放在同一層，否則每一幀都會被洗掉
            // （症狀：角色尺寸變成 CSS 矩陣裡的縮放值，例如 spawn 起始的 0.9）。
            // 這就是為什麼要分兩層：holder 吃 CSS 矩陣，裡面的 pixi 保留貼圖縮放。
            const ox = box.x + box.w / 2;
            const oy = box.y + box.h;
            const M = pose.m;
            n.holder.setFromMatrix(new PIXI.Matrix(
                M.a, M.b, M.c, M.d,
                ox + M.e, oy + M.f
            ));
            n.holder.alpha = pose.alpha;

            if (n.filterCss !== pose.filterCss) {
                n.filterCss = pose.filterCss;
                const f = filterFor(pose.filterCss);
                n.holder.filters = f ? [f] : null;
            }
        }
    }

    // 對齊 CSS 的 background-size: contain + center bottom：
    // 等比縮到剛好裝進版面盒，錨點在底部中央所以是「腳底貼齊」。
    // 這個縮放放在內層的 pixi 上，不能放 holder —— 見 frame() 裡的警告。
    function fitTexture(side) {
        const n = nodes[side];
        const box = ensureBox(side);
        const tex = n.pixi.texture;
        if (!tex || !tex.height || !tex.width) return;
        const s = Math.min(box.w / tex.width, box.h / tex.height);
        n.pixi.scale.set(s);
    }

    // canvas 尺寸與版面盒的快取都要跟著舞台走。
    // **不能只掛 window resize** —— init() 是在 preloadBattleAssets() 裡跑的，
    // 那時 #battle-screen 還是 hidden、舞台尺寸是 0，之後開打時視窗並沒有變動，
    // 只靠 window resize 永遠等不到那一次校正。ResizeObserver 兩種情況都涵蓋。
    let lastW = 0, lastH = 0;
    function resize() {
        if (!ready) return;
        const stage = document.getElementById('battle-stage');
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h || (w === lastW && h === lastH)) return;
        lastW = w; lastH = h;
        app.renderer.resize(w, h);
        for (const side of sides) { nodes[side].box = null; fitTexture(side); }
    }

    // ---------------------------------------------------------------
    // 啟動
    // ---------------------------------------------------------------
    async function init(imagePaths) {
        if (!enabled) return false;
        if (typeof PIXI === 'undefined') { enabled = false; return false; }

        const stage = document.getElementById('battle-stage');
        if (!stage) { enabled = false; return false; }

        app = new PIXI.Application();
        await app.init({
            width: stage.clientWidth || 800,
            height: stage.clientHeight || 300,
            backgroundAlpha: 0,          // 背景仍然是 DOM 的 .stage-bg
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        const canvas = app.canvas;
        canvas.className = 'pixi-chars';
        canvas.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;';

        // ⚠️ **一定要插在第一個 .fighter 之前，不能 appendChild。**
        // #battle-stage 裡的層級是：stage-bg(0) < fighter(1) < stage-flash(4) < stage-slash(5)。
        // `.fighter` 有 z-index:1 且 position:relative，**會建立堆疊環境** ——
        // 也就是說碎片特效 .fx(z-index:3) 是關在 fighter 裡面的，整組還是以 z=1 參與外層排序。
        // canvas 同樣是 z=1，同層時由 DOM 順序決定先後：appendChild 會讓它蓋過整個 fighter，
        // 碎片、光環、名字、血條全部跑到角色後面。插在 fighter 之前才維持原本的疊放：
        //   背景 → 角色(canvas) → 碎片/名字/血條 → 閃屏 → 劍氣
        const firstFighter = stage.querySelector('.fighter');
        if (firstFighter) stage.insertBefore(canvas, firstFighter);
        else stage.appendChild(canvas);

        await PIXI.Assets.load(imagePaths.filter(Boolean));

        for (const side of sides) {
            const sprite = document.getElementById(`${side}-sprite`);
            const body = sprite.querySelector('.sprite-body');
            // 兩層：holder 每幀被 setFromMatrix 覆寫（吃 CSS 的 transform），
            // 內層的 pixi 只放貼圖的等比縮放，才不會被一起洗掉。
            const holder = new PIXI.Container();
            holder.visible = false;
            const pixi = new PIXI.Sprite();
            pixi.anchor.set(0.5, 1);      // 底部中央，對齊 transform-origin: 50% 100%
            holder.addChild(pixi);
            app.stage.addChild(holder);
            nodes[side] = { sprite, body, holder, pixi, box: null, texKey: null, filterCss: null };
        }

        // UPDATE_PRIORITY.LOW：排在其他 ticker 之後跑，讀到的是這一幀最終的 CSS 狀態
        app.ticker.add(frame, null, PIXI.UPDATE_PRIORITY?.LOW ?? -25);

        stage.classList.add('pixi-active');
        ready = true;

        ro = new ResizeObserver(resize);
        ro.observe(stage);
        resize();          // 若舞台此刻已經有尺寸就先校一次
        return true;
    }

    function disable() {
        if (!ready) return;
        document.getElementById('battle-stage').classList.remove('pixi-active');
        for (const side of sides) nodes[side].sprite.classList.remove('pixi-drawn');
        app.ticker.remove(frame);
        if (ro) { ro.disconnect(); ro = null; }
        enabled = false;
        ready = false;
    }

    return {
        init,
        disable,
        isReady: () => ready,
        get app() { return app; },
        // 除錯用：在 console 打 MathRpgPixi.stats() 看有沒有正常在畫
        stats() {
            if (!ready) return { ready: false, enabled };
            return {
                ready, fps: +app.ticker.FPS.toFixed(1),
                renderer: app.renderer.name,
                sides: sides.map(s => ({
                    side: s, tex: nodes[s].texKey, visible: nodes[s].holder.visible,
                    x: Math.round(nodes[s].holder.x), y: Math.round(nodes[s].holder.y),
                    fit: +nodes[s].pixi.scale.x.toFixed(3),
                    filter: nodes[s].filterCss
                }))
            };
        }
    };
})();
