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
    let fxBack = null, fxFront = null, chars = null, shatter = null;
    let bgLayer = null, ambientBack = null, ambientFront = null, shadowLayer = null, chargeLayer = null;
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
    function frame(ticker) {
        const screen = document.getElementById('battle-screen');
        if (!screen || screen.classList.contains('hidden')) return;

        // deltaMS 上限鎖 50ms：分頁切回前景時 deltaMS 可能是好幾秒，
        // 粒子會瞬間被積分到畫面外，看起來像特效整個消失。
        const dt = Math.min(0.05, (ticker && ticker.deltaMS != null ? ticker.deltaMS : 16.7) / 1000);

        // 每幀確認 canvas 的內部解析度還跟舞台一致。
        // **不能只靠 ResizeObserver。** init() 是在 preloadBattleAssets() 裡跑的，
        // 那時 #battle-screen 還 hidden、舞台量到 0 —— renderer 會停在 init 的備援值
        // 800x300，之後整張畫面被 CSS 拉伸到舞台寬度，角色與粒子全部變形。
        // 而 ResizeObserver 在分頁隱藏時不保證派送，光靠它有時序缺口。
        // 這裡只是兩個整數比較（resize 自己有 lastW/lastH 擋著），比賭 observer 準時可靠得多。
        resize();

        // **一定要排在角色迴圈之前。** 它會設 n.shattered，而下面就要用那個旗標決定
        // 本體要不要顯示。放在後面的話，怪物碎裂／復原都會慢一幀才反映出來。
        watchClasses();

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
            // 碎裂中的角色本體要藏起來，讓碎片接手（見 shatterFx）
            n.holder.visible = !n.shattered;
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

            // 打倒定格的白剪影要**蓋過** CSS 算出來的濾鏡。
            // watchClasses 在這個迴圈之前跑，若直接在那裡設 holder.filters，
            // 同一幀就會被下面這段用 die 的 grayscale 覆寫掉 —— 所以改成用旗標在這裡優先。
            const white = n.whiteUntil && performance.now() < n.whiteUntil;
            const wantCss = white ? '__white__' : pose.filterCss;
            if (n.filterCss !== wantCss) {
                n.filterCss = wantCss;
                const f = white ? whiteFilter : filterFor(pose.filterCss);
                n.holder.filters = f ? [f] : null;
            }
        }

        updateFx(dt);
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

    // ===============================================================
    // 粒子系統
    // ===============================================================
    // ParticleContainer 有一個硬限制：**一個容器裡的所有粒子必須共用同一張底圖。**
    // 與其做 texture atlas 再切 uvs，這裡選擇「只用一張柔邊光點」，
    // 靠 tint / 縮放 / 拉長 去變出火花、碎屑、血花、拖尾。
    // 拉長的光點看起來就是條狀火花，一張圖夠用，而且全部合成一次 draw call。
    //
    // 另一個坑：**容器一定要設 boundsArea**，否則 bounds 回報 0 會被 culling 當成不可見。
    //
    // 粒子**預先配置、永不新增刪除**：死掉的就 alpha=0 收回池子。
    // ParticleContainer 增刪要重建 GPU buffer，每次命中噴 300 顆再刪掉會一直抖。
    const MAX_PARTICLES = 500;          // 每層
    let dotTexture = null;
    const layersP = {};                  // { back: {pc, items}, front: {...} }

    // 柔邊光點：用 canvas 2D 畫一個徑向漸層。
    // 不用 Graphics 畫圓 —— 硬邊的圓點疊起來會有明顯的邊界線，柔邊才會在重疊處自然爆白。
    function makeDotTexture() {
        const S = 64;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
        grad.addColorStop(0.0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
        grad.addColorStop(1.0, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, S, S);
        return PIXI.Texture.from(c);
    }

    function initParticles() {
        dotTexture = makeDotTexture();
        const area = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
        for (const key of ['back', 'front']) {
            const pc = new PIXI.ParticleContainer({
                texture: dotTexture,
                boundsArea: area.clone(),
                // 只開真的會逐幀變的：位置、旋轉、顏色(tint+alpha)、頂點(縮放)。
                // vertex 是縮放要用的 —— 縮放會改到四個角的座標，不是獨立的旗標。
                dynamicProperties: { vertex: true, position: true, rotation: true, uvs: false, color: true }
            });
            pc.blendMode = 'add';       // 加亮：重疊處自然爆白，這是打擊感的來源
            const items = [];
            for (let i = 0; i < MAX_PARTICLES; i++) {
                const p = new PIXI.Particle({ texture: dotTexture, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
                pc.addParticle(p);
                items.push({ p, life: 0, max: 1, vx: 0, vy: 0, grav: 0, drag: 1, spin: 0, s0: 1, s1: 0, stretch: 1 });
            }
            (key === 'back' ? fxBack : fxFront).addChild(pc);
            layersP[key] = { pc, items, cursor: 0 };
        }
    }

    // 取一個空閒粒子。全滿就搶最舊的那一個 —— 寧可蓋掉一顆快消失的，
    // 也不要讓新的一次命中完全沒有反饋。
    function grab(layer) {
        const L = layersP[layer];
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const idx = (L.cursor + i) % MAX_PARTICLES;
            if (L.items[idx].life <= 0) { L.cursor = (idx + 1) % MAX_PARTICLES; return L.items[idx]; }
        }
        L.cursor = (L.cursor + 1) % MAX_PARTICLES;
        return L.items[L.cursor];
    }

    function emit(layer, o) {
        const it = grab(layer);
        const p = it.p;
        p.x = o.x; p.y = o.y;
        p.tint = o.tint;
        p.alpha = o.alpha != null ? o.alpha : 1;
        p.rotation = o.rotation || 0;
        it.life = it.max = o.life;
        it.vx = o.vx; it.vy = o.vy;
        it.grav = o.grav || 0;
        it.drag = o.drag != null ? o.drag : 1;
        it.spin = o.spin || 0;
        it.s0 = o.size; it.s1 = o.size1 != null ? o.size1 : 0;
        it.stretch = o.stretch || 1;
        const k = it.s0 / 64;
        p.scaleX = k * it.stretch; p.scaleY = k;
        return it;
    }

    function updateParticles(dt) {
        for (const key of ['back', 'front']) {
            const L = layersP[key];
            for (const it of L.items) {
                if (it.life <= 0) continue;
                it.life -= dt;
                if (it.life <= 0) { it.p.alpha = 0; it.life = 0; continue; }
                const t = 1 - it.life / it.max;          // 0→1 的壽命進度
                it.vx *= Math.pow(it.drag, dt * 60);
                it.vy = it.vy * Math.pow(it.drag, dt * 60) + it.grav * dt;
                it.p.x += it.vx * dt;
                it.p.y += it.vy * dt;
                it.p.rotation += it.spin * dt;
                it.p.alpha = 1 - t * t;                  // 尾段才快速淡出，前段維持亮度
                const size = it.s0 + (it.s1 - it.s0) * t;
                const k = size / 64;
                it.p.scaleX = k * it.stretch; it.p.scaleY = k;
            }
        }
    }

    // ===============================================================
    // 著色器：衝擊波位移 與 爆擊色差
    // ===============================================================
    // 兩個都掛在 app.stage 上、配 filterArea = 整個畫面，
    // 這樣 vTextureCoord 的 0~1 就直接對應整張 canvas，不必去換算容器 bounds 的座標系。
    //
    // ⚠️ **背景不會被扭曲。** .stage-bg 還是 DOM 的 background-image，不在這張 canvas 裡，
    // 所以衝擊波推得動角色與粒子、推不動背景。要做到「整個畫面被推開」，
    // 得先把場景背景也搬進 Pixi（見 docs/math-rpg-pixi.md 第 9 項），那是另一步。
    let shockFilter = null, aberrFilter = null;
    let shockT = -1, aberrT = -1;
    const SHOCK_DUR = 0.38, ABERR_DUR = 0.26;

    // ===============================================================
    // #19 失敗：灰階漸染
    // ===============================================================
    // 以勇者為圓心往外擴的灰階波，把整個戰鬥區「褪色」。
    // **CSS 的 filter: grayscale() 只能整片一起變**，做不出這種由一點蔓延開的感覺 ——
    // 這就是把場景搬進 canvas 才換得到的東西。
    //
    // 時機：勇者拿到 .die 的那一刻（watchClasses 偵測）。
    // damagePlayer 排的是 die 在 +320ms、endGame 在 +1150ms，中間有 830ms 可以演，
    // 剛好蓋住整個過場，不必去改任何既有的計時。
    let grayFilter = null, grayT = -1;
    const GRAY_DUR = 0.85;

    function initGrayFilter() {
        grayFilter = PIXI.Filter.from({
            gl: { vertex: PIXI.defaultFilterVert, fragment: `
                in vec2 vTextureCoord;
                out vec4 finalColor;
                uniform sampler2D uTexture;
                uniform vec2 uCenter;
                uniform float uRadius;
                uniform float uAspect;
                void main() {
                    vec4 c = texture(uTexture, vTextureCoord);
                    vec2 d = vTextureCoord - uCenter;
                    d.x *= uAspect;
                    // 波前給一段柔邊，邊界才不會是一條生硬的圓線
                    float k = smoothstep(uRadius, uRadius - 0.28, length(d));
                    float g = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                    // 除了去彩度，也壓暗一點 —— 只有灰階看起來像壞掉，不像「結束了」
                    vec3 grey = vec3(g) * 0.72;
                    finalColor = vec4(mix(c.rgb, grey, k), c.a);
                }` },
            resources: { grayUniforms: {
                uCenter: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
                uRadius: { value: 0, type: 'f32' },
                uAspect: { value: 1, type: 'f32' }
            } }
        });
    }

    function grayWash(side) {
        if (!grayFilter) return;
        const c = centerOf(side);
        const gu = grayFilter.resources.grayUniforms.uniforms;
        gu.uCenter[0] = c.x / app.screen.width;
        gu.uCenter[1] = c.y / app.screen.height;
        gu.uAspect = app.screen.width / app.screen.height;
        grayT = 0;
        syncStageFilters();
    }

    // ===============================================================
    // 勇者倒下：慢動作 ＋ 塵土
    // ===============================================================
    // 碎裂留給怪物。勇者是孩子的化身，碎成 36 片太狠，而且「消失」的意味也不對 ——
    // 遊戲的用字本來就是「勇者倒下了…」，不是死亡。
    // 這裡走寫實路線：倒地那一下時間拉慢，腳邊揚起塵土與小石子，有重量、不帶消失感。
    //
    // ⚠️ **慢動作的時間預算是算過的，不能隨便調慢。**
    // damagePlayer 排的是 `.die` 在 +320ms、`endGame` 在 +1150ms —— 中間只有 830ms。
    // die 動畫本身 850ms，拖慢之後若超過那個窗口，勇者還在半空中結算畫面就蓋上來了。
    //   前 SLOWMO_MS 用 SLOWMO_RATE 倍速，之後恢復 1.0：
    //     300ms x 0.45 = 135ms 的動畫進度
    //     剩下 850 - 135 = 715ms 用正常速度跑完
    //     總計 300 + 715 = 1015ms
    // 比 1150ms 少 135ms。**改這兩個數字要重算這條式子。**
    //
    // 第一版設 350ms，算出來是 1043ms、只剩 107ms 餘裕，實測（含量測本身的開銷）
    // 逼到 1.13s，離上限只剩 20ms —— 低階機器掉幾幀就會被結算畫面切斷。
    // 縮到 300ms，視覺上分不出差別，但餘裕多了一倍。
    const SLOWMO_MS = 300;
    const SLOWMO_RATE = 0.45;
    let slowmoActive = false, slowmoTimer = null;
    let fallAnim = null, dustDone = false;

    function heroFallFx(side) {
        const n = nodes[side];
        if (!n.box) return;

        // --- 慢動作 ---
        // CSS 動畫用 playbackRate、Pixi 用 ticker.speed，**兩邊都要放慢** ——
        // 只慢一邊的話會變成角色慢慢倒下、塵土卻用正常速度飛走，直接穿幫。
        fallAnim = n.sprite.getAnimations().find(a => a.animationName === 'die') || null;
        if (fallAnim) { try { fallAnim.playbackRate = SLOWMO_RATE; } catch (e) {} }
        slowmoActive = true;
        app.ticker.speed = SLOWMO_RATE;
        dustDone = false;

        clearTimeout(slowmoTimer);
        slowmoTimer = setTimeout(() => {
            slowmoActive = false;
            slowmoTimer = null;
            if (fallAnim) { try { fallAnim.playbackRate = 1; } catch (e) {} }
            // 頓幀可能同時把 speed 壓成 0，那時別搶著改回來，交給 releaseHitstop
            if (app.ticker.speed !== 0) app.ticker.speed = 1;
        }, SLOWMO_MS);

        // 踉蹌的那一下先蹭起一小撮土
        dustPuff(n.holder.x, n.box.y + n.box.h, 12, 0.6);
    }

    // 塵土。**必須用 normal 混合，不能加亮** —— 加亮的土會發光，
    // 看起來像火花不像灰，整個「有重量」的意圖就沒了。
    // fxBack / fxFront 那兩個容器是 add，所以這裡另外開一個。
    let dustPC = null;
    const DUST_MAX = 140;
    const dustItems = [];
    let dustCursor = 0;
    const DUST_TINTS = [0xbfae94, 0xa8967c, 0xd6c9b0, 0x8d7f68];

    function initDust() {
        dustPC = new PIXI.ParticleContainer({
            texture: dotTexture,
            boundsArea: new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height),
            dynamicProperties: { vertex: true, position: true, rotation: true, uvs: false, color: true }
        });
        dustPC.blendMode = 'normal';
        for (let i = 0; i < DUST_MAX; i++) {
            const p = new PIXI.Particle({ texture: dotTexture, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
            dustPC.addParticle(p);
            dustItems.push({ p, life: 0, max: 1, vx: 0, vy: 0, grav: 0, drag: 1, s0: 1, s1: 1, a0: 1, spin: 0 });
        }
        fxBack.addChild(dustPC);      // 塵土在角色後面，不要糊住角色
    }

    function dustPuff(x, y, count, power) {
        if (!dustPC) return;
        const U = u();
        for (let i = 0; i < count; i++) {
            let it = null;
            for (let k = 0; k < DUST_MAX; k++) {
                const idx = (dustCursor + k) % DUST_MAX;
                if (dustItems[idx].life <= 0) { dustCursor = (idx + 1) % DUST_MAX; it = dustItems[idx]; break; }
            }
            if (!it) break;

            // 每 7 顆夾一顆小石子：更小、更暗、彈得更遠也落得更快。
            // 全部都是塵土的話畫面只有一團霧，沒有「撞到地面」的顆粒感。
            const stone = i % 7 === 0;
            const ang = -Math.PI * (0.15 + Math.random() * 0.7);
            const sp = (stone ? 5 + Math.random() * 7 : 1.5 + Math.random() * 4) * U * power;
            const p = it.p;
            p.x = x + (Math.random() - 0.5) * 3 * U;
            p.y = y - Math.random() * 0.4 * U;
            p.tint = stone ? 0x6b5f4d : DUST_TINTS[i % DUST_TINTS.length];
            p.rotation = Math.random() * Math.PI;
            it.life = it.max = stone ? 0.5 + Math.random() * 0.3 : 0.9 + Math.random() * 0.8;
            it.vx = Math.cos(ang) * sp * (Math.random() < 0.5 ? -1 : 1);
            it.vy = Math.sin(ang) * sp;
            it.grav = stone ? 50 * U : 6 * U;    // 石子落回地面，塵土幾乎浮著
            it.drag = stone ? 0.99 : 0.93;       // 塵土很快被空氣煞住，然後慢慢擴散
            it.s0 = (stone ? 0.1 : 0.35 + Math.random() * 0.5) * U;
            it.s1 = stone ? it.s0 : it.s0 * (2.2 + Math.random());   // 塵土會擴散變大
            it.a0 = stone ? 0.9 : 0.34 + Math.random() * 0.22;       // 塵土本來就該很淡
            it.spin = (Math.random() - 0.5) * 4;
            p.alpha = it.a0;
            const k = it.s0 / 64;
            p.scaleX = k; p.scaleY = k;
        }
    }

    function updateDust(dt) {
        if (!dustPC) return;

        // 倒地觸地的那一刻補一大撮土。**用動畫自己的進度判斷，不要用 setTimeout** ——
        // 中間有慢動作，寫死的計時器一定會對不上觸地的那一格。
        if (fallAnim && !dustDone) {
            const prog = (fallAnim.currentTime || 0) / 850;
            if (prog >= 0.5) {
                dustDone = true;
                const n = nodes.player;
                if (n.box && n.sprite.classList.contains('die')) {
                    dustPuff(n.holder.x, n.box.y + n.box.h, 34, 1.25);
                }
            }
        }

        for (const it of dustItems) {
            if (it.life <= 0) continue;
            it.life -= dt;
            if (it.life <= 0) { it.p.alpha = 0; it.life = 0; continue; }
            const t = 1 - it.life / it.max;
            it.vx *= Math.pow(it.drag, dt * 60);
            it.vy = it.vy * Math.pow(it.drag, dt * 60) + it.grav * dt;
            it.p.x += it.vx * dt;
            it.p.y += it.vy * dt;
            it.p.rotation += it.spin * dt;
            it.p.alpha = it.a0 * (1 - t * t);
            const size = it.s0 + (it.s1 - it.s0) * t;
            const k = size / 64;
            it.p.scaleX = k; it.p.scaleY = k;
        }
    }

    // 慢動作與頓幀都會動 ticker.speed，還原時要問對方還在不在跑。
    function restoreTickerSpeed() {
        app.ticker.speed = slowmoActive ? SLOWMO_RATE : 1;
    }

    // ===============================================================
    // 追加特效（2026-08-27 檢查之後補的六項）
    // ===============================================================
    // 共同點：**它們讓已經存在的規則變得看得見。**
    // 連擊、流血、迷霧、特攻倒數本來只有狀態列上的數字 ——
    // 對小學生來說，畫面上沒發生的事等於不存在。

    // 由 math-rpg.js 的 renderStatus() 一次推過來。那裡本來就是所有狀態變動的匯流點，
    // 不必在 checkAnswer / damagePlayer / handleTimeout 各插一次呼叫。
    let fxCombo = 0, fxBleed = 0, fxFog = 0, fxCharge = 0;
    function setBattleState(s) {
        if (!s) return;
        fxCombo = s.combo || 0;
        fxBleed = s.bleed || 0;
        fxFog = s.fog || 0;
        fxCharge = s.enemyCharge || 0;   // 敵人「再幾次就放特攻」，1 = 下一次就來
    }

    // --- ① 衝擊波吹散環境粒子 -------------------------------------------
    // 兩個粒子系統本來各跑各的。加上這個之後，打擊會把空氣中的花瓣／火星推開，
    // 「這一拳有力量」就從場景本身讀得出來，不只是角色身上。
    function gustAmbient(cx, cy, power) {
        const U = u();
        for (const key of ['back', 'front']) {
            const L = layersA[key];
            if (!L) continue;
            for (const it of L.items) {
                if (it.life <= 0) continue;
                const dx = it.p.x - cx, dy = it.p.y - cy;
                const d = Math.max(U, Math.hypot(dx, dy));
                const f = power * 34 * U / d;    // 越靠近爆點吹得越開
                it.vx += dx / d * f;
                it.vy += dy / d * f;
            }
        }
    }

    // --- ② 連擊的視覺累積 -----------------------------------------------
    // 連擊 2 和連擊 10 以前在畫面上完全一樣，只有徽章數字不同。
    const COMBO_AURA_AT = 5;      // 開始冒金色微光
    const COMBO_HOT_AT = 8;       // 劍氣拖尾換成更燙的色調
    let auraAcc = 0;

    function updateComboAura(dt) {
        if (fxCombo < COMBO_AURA_AT) { auraAcc = 0; return; }
        const n = nodes.player;
        if (!n.box || !n.holder.visible) return;
        const U = u();
        // 層數越高冒得越密，但要封頂，否則高連擊時整個人會糊掉
        auraAcc += Math.min(26, 8 + (fxCombo - COMBO_AURA_AT) * 3) * dt;
        const hot = fxCombo >= COMBO_HOT_AT;
        while (auraAcc >= 1) {
            auraAcc -= 1;
            emit(Math.random() < 0.5 ? 'back' : 'front', {
                x: n.holder.x + (Math.random() - 0.5) * n.box.w * 0.5,
                y: n.box.y + n.box.h - Math.random() * n.box.h * 0.75,
                vx: (Math.random() - 0.5) * 1.4 * U,
                vy: -(1.6 + Math.random() * 2.4) * U,
                life: 0.5 + Math.random() * 0.5,
                size: (0.1 + Math.random() * 0.22) * U, size1: 0,
                tint: hot ? [0xffffff, 0xffd54f, 0xff8a65][(Math.random() * 3) | 0]
                          : [0xffe082, 0xfff59d][(Math.random() * 2) | 0],
                drag: 0.97, stretch: 1 + Math.random() * 0.8
            });
        }
    }

    // 劍氣拖尾的顏色也吃連擊 —— 高連擊時整條軌跡從冷藍轉成熱白金
    function trailTints() {
        if (fxCombo >= COMBO_HOT_AT) return [0xffffff, 0xffd54f, 0xffab40];
        if (fxCombo >= COMBO_AURA_AT) return [0xffffff, 0xfff59d, 0x80d8ff];
        return [0xffffff, 0x80d8ff, 0x40c4ff];
    }

    // --- ③④ 狀態的實體：流血滴落、迷霧、特攻預告 ------------------------
    let bleedAcc = 0, fogAcc = 0, chargeWarnAcc = 0;

    function updateStatusFx(dt) {
        const n = nodes.player;
        const U = u();

        // 流血：腳邊持續滴落，層數越多滴越快 —— 徽章上的數字在地上有了對應物
        if (fxBleed > 0 && n.box && n.holder.visible) {
            bleedAcc += Math.min(14, 3 + fxBleed * 1.6) * dt;
            while (bleedAcc >= 1) {
                bleedAcc -= 1;
                emit('front', {
                    x: n.holder.x + (Math.random() - 0.5) * n.box.w * 0.28,
                    y: n.box.y + n.box.h - n.box.h * (0.25 + Math.random() * 0.3),
                    vx: (Math.random() - 0.5) * 0.8 * U,
                    vy: (3 + Math.random() * 4) * U,
                    grav: 40 * U, drag: 0.99,
                    life: 0.45 + Math.random() * 0.3,
                    size: (0.1 + Math.random() * 0.16) * U, size1: 0.04 * U,
                    tint: [0xd32f2f, 0xff5252][(Math.random() * 2) | 0],
                    stretch: 2.4 + Math.random() * 1.6
                });
            }
        } else bleedAcc = 0;

        // 迷霧：舞台左右邊緣飄進來的薄霧。**用 normal 混合的塵土容器** ——
        // 加亮的霧會發光，看起來像瓦斯不像霧。
        if (fxFog > 0 && dustPC) {
            fogAcc += 3.2 * dt;
            while (fogAcc >= 1) { fogAcc -= 1; fogWisp(); }
        } else fogAcc = 0;

        // 敵人特攻預告：剩最後一次時紅光往怪物身上收斂。
        // 徽章寫著「⚡1」，但孩子看的是畫面 —— 這一圈紅光才是真正讀得到的警告。
        const e = nodes.enemy;
        if (fxCharge === 1 && e.box && e.holder.visible) {
            chargeWarnAcc += 22 * dt;
            const c = centerOf('enemy');
            while (chargeWarnAcc >= 1) {
                chargeWarnAcc -= 1;
                const ang = Math.random() * Math.PI * 2;
                const r = (4 + Math.random() * 3.5) * U;
                const life = 0.24 + Math.random() * 0.12;
                emit('front', {
                    x: c.x + Math.cos(ang) * r,
                    y: c.y + Math.sin(ang) * r * 0.8,
                    vx: -Math.cos(ang) * r / life,
                    vy: -Math.sin(ang) * r * 0.8 / life,
                    life,
                    size: (0.1 + Math.random() * 0.2) * U, size1: 0.02 * U,
                    tint: [0xff5252, 0xff8a80, 0xffffff][(Math.random() * 3) | 0],
                    rotation: ang, stretch: 2 + Math.random() * 2
                });
            }
        } else chargeWarnAcc = 0;
    }

    function fogWisp() {
        let it = null;
        for (let k = 0; k < DUST_MAX; k++) {
            const idx = (dustCursor + k) % DUST_MAX;
            if (dustItems[idx].life <= 0) { dustCursor = (idx + 1) % DUST_MAX; it = dustItems[idx]; break; }
        }
        if (!it) return;
        const U = u(), W = app.screen.width, H = app.screen.height;
        const fromLeft = Math.random() < 0.5;
        const p = it.p;
        p.x = fromLeft ? -2 * U : W + 2 * U;
        p.y = H * (0.45 + Math.random() * 0.5);
        p.tint = [0xb0bec5, 0x90a4ae, 0xcfd8dc][(Math.random() * 3) | 0];
        p.rotation = Math.random() * Math.PI;
        it.life = it.max = 3.5 + Math.random() * 2.5;
        it.vx = (fromLeft ? 1 : -1) * (3 + Math.random() * 4) * U;
        it.vy = -(0.2 + Math.random() * 0.6) * U;
        it.grav = 0; it.drag = 1;
        it.s0 = (1.6 + Math.random() * 1.8) * U;
        it.s1 = it.s0 * 1.6;
        it.a0 = 0.14 + Math.random() * 0.1;      // 很淡，不能糊住角色
        it.spin = (Math.random() - 0.5) * 0.4;
        p.alpha = it.a0;
        const k = it.s0 / 64;
        p.scaleX = k; p.scaleY = k;
    }

    // --- ⑤ 打倒敵人的定格 -----------------------------------------------
    // 碎裂之前先把怪物整個打成白色剪影並凍住一瞬間，再爆開。
    // 沒有這一拍，碎裂來得太快，「我打倒牠了」那個瞬間會被自己的特效蓋過去。
    const DEFEAT_FREEZE_MS = 110;
    let whiteFilter = null;

    function initWhiteFilter() {
        whiteFilter = new PIXI.ColorMatrixFilter();
        // RGB 全部推成 1、alpha 原樣保留 → 保住輪廓，成為剪影而不是白方塊
        whiteFilter.matrix = [0,0,0,0,1,  0,0,0,0,1,  0,0,0,0,1,  0,0,0,1,0];
    }

    function defeatFreeze(side) {
        const n = nodes[side];
        n.whiteUntil = performance.now() + DEFEAT_FREEZE_MS;
        hitstop(DEFEAT_FREEZE_MS);
        setTimeout(() => { n.whiteUntil = 0; shatterFx(side); }, DEFEAT_FREEZE_MS);
    }

    // --- ⑥ 治療 ---------------------------------------------------------
    // 原本是 10 顆 CSS span，是最後一個還留在 DOM 的戰鬥特效。
    function healFx(side, count = 26) {
        if (!ready) return false;
        const n = nodes[side];
        if (!n.box) return false;
        const U = u();
        for (let i = 0; i < count; i++) {
            emit(Math.random() < 0.4 ? 'back' : 'front', {
                x: n.holder.x + (Math.random() - 0.5) * n.box.w * 0.6,
                y: n.box.y + n.box.h - Math.random() * 0.25 * n.box.h,
                vx: (Math.random() - 0.5) * 1.2 * U,
                vy: -(3 + Math.random() * 4) * U,
                life: 0.8 + Math.random() * 0.7,
                size: (0.14 + Math.random() * 0.3) * U, size1: 0,
                tint: [0x69f0ae, 0xb9f6ca, 0xffffff][(Math.random() * 3) | 0],
                drag: 0.985, stretch: 1 + Math.random() * 0.6
            });
        }
        return true;
    }

    // ===============================================================
    // #17 關卡切換轉場
    // ===============================================================
    // 舊的背景不是直接換掉，而是留一張在下面淡出，上面同時掃過一道光。
    // 沒有留舊貼圖的話「溶解」就只是淡入，看不出是在換場景。
    let bgPrev = null, wipeT = -1;
    const WIPE_DUR = 0.55;
    let wipeSprite = null;

    function initWipe() {
        bgPrev = new PIXI.Sprite();
        bgPrev.visible = false;
        bgLayer.addChildAt(bgPrev, 0);      // 墊在新背景底下

        // 掃過去的那道光：一條白色長條，加亮混合
        const W = 64, H = 8, cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const g = cv.getContext('2d');
        const grad = g.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.fillRect(0, 0, W, H);
        wipeSprite = new PIXI.Sprite(PIXI.Texture.from(cv));
        wipeSprite.anchor.set(0.5, 0.5);
        wipeSprite.blendMode = 'add';
        wipeSprite.visible = false;
        chargeLayer.addChild(wipeSprite);   // 蓋在角色之上
    }

    function startWipe(oldTex) {
        if (!bgPrev) return;
        if (oldTex) {
            bgPrev.texture = oldTex;
            bgPrev.scale.copyFrom(bgSprite.scale);
            bgPrev.position.set(bgBase.x, bgBase.y);
            bgPrev.alpha = 1;
            bgPrev.visible = true;
        }
        wipeT = 0;
        wipeSprite.visible = true;
    }

    function updateWipe(dt) {
        if (wipeT < 0) return;
        wipeT += dt;
        const t = wipeT / WIPE_DUR;
        if (t >= 1) {
            wipeT = -1;
            if (bgPrev) bgPrev.visible = false;
            if (wipeSprite) wipeSprite.visible = false;
            return;
        }
        if (bgPrev.visible) bgPrev.alpha = 1 - t;      // 舊景淡出，新景從底下透出來
        const W = app.screen.width, H = app.screen.height;
        wipeSprite.height = H * 1.6;
        wipeSprite.width = W * 0.22;
        wipeSprite.rotation = 0.18;                    // 稍微斜著掃，比垂直有速度感
        wipeSprite.x = -W * 0.2 + t * W * 1.4;
        wipeSprite.y = H / 2;
        wipeSprite.alpha = Math.sin(t * Math.PI) * 0.85;
    }

    function initFilters() {
        initGrayFilter();
        shockFilter = PIXI.Filter.from({
            gl: { vertex: PIXI.defaultFilterVert, fragment: `
                in vec2 vTextureCoord;
                out vec4 finalColor;
                uniform sampler2D uTexture;
                uniform vec2 uCenter;     // 0~1 畫面座標
                uniform float uRadius;    // 目前的環半徑
                uniform float uAmp;       // 位移強度
                uniform float uAspect;    // 寬高比，避免橢圓形的環
                void main() {
                    vec2 d = vTextureCoord - uCenter;
                    d.x *= uAspect;
                    float dist = length(d);
                    // 只有落在環附近的像素才被推開，環越遠越薄、越弱
                    float band = smoothstep(0.16, 0.0, abs(dist - uRadius));
                    vec2 dir = dist > 0.0001 ? normalize(d) : vec2(0.0);
                    vec2 off = dir * band * uAmp;
                    off.x /= uAspect;
                    finalColor = texture(uTexture, vTextureCoord + off);
                }` },
            resources: { shockUniforms: {
                uCenter: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
                uRadius: { value: 0, type: 'f32' },
                uAmp:    { value: 0, type: 'f32' },
                uAspect: { value: 1, type: 'f32' }
            } }
        });

        aberrFilter = PIXI.Filter.from({
            gl: { vertex: PIXI.defaultFilterVert, fragment: `
                in vec2 vTextureCoord;
                out vec4 finalColor;
                uniform sampler2D uTexture;
                uniform float uShift;
                void main() {
                    // R 與 B 往相反方向偏一點點，中間留 G —— 典型的色差
                    float r = texture(uTexture, vTextureCoord + vec2(uShift, 0.0)).r;
                    vec4 g  = texture(uTexture, vTextureCoord);
                    float b = texture(uTexture, vTextureCoord - vec2(uShift, 0.0)).b;
                    finalColor = vec4(r, g.g, b, g.a);
                }` },
            resources: { aberrUniforms: { uShift: { value: 0, type: 'f32' } } }
        });
    }

    // 目前該掛哪些全螢幕濾鏡。**沒有特效在跑時一定要設回 null** ——
    // 全螢幕濾鏡每幀都要多一次 render to texture，常駐著等於白燒效能。
    function syncStageFilters() {
        const list = [];
        if (shockT >= 0) list.push(shockFilter);
        if (aberrT >= 0) list.push(aberrFilter);
        if (grayT >= 0) list.push(grayFilter);
        if (list.length) {
            app.stage.filterArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
            app.stage.filters = list;
        } else if (app.stage.filters) {
            app.stage.filters = null;
        }
    }

    function updateFilters(dt) {
        if (shockT >= 0) {
            shockT += dt;
            const t = shockT / SHOCK_DUR;
            if (t >= 1) { shockT = -1; }
            else {
                const u = shockFilter.resources.shockUniforms.uniforms;
                u.uRadius = t * 0.75;                 // 環往外擴
                u.uAmp = 0.035 * (1 - t) * (1 - t);   // 強度隨距離衰減
            }
            syncStageFilters();
        }
        if (aberrT >= 0) {
            aberrT += dt;
            const t = aberrT / ABERR_DUR;
            if (t >= 1) { aberrT = -1; }
            else aberrFilter.resources.aberrUniforms.uniforms.uShift = 0.006 * (1 - t);
            syncStageFilters();
        }
        if (grayT >= 0) {
            grayT += dt;
            const t = Math.min(1, grayT / GRAY_DUR);
            // 染完之後**不歸零**：勇者倒下之後畫面本來就該停在褪色狀態，
            // 直到 endGame 把整個戰鬥畫面藏起來。spawnEnemy / beginBattle 會清掉。
            grayFilter.resources.grayUniforms.uniforms.uRadius = t * 1.9;
            syncStageFilters();
        }
        updateWipe(dt);
    }

    // ===============================================================
    // 開新的一場：把所有還在跑的特效清乾淨
    // ===============================================================
    // **這個一定要有。** frame() 在 #battle-screen hidden 時會直接 return（省效能），
    // 所以粒子與碎片不會繼續衰減，而是**整組凍在半空中**。
    // 玩家中途按返回、或輸了之後再挑戰，下一場的第一幀就會接著播上一場的爆炸。
    // 實測（2026-08-27）：離開時 180 顆粒子＋36 片碎片，回到選單兩秒後一顆都沒少，
    // 開新局的第一幀原封不動全部出現。
    function reset() {
        if (!ready) return;
        for (const k of ['back', 'front']) {
            if (layersP[k]) for (const it of layersP[k].items) { it.life = 0; it.p.alpha = 0; }
            if (layersA[k]) for (const it of layersA[k].items) { it.life = 0; it.p.alpha = 0; }
        }
        for (const it of dustItems) { it.life = 0; it.p.alpha = 0; }
        while (shards.length) shards.pop().s.destroy();
        while (afterimages.length) afterimages.pop().s.destroy();
        for (const side of sides) {
            const n = nodes[side];
            n.shattered = false;
            n.hurtAnim = null;
            n.dieAnim = null;
            n.afterAt = 0;
        }
        if (chargeSprite) chargeSprite.visible = false;
        chargeT = -1;
        if (bgPrev) bgPrev.visible = false;
        if (wipeSprite) wipeSprite.visible = false;
        wipeT = -1;
        shockT = -1;
        aberrT = -1;
        ambientStage = null;          // 讓新的一關重新鋪一批環境粒子
        fxCombo = fxBleed = fxFog = fxCharge = 0;
        auraAcc = bleedAcc = fogAcc = chargeWarnAcc = 0;
        for (const side of sides) nodes[side].whiteUntil = 0;
        releaseHitstop();
        clearGray();                  // 這一支也會取消慢動作
    }

    // 新的一場 / 新的一關要把灰階清掉，否則上一場的失敗染色會留到下一場。
    // **慢動作也要一起取消** —— 玩家可能在勇者還在倒地的途中就按了「再挑戰」，
    // 那時 ticker.speed 還停在 0.45，不清的話新的一整場都是慢動作。
    function clearGray() {
        grayT = -1;
        if (grayFilter) grayFilter.resources.grayUniforms.uniforms.uRadius = 0;
        clearTimeout(slowmoTimer);
        slowmoTimer = null;
        slowmoActive = false;
        if (fallAnim) { try { fallAnim.playbackRate = 1; } catch (e) {} }
        fallAnim = null;
        if (app.ticker.speed !== 0) app.ticker.speed = 1;
        syncStageFilters();
    }

    // ===============================================================
    // 六個特效
    // ===============================================================
    function u() { return (nodes.player.box ? nodes.player.box.h : 200) / 14; }   // 1u 的實際 px

    // 角色身體中心（粒子要從這裡噴出來，不是腳底）
    function centerOf(side) {
        const n = nodes[side];
        const box = n.box || { h: 200 };
        return { x: n.holder.x, y: n.holder.y - box.h * 0.45 };
    }

    // --- #2 命中爆散 ---------------------------------------------------
    // 舊版是 11 顆 DOM span（爆擊 20 顆）。這裡一次噴 90~150 顆，
    // 一半在角色後面、一半在前面，所以看起來是「炸開來包住角色」而不是貼在正面。
    function burst(side, opts = {}) {
        const c = centerOf(side);
        const U = u();
        const n = opts.count || 110;
        const tint = opts.tint != null ? opts.tint : 0xffd54f;
        const power = opts.power || 1;
        for (let i = 0; i < n; i++) {
            const ang = Math.random() * Math.PI * 2;
            // 稍微偏向斜上方：純圓形的爆散看起來像煙火，偏上才像被打飛
            const sp = (2 + Math.random() * 9) * U * power;
            const vx = Math.cos(ang) * sp;
            const vy = Math.sin(ang) * sp - 1.5 * U * power;
            emit(Math.random() < 0.5 ? 'back' : 'front', {
                x: c.x + (Math.random() - 0.5) * U * 2,
                y: c.y + (Math.random() - 0.5) * U * 2,
                vx, vy,
                grav: 26 * U,
                drag: 0.94,
                life: 0.34 + Math.random() * 0.45,
                size: (0.25 + Math.random() * 0.55) * U,
                size1: 0,
                tint,
                rotation: ang,
                stretch: 1 + Math.random() * 2.2,     // 拉長的光點 = 條狀火花
                spin: (Math.random() - 0.5) * 6
            });
        }
    }

    // --- #6 勇者受傷：血花 + 殘影 ---------------------------------------
    function hurtFx(side) {
        const c = centerOf(side);
        const U = u();
        const away = side === 'player' ? -1 : 1;       // 往被打飛的方向噴
        for (let i = 0; i < 46; i++) {
            const ang = Math.PI + (Math.random() - 0.5) * 1.9;
            const sp = (3 + Math.random() * 8) * U;
            emit(Math.random() < 0.35 ? 'back' : 'front', {
                x: c.x, y: c.y,
                vx: Math.cos(ang) * sp * away, vy: Math.sin(ang) * sp - 2 * U,
                grav: 46 * U, drag: 0.95,
                life: 0.4 + Math.random() * 0.4,
                size: (0.2 + Math.random() * 0.4) * U, size1: 0,
                tint: [0xff5252, 0xd32f2f, 0xff8a80][i % 3],
                rotation: ang, stretch: 1.6 + Math.random() * 2
            });
        }
        nodes[side].afterAt = 4;      // 接下來 4 次 tick 各留一張殘影
    }

    // 殘影：把角色目前的樣子複製一張放到後層，慢慢淡掉。
    // 用 holder 的矩陣直接複製，所以殘影的姿態一定跟本體當下完全一致。
    const afterimages = [];
    function pushAfterimage(side) {
        const n = nodes[side];
        if (!n.pixi.texture) return;
        const s = new PIXI.Sprite(n.pixi.texture);
        s.anchor.set(0.5, 1);
        s.scale.set(n.pixi.scale.x, n.pixi.scale.y);
        s.setFromMatrix(n.holder.localTransform.clone().append(
            new PIXI.Matrix(n.pixi.scale.x, 0, 0, n.pixi.scale.y, 0, 0)));
        s.tint = side === 'player' ? 0x88bbff : 0xffaaaa;
        s.alpha = 0.5;
        s.blendMode = 'add';
        fxBack.addChild(s);
        afterimages.push({ s, life: 0.28, max: 0.28 });
    }

    function updateAfterimages(dt) {
        for (let i = afterimages.length - 1; i >= 0; i--) {
            const a = afterimages[i];
            a.life -= dt;
            if (a.life <= 0) { a.s.destroy(); afterimages.splice(i, 1); continue; }
            a.s.alpha = 0.5 * (a.life / a.max);
        }
    }

    // --- #5 怪物死亡：剪影碎裂 -------------------------------------------
    // 不是粒子 —— 是把角色貼圖切成網格，每一片用自己的 UV 當成獨立 Sprite 飛出去。
    // 所以碎片上看得到角色原本的顏色與紋理，讀起來才是「這隻怪碎了」。
    const shards = [];
    const SHARD_GRID = 6;
    function shatterFx(side) {
        const n = nodes[side];
        const tex = n.pixi.texture;
        if (!tex) return;
        const U = u();
        const src = tex.source;
        const fw = tex.frame.width / SHARD_GRID, fh = tex.frame.height / SHARD_GRID;
        const sc = n.pixi.scale.x;
        const originX = n.holder.x, originY = n.holder.y;
        const w = tex.frame.width * sc, h = tex.frame.height * sc;

        for (let gy = 0; gy < SHARD_GRID; gy++) {
            for (let gx = 0; gx < SHARD_GRID; gx++) {
                const piece = new PIXI.Texture({
                    source: src,
                    frame: new PIXI.Rectangle(tex.frame.x + gx * fw, tex.frame.y + gy * fh, fw, fh)
                });
                const s = new PIXI.Sprite(piece);
                s.anchor.set(0.5, 0.5);
                s.scale.set(sc);
                // 還原這一片原本在角色身上的位置（錨點是底部中央，所以 y 從 -h 起算）
                s.x = originX - w / 2 + (gx + 0.5) * fw * sc;
                s.y = originY - h + (gy + 0.5) * fh * sc;
                shatter.addChild(s);
                const dx = s.x - originX, dy = s.y - (originY - h / 2);
                const d = Math.max(1, Math.hypot(dx, dy));
                shards.push({
                    s, life: 0.9, max: 0.9,
                    vx: dx / d * (4 + Math.random() * 7) * U + (Math.random() - 0.5) * 3 * U,
                    vy: dy / d * (4 + Math.random() * 7) * U - 6 * U,
                    spin: (Math.random() - 0.5) * 9
                });
            }
        }
        // 本體讓給碎片，否則會有一個完整的角色和一堆碎片同時存在
        n.shattered = true;
        n.holder.visible = false;
    }

    function updateShards(dt) {
        const U = u();
        for (let i = shards.length - 1; i >= 0; i--) {
            const k = shards[i];
            k.life -= dt;
            if (k.life <= 0) { k.s.destroy(); shards.splice(i, 1); continue; }
            k.vy += 52 * U * dt;
            k.s.x += k.vx * dt; k.s.y += k.vy * dt;
            k.s.rotation += k.spin * dt;
            const t = 1 - k.life / k.max;
            k.s.alpha = 1 - t * t;
        }
    }

    // --- #4 爆擊：徑向光束 + 色差 + 頓幀 ----------------------------------
    // 頓幀刻意做得很短（60ms）。CSS 動畫是靠 setTimeout 排程的（SLASH_IMPACT_DELAY 那組），
    // 暫停動畫不會暫停那些計時器，停太久動畫就會落後排程。
    const HITSTOP_MS = 60;
    function critFx(side) {
        const c = centerOf(side);
        const U = u();
        // 徑向光束：把光點拉得很長就是光束，不必另外做素材
        const beams = 10;
        for (let i = 0; i < beams; i++) {
            const ang = (i / beams) * Math.PI * 2 + Math.random() * 0.2;
            emit('front', {
                x: c.x, y: c.y,
                vx: Math.cos(ang) * 26 * U, vy: Math.sin(ang) * 26 * U,
                life: 0.3, size: 1.5 * U, size1: 0.2 * U,
                tint: 0xfff59d, rotation: ang, stretch: 9, drag: 0.9
            });
        }
        aberrT = 0;
        syncStageFilters();
        hitstop();
    }

    // 頓幀期間被暫停的 CSS 動畫，以及還原用的計時器。
    // **一定要用模組層級的集合、還原時固定設回 speed = 1。**
    // 早期版本是「記下當下的 speed、之後還原回去」：兩次爆擊間隔小於 60ms 時，
    // 第二次記到的 speed 已經是 0，還原後 ticker 就永久停在 0，所有特效直接死掉。
    // 同理，被暫停的動畫要累積在一個集合裡一次全部放行，
    // 不能只放行「這一次抓到的那批」—— 上一次抓到、這一次沒抓到的會永遠停著。
    let pausedAnims = new Set();
    let hitstopTimer = null;

    function hitstop(ms) {
        const dur = ms || HITSTOP_MS;
        if (!dur) return;
        const els = [document.getElementById('player-sprite'),
                     document.getElementById('enemy-sprite'),
                     document.getElementById('stage-slash')].filter(Boolean);
        els.flatMap(e => e.getAnimations({ subtree: true }))
           .forEach(a => { try { a.pause(); pausedAnims.add(a); } catch (e) {} });
        app.ticker.speed = 0;

        clearTimeout(hitstopTimer);
        hitstopTimer = setTimeout(releaseHitstop, dur);
    }

    function releaseHitstop() {
        clearTimeout(hitstopTimer);
        hitstopTimer = null;
        pausedAnims.forEach(a => { try { a.play(); } catch (e) {} });
        pausedAnims.clear();
        // 不能無條件設 1 —— 勇者倒下的慢動作可能還在跑，那時要還原成 SLOWMO_RATE
        restoreTickerSpeed();
    }

    // --- #3 衝擊波 -------------------------------------------------------
    function shockwave(side) {
        const c = centerOf(side);
        const uni = shockFilter.resources.shockUniforms.uniforms;
        uni.uCenter[0] = c.x / app.screen.width;
        uni.uCenter[1] = c.y / app.screen.height;
        uni.uAspect = app.screen.width / app.screen.height;
        shockT = 0;
        syncStageFilters();
        gustAmbient(c.x, c.y, 1);   // 順便把空氣中的環境粒子吹開
    }

    // --- #1 劍氣拖尾 -----------------------------------------------------
    // 劍氣本身還是 DOM（#stage-slash 跑 CSS 的 slashFly）。
    // 這裡每幀讀它的位置，沿路灑光點 —— 軌跡本身因此變得看得見，
    // 而且因為粒子在 canvas 裡，拖尾會被角色擋住／繞過角色，不是浮在最上層的一條線。
    let lastTrail = { x: 0, y: 0, on: false };
    function updateSlashTrail(dt) {
        const el = document.getElementById('stage-slash');
        const stage = document.getElementById('battle-stage');
        if (!el || !stage) return;
        const on = el.classList.contains('slashing');
        if (!on) { lastTrail.on = false; return; }
        const op = parseFloat(getComputedStyle(el).opacity || '0');
        if (op < 0.05) { lastTrail.on = false; return; }

        const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
        const x = r.left + r.width / 2 - s.left;
        const y = r.top + r.height / 2 - s.top;
        if (lastTrail.on) {
            const U = u();
            const dx = x - lastTrail.x, dy = y - lastTrail.y;
            const dist = Math.hypot(dx, dy);
            const n = Math.min(12, Math.max(2, Math.round(dist / (U * 0.5))));
            for (let i = 0; i < n; i++) {
                const f = i / n;
                emit('front', {
                    x: lastTrail.x + dx * f + (Math.random() - 0.5) * U * 1.6,
                    y: lastTrail.y + dy * f + (Math.random() - 0.5) * U * 2.2,
                    vx: (Math.random() - 0.5) * 2 * U, vy: (Math.random() - 0.5) * 2 * U - U,
                    life: 0.22 + Math.random() * 0.3,
                    size: (0.18 + Math.random() * 0.4) * U, size1: 0,
                    tint: trailTints()[i % 3],
                    drag: 0.9, stretch: 1 + Math.random()
                });
            }
        }
        lastTrail = { x, y, on: true };
    }

    // 由 CSS class 的變化推動：hurt / die 不必去改 math-rpg.js，
    // 這裡自己看 .sprite 上的 class 就知道發生了什麼。
    // ⚠️ **不能用「class 在不在」來判斷動作是不是又觸發了一次。**
    // act() 是 remove → reflow → add，全部在同一個 JS turn 裡完成，
    // 而這個函式一幀才輪詢一次 —— 中間那個「沒有 class」的瞬間永遠看不到。
    // 結果就是：連續兩次答錯，血花只噴第一次；連續兩次答對，怪物的受擊反饋也只有第一次。
    // （2026-08-27 實測確認：第二次 hurt 的粒子增量是 0。）
    //
    // 改成比對 **Animation 物件本身**。restart() 每次都會產生一個全新的 instance，
    // 所以「物件換了」就是「重新觸發了」，不管 class 有沒有中斷過。
    function animOf(el, name) {
        return el.getAnimations().find(a => a.animationName === name) || null;
    }

    function watchClasses() {
        for (const side of sides) {
            const n = nodes[side];

            const hurtAnim = animOf(n.sprite, 'hurt');
            if (hurtAnim && hurtAnim !== n.hurtAnim) {
                // **血花＋殘影只給勇者。** 這一項的規格就是「勇者受傷」，
                // 怪物被打的反饋由 strike() 呼叫的 impactFx 負責（金色碎片＋衝擊波）。
                // 兩個都跑的話，怪物身上會同時噴紅色血花與金色碎片，顏色打架、粒子也翻倍。
                if (side === 'player') hurtFx(side);
            }
            n.hurtAnim = hurtAnim;

            const dieAnim = animOf(n.sprite, 'die');
            if (dieAnim && dieAnim !== n.dieAnim) {
                // **碎裂只給怪物。** 勇者是孩子的化身，碎成 36 片太狠 ——
                // 改成慢動作倒地＋塵土，加上全畫面的灰階漸染（#19）。
                if (side === "enemy") defeatFreeze(side);   // 先定格白剪影，再碎裂
                else { grayWash(side); heroFallFx(side); }
            }
            if (!dieAnim && n.dieAnim) n.shattered = false;   // 下一隻怪登場，本體要回來
            n.dieAnim = dieAnim;

            if (n.afterAt > 0) { pushAfterimage(side); n.afterAt--; }
        }
    }

    function updateFx(dt) {
        // 保險：ticker 停著、但沒有頓幀在排程中 —— 代表還原的 timer 被漏掉了
        // （分頁被丟到背景、或某次例外把它吃掉）。自己救回來，否則整個特效層等於死掉。
        if (app.ticker.speed === 0 && !hitstopTimer) releaseHitstop();

        updateComboAura(dt);    // 連擊光暈
        updateStatusFx(dt);     // 流血滴落、迷霧、特攻預告
        updateBackground();     // #9  視差要在角色姿態算完之後才讀得到位移
        updateShadows();        // #11 同上
        updateAmbient(dt);      // #10
        updateCharge(dt);       // #7
        updateDust(dt);         //     勇者倒地的塵土
        updateSlashTrail(dt);   // #1
        updateParticles(dt);    // #2 #6 的粒子與 #7 的收斂粒子共用這個池子
        updateAfterimages(dt);  // #6
        updateShards(dt);       // #5
        updateFilters(dt);      // #3 #4
    }

    // ===============================================================
    // #9 場景背景與視差
    // ===============================================================
    // 把 .stage-bg 的那張圖也畫進 canvas，理由有三個：
    //   1. 視差 —— 背景可以跟著動作反向微移
    //   2. 衝擊波終於推得動背景（在這之前只推得動角色與粒子）
    //   3. 環境粒子才能正確地夾在「背景之上、角色之下」
    //
    // **DOM 的 .stage-bg 刻意不隱藏。** 它就躺在 canvas 底下當免費的備援：
    // 這裡的圖若沒載到、或 cover 算錯，看到的仍然是原本正確的背景，不會開天窗。
    //
    // ⚠️ cover 的算法必須跟 CSS 完全一致：
    //   scale = max(W/iw, H/ih)，position 是 center bottom。
    //   背景帶是逐張裁過的，地面線就靠這個對齊角色腳底（見 .claude/math-rpg-stages.sh），
    //   算錯的話角色會浮空或陷進地裡。
    // ⚠️⚠️ **BG_OVERSCALE 必須維持 1.0。**
    // 一開始設 1.05 想給視差留位移餘裕，那是錯的：圖是**底部錨定**的，
    // 放大 5% 會讓圖裡的地面線離底邊的距離也大 5%，等於整條地面線往上跑，
    // 角色就浮空了 —— 正是 .claude/math-rpg-stages.sh 註解裡再三警告的那件事。
    //
    // 那視差位移時露出的邊緣怎麼辦？**不用怕，DOM 的 .stage-bg 就在 canvas 底下。**
    // 那層刻意沒隱藏，位置與這裡完全一致，露出的縫隙看到的是同一張圖的正確位置。
    // 實際位移量也只有幾 px（衝刺 56px x 0.07 ≈ 4px）且只持續 200ms。
    const BG_OVERSCALE = 1.0;
    const PARALLAX = 0.07;        // 角色位移的幾成反向套到背景上
    let bgSprite = null, bgKey = null, bgBase = { x: 0, y: 0 };

    function initBackground() {
        bgSprite = new PIXI.Sprite();
        bgSprite.visible = false;
        bgLayer.addChild(bgSprite);
    }

    // 讀 DOM 背景層目前用的是哪張圖（applyStage 設在 --stage-img 上）
    function currentStageKey() {
        const bg = document.querySelector('#battle-stage .stage-bg');
        if (!bg) return null;
        const raw = bg.style.getPropertyValue('--stage-img');
        const m = raw && raw.match(/url\(["']?(.*?)["']?\)/);
        return m ? m[1] : null;
    }

    function layoutBackground() {
        if (!bgSprite || !bgSprite.texture || !bgSprite.texture.width) return;
        const W = app.screen.width, H = app.screen.height;
        const t = bgSprite.texture;
        const s = Math.max(W / t.width, H / t.height) * BG_OVERSCALE;
        bgSprite.scale.set(s);
        bgBase.x = (W - t.width * s) / 2;      // center
        bgBase.y = H - t.height * s;           // bottom
        bgSprite.position.set(bgBase.x, bgBase.y);
    }

    function updateBackground() {
        const key = currentStageKey();
        if (!key) { bgSprite.visible = false; bgKey = null; return; }
        if (key !== bgKey) {
            const tex = PIXI.Assets.get(key);
            if (!tex) { bgSprite.visible = false; return; }   // 還沒載完就先讓 DOM 那層頂著
            const oldTex = bgKey ? bgSprite.texture : null;
            bgKey = key;
            bgSprite.texture = tex;
            layoutBackground();
            // #17 關卡切換：背景圖換掉就是換場景，這裡是最準的觸發點 ——
            // 不必去 hook spawnEnemy，也不會在第一次進場時誤觸（oldTex 是 null）。
            //
            // ⚠️ clearGray() **必須跟 startWipe 綁在同一個 oldTex 條件裡。**
            // 放在條件外面的話「第一次指定背景」那一幀也會清一次 ——
            // 而那一幀可能剛好就是 watchClasses 觸發 grayWash / heroFallFx 的同一幀
            // （watchClasses 在 frame 開頭跑、updateBackground 在 frame 結尾的 updateFx 裡），
            // 結果慢動作與灰階當場被自己抹掉。第一次指定背景不是換關。
            if (oldTex) {
                startWipe(oldTex);
                clearGray();      // 上一場若停在褪色狀態，新關卡要恢復
            }
        }
        bgSprite.visible = true;

        // 視差：兩個角色離開待機位置多少，背景就往反方向挪一點點。
        // 用兩者位移的和 —— 同一時間只有一方在衝刺，所以實際上就是攻擊方的位移。
        let dx = 0, dy = 0;
        for (const side of sides) {
            const n = nodes[side];
            if (!n.box) continue;
            dx += n.holder.x - (n.box.x + n.box.w / 2);
            dy += n.holder.y - (n.box.y + n.box.h);
        }
        bgSprite.x = bgBase.x - dx * PARALLAX;
        bgSprite.y = bgBase.y - dy * PARALLAX * 0.5;
    }

    // ===============================================================
    // #11 地面陰影
    // ===============================================================
    // DOM 版是固定大小的漸層橢圓 + 2.6s 的呼吸動畫，跟角色實際跳多高無關。
    // 這裡改成**由角色離地高度驅動**：跳得越高，影子越小越淡。
    // 影子畫在背景之上、角色之下，所以環境粒子飄過去時會蓋在影子上，層次才對。
    let shadowTex = null;
    function initShadows() {
        // 一樣用 canvas 2D 畫柔邊橢圓。Graphics 畫的實心橢圓邊緣太硬，不像影子。
        const W = 128, H = 48;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2);
        grad.addColorStop(0, 'rgba(0,0,0,0.42)');
        grad.addColorStop(0.55, 'rgba(0,0,0,0.20)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.translate(W/2, H/2); g.scale(1, H/W); g.translate(-W/2, -H/2);
        g.fillStyle = grad; g.fillRect(0, 0, W, W);
        g.restore();
        shadowTex = PIXI.Texture.from(c);

        for (const side of sides) {
            const s = new PIXI.Sprite(shadowTex);
            s.anchor.set(0.5, 0.5);
            s.visible = false;
            shadowLayer.addChild(s);
            nodes[side].shadow = s;
        }
    }

    function updateShadows() {
        for (const side of sides) {
            const n = nodes[side];
            const s = n.shadow;
            if (!s) continue;
            if (!n.box || !n.holder.visible) { s.visible = false; continue; }
            s.visible = true;
            const groundY = n.box.y + n.box.h;
            // 離地高度（正值＝在空中）。holder.y 已經含了衝刺與待機的垂直位移。
            const lift = Math.max(0, groundY - n.holder.y);
            const k = Math.min(1, lift / (n.box.h * 0.35));
            const base = n.box.w * 0.46 / 128;
            s.scale.set(base * (1 - k * 0.42), base * (1 - k * 0.42));
            s.alpha = (1 - k * 0.55) * n.holder.alpha;
            // 影子跟著角色水平移動，但**不跟著垂直移動** —— 它永遠貼在地上
            s.x = n.holder.x;
            s.y = groundY - n.box.h * 0.012;
            n.sprite.classList.add('pixi-shadow');   // 把 DOM 那顆影子藏起來
        }
    }

    // ===============================================================
    // #10 環境粒子
    // ===============================================================
    // 每一關的空氣感不同。全部共用同一張柔邊光點，靠 tint／運動／混合模式區分。
    //
    // blend 是**整個容器**的屬性（ParticleContainer 一個容器一種混合），
    // 所以換關卡時直接改容器的 blendMode —— 同一關裡的粒子風格本來就一致。
    //   add    ：會發光的（孢子光斑、螢火、火星）
    //   normal ：不該發光的（花瓣、落塵、暗霧）
    //
    // dir 決定出生位置：'top' 從上方落下、'bottom' 從下方升起、'all' 整個畫面隨機。
    const AMBIENT = {
        1: { name: '草原·花瓣', blend: 'normal', rate: 6,  dir: 'top',
             tints: [0xffd9ec, 0xffffff, 0xffe9b3], vy: [10, 24], vx: [-16, -4],
             size: [0.16, 0.4], life: [4, 7], spin: 2.2, sway: [6, 1.2] },
        2: { name: '森林·孢子', blend: 'add', rate: 5,  dir: 'bottom',
             tints: [0xd0ffd0, 0xffffff, 0xaaf0c0], vy: [-14, -5], vx: [-5, 5],
             size: [0.1, 0.26], life: [4, 7], spin: 0, sway: [5, 0.8], flicker: true },
        3: { name: '洞窟·落塵', blend: 'normal', rate: 7,  dir: 'top',
             tints: [0xcfd8dc, 0xb0bec5, 0xeceff1], vy: [6, 16], vx: [-4, 4],
             size: [0.08, 0.2], life: [5, 9], spin: 0, sway: [3, 0.5] },
        4: { name: '沼澤·螢火', blend: 'add', rate: 3,  dir: 'all',
             tints: [0xdcff8a, 0xffee58, 0xb2ff59], vy: [-6, 4], vx: [-6, 6],
             size: [0.12, 0.3], life: [3.5, 6], spin: 0, sway: [9, 1.6], flicker: true },
        5: { name: '火山·火星', blend: 'add', rate: 9,  dir: 'bottom',
             tints: [0xff7043, 0xffca28, 0xff3d00], vy: [-26, -10], vx: [-7, 7],
             size: [0.1, 0.3], life: [2.5, 4.5], spin: 0, sway: [4, 2.4], flicker: true },
        6: { name: '魔王城·灰燼', blend: 'normal', rate: 6,  dir: 'top',
             tints: [0x9575cd, 0x78909c, 0x5c6bc0], vy: [5, 14], vx: [-8, 2],
             size: [0.14, 0.38], life: [5, 9], spin: 1.2, sway: [7, 0.7] }
    };
    const AMBIENT_MAX = 140;             // 每層
    const layersA = {};
    let ambientStage = null, ambientAcc = 0;

    function initAmbient() {
        const area = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
        for (const key of ['back', 'front']) {
            const pc = new PIXI.ParticleContainer({
                texture: dotTexture, boundsArea: area.clone(),
                dynamicProperties: { vertex: true, position: true, rotation: true, uvs: false, color: true }
            });
            const items = [];
            for (let i = 0; i < AMBIENT_MAX; i++) {
                const p = new PIXI.Particle({ texture: dotTexture, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
                pc.addParticle(p);
                items.push({ p, life: 0, max: 1, vx: 0, vy: 0, spin: 0,
                             s0: 1, swayAmp: 0, swayFreq: 0, phase: 0, flicker: false, baseA: 1 });
            }
            (key === 'back' ? ambientBack : ambientFront).addChild(pc);
            layersA[key] = { pc, items, cursor: 0 };
        }
    }

    function rnd(r) { return r[0] + Math.random() * (r[1] - r[0]); }

    function spawnAmbient(cfg, initial) {
        const layer = Math.random() < 0.62 ? 'back' : 'front';
        const L = layersA[layer];
        // 找空位，找不到就跳過 —— 環境粒子不像打擊反饋，少一顆完全沒差，
        // 不值得為它搶掉一顆還亮著的
        let it = null;
        for (let i = 0; i < AMBIENT_MAX; i++) {
            const idx = (L.cursor + i) % AMBIENT_MAX;
            if (L.items[idx].life <= 0) { L.cursor = (idx + 1) % AMBIENT_MAX; it = L.items[idx]; break; }
        }
        if (!it) return;

        const W = app.screen.width, H = app.screen.height, U = u();
        let x, y;
        if (cfg.dir === 'top')       { x = Math.random() * W; y = initial ? Math.random() * H : -10; }
        else if (cfg.dir === 'bottom') { x = Math.random() * W; y = initial ? Math.random() * H : H + 10; }
        else                          { x = Math.random() * W; y = Math.random() * H; }

        const p = it.p;
        p.x = x; p.y = y;
        p.tint = cfg.tints[(Math.random() * cfg.tints.length) | 0];
        p.rotation = Math.random() * Math.PI * 2;
        it.life = it.max = rnd(cfg.life);
        // bvx/bvy 是「這顆粒子本來的飄移」。衝擊波會直接加速度到 vx/vy 上，
        // 之後再由 updateAmbient 慢慢拉回 bvx/bvy —— 沒有這組基準值的話，
        // 被吹一次就永遠回不來，整批粒子會被推出畫面外。
        it.vx = rnd(cfg.vx) * U * 0.5;
        it.vy = rnd(cfg.vy) * U * 0.5;
        it.bvx = it.vx; it.bvy = it.vy;
        it.spin = (Math.random() - 0.5) * cfg.spin;
        it.s0 = rnd(cfg.size) * U;
        it.swayAmp = cfg.sway[0] * U * 0.1;
        it.swayFreq = cfg.sway[1];
        it.phase = Math.random() * Math.PI * 2;
        it.flicker = !!cfg.flicker;
        it.baseA = 0.55 + Math.random() * 0.45;
        const k = it.s0 / 64;
        p.scaleX = k; p.scaleY = k;
        p.alpha = 0;
    }

    function updateAmbient(dt) {
        const stageNo = document.getElementById('battle-stage').dataset.stage || '1';
        const cfg = AMBIENT[stageNo] || AMBIENT[1];

        if (stageNo !== ambientStage) {
            ambientStage = stageNo;
            for (const k of ['back', 'front']) layersA[k].pc.blendMode = cfg.blend;
            // 換關時先鋪一批散在畫面各處的，否則要等好幾秒空氣才「有東西」
            for (let i = 0; i < 26; i++) spawnAmbient(cfg, true);
        }

        ambientAcc += cfg.rate * dt;
        while (ambientAcc >= 1) { ambientAcc -= 1; spawnAmbient(cfg, false); }

        const H = app.screen.height, W = app.screen.width;
        for (const key of ['back', 'front']) {
            for (const it of layersA[key].items) {
                if (it.life <= 0) continue;
                it.life -= dt;
                if (it.life <= 0) { it.p.alpha = 0; it.life = 0; continue; }
                const t = 1 - it.life / it.max;
                it.phase += it.swayFreq * dt;
                // 被衝擊波吹散之後，指數地拉回原本的飄移速度
                const relax = Math.min(1, dt * 2.2);
                it.vx += (it.bvx - it.vx) * relax;
                it.vy += (it.bvy - it.vy) * relax;
                it.p.x += (it.vx + Math.cos(it.phase) * it.swayAmp) * dt;
                it.p.y += it.vy * dt;
                it.p.rotation += it.spin * dt;
                // 頭尾各淡入淡出一段，粒子才不會在畫面中央憑空出現或消失
                let a = it.baseA * Math.min(1, t / 0.15) * Math.min(1, (1 - t) / 0.25);
                if (it.flicker) a *= 0.55 + 0.45 * Math.sin(it.phase * 3.1);
                it.p.alpha = Math.max(0, a);
                // 飄出畫面就直接回收
                if (it.p.y < -40 || it.p.y > H + 40 || it.p.x < -40 || it.p.x > W + 40) {
                    it.life = 0; it.p.alpha = 0;
                }
            }
        }
    }

    // ===============================================================
    // #7 蓄力詠唱
    // ===============================================================
    // 沒有技能系統，所以掛在**爆擊**上：擲到爆擊時，勇者出手前先聚一次能。
    // 這是唯一不動到時序就能演出「這一下不一樣」的位置 ——
    // strike() 一開始就知道是不是爆擊，而命中在 400ms 之後，中間有足夠的窗口。
    //
    // 兩個部分：粒子從四周往劍上收斂，以及 charge.webp 那道垂直光柱。
    // 光柱素材由 .claude/math-rpg-fx.sh 的 "slash2:charge:0" 產生（亮度轉 alpha），
    // 所以這裡只要設加亮混合，**不要**再做一次亮度轉透明。
    const CHARGE_IMG = "../assets/images/math-rpg/charge.webp";
    const CHARGE_MS = 240;
    let chargeSprite = null, chargeT = -1;

    function chargeFx(side) {
        if (!ready) return;
        const n = nodes[side];
        if (!n.box) return;
        const U = u();
        const c = centerOf(side);

        // 光柱
        const tex = PIXI.Assets.get(CHARGE_IMG);
        if (tex) {
            if (!chargeSprite) {
                chargeSprite = new PIXI.Sprite(tex);
                chargeSprite.anchor.set(0.5, 0.5);
                chargeSprite.blendMode = 'add';
                chargeLayer.addChild(chargeSprite);
            }
            chargeSprite.texture = tex;
            const h = n.box.h * 1.15;
            chargeSprite.scale.set(h / tex.height);
            chargeSprite.position.set(c.x, n.box.y + n.box.h - h * 0.42);
            chargeSprite.alpha = 0;
            chargeSprite.visible = true;
            chargeT = 0;
        }

        // 收斂粒子：從外圈往中心飛，壽命剛好在抵達時結束
        for (let i = 0; i < 44; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = (5 + Math.random() * 5) * U;
            const life = 0.16 + Math.random() * 0.14;
            emit('front', {
                x: c.x + Math.cos(ang) * r,
                y: c.y + Math.sin(ang) * r * 0.8,
                vx: -Math.cos(ang) * r / life,
                vy: -Math.sin(ang) * r * 0.8 / life,
                life,
                size: (0.12 + Math.random() * 0.3) * U, size1: 0.02 * U,
                tint: [0xffffff, 0xfff59d, 0x80d8ff][i % 3],
                rotation: ang, stretch: 2 + Math.random() * 2
            });
        }
    }

    function updateCharge(dt) {
        if (chargeT < 0 || !chargeSprite) return;
        chargeT += dt;
        const t = chargeT / (CHARGE_MS / 1000);
        if (t >= 1) { chargeT = -1; chargeSprite.visible = false; return; }
        // 前 45% 亮起來、之後收掉；同時往上抽長一點，像能量被吸進劍裡
        chargeSprite.alpha = t < 0.45 ? (t / 0.45) : (1 - (t - 0.45) / 0.55);
        chargeSprite.scale.y = chargeSprite.scale.x * (0.9 + t * 0.35);
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
        // ParticleContainer 的 boundsArea 沒跟著更新的話，視窗變大後
        // 超出舊範圍的粒子會被 culling 判定為不可見而整批消失
        for (const k of ["back", "front"]) {
            if (layersP[k]) layersP[k].pc.boundsArea = new PIXI.Rectangle(0, 0, w, h);
            if (layersA[k]) layersA[k].pc.boundsArea = new PIXI.Rectangle(0, 0, w, h);
        }
        if (dustPC) dustPC.boundsArea = new PIXI.Rectangle(0, 0, w, h);
        layoutBackground();
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
            autoDensity: true,
            // **一定要鎖 webgl。** 衝擊波與色差是自己寫的 GLSL 著色器（只給了 gl 版本，
            // 沒寫 WGSL），autoDetect 在新版 Chrome 上可能挑到 WebGPU，那兩個特效就會整個失效。
            preference: 'webgl'
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

        // ---- 場景分層 ----
        // 粒子分成「角色之前」與「角色之後」，這就是第 8 項（角色搬進 Pixi）換來的東西：
        // 碎片可以繞到角色背後再從前面飛出來。
        // 只把 Pixi 當疊加層的話，粒子永遠只能整批在角色的前面或後面。
        //
        // 由遠到近：
        bgLayer      = new PIXI.Container();   // #9  場景背景（會做視差）
        ambientBack  = new PIXI.Container();   // #10 環境粒子·遠景
        shadowLayer  = new PIXI.Container();   // #11 地面陰影
        fxBack       = new PIXI.Container();   //     戰鬥粒子·角色後
        chars        = new PIXI.Container();   // #8  角色
        shatter      = new PIXI.Container();   // #5  死亡碎片（角色貼圖的切片，不是粒子）
        chargeLayer  = new PIXI.Container();   // #7  蓄力光柱（加亮，疊在角色身上）
        fxFront      = new PIXI.Container();   //     戰鬥粒子·角色前
        ambientFront = new PIXI.Container();   // #10 環境粒子·近景
        app.stage.addChild(bgLayer, ambientBack, shadowLayer, fxBack,
                           chars, shatter, chargeLayer, fxFront, ambientFront);

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
            chars.addChild(holder);
            nodes[side] = { sprite, body, holder, pixi, box: null, texKey: null, filterCss: null,
                            hurtAnim: null, dieAnim: null, afterAt: 0 };
        }

        initParticles();
        initDust();
        initAmbient();
        initFilters();
        initBackground();
        initWipe();
        initWhiteFilter();
        initShadows();

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
        releaseHitstop();          // 別把 CSS 動畫留在暫停狀態
        if (ro) { ro.disconnect(); ro = null; }
        enabled = false;
        ready = false;
    }

    // ===============================================================
    // 對外：由 math-rpg.js 的 strike() 在命中的那一刻呼叫
    // ===============================================================
    // 一次呼叫把「爆散 + 衝擊波 +（爆擊時）光束/色差/頓幀」全部做掉。
    // 拆成好幾個 API 讓呼叫端自己組合的話，時序會散在兩個檔案裡，很難對齊。
    function impactFx(defender, opts = {}) {
        if (!ready) return;
        const crit = !!opts.crit;
        burst(defender, {
            count: crit ? 170 : 105,
            tint: opts.tint != null ? opts.tint : (defender === 'enemy' ? 0xffd54f : 0xff8a80),
            power: crit ? 1.35 : 1
        });
        shockwave(defender);
        if (crit) critFx(defender);
    }

    return {
        init,
        disable,
        isReady: () => ready,
        impactFx,
        chargeFx,
        burst,
        clearGray,
        setBattleState,
        healFx,
        reset,
        get app() { return app; },
        // 除錯用：在 console 打 MathRpgPixi.stats() 看有沒有正常在畫
        stats() {
            if (!ready) return { ready: false, enabled };
            let live = 0;
            for (const k of ['back', 'front']) live += layersP[k].items.filter(i => i.life > 0).length;
            return {
                ready, fps: +app.ticker.FPS.toFixed(1),
                renderer: app.renderer.name,
                粒子: live, 碎片: shards.length, 殘影: afterimages.length,
                全螢幕濾鏡: app.stage.filters ? app.stage.filters.length : 0,
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
