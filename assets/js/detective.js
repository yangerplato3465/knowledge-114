import {
    Application, Container, Graphics, Rectangle, Text
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';

// ============================================================
// 偵探事件簿 · 點擊解謎引擎（Pixi.js v8）
// 案件資料由 assets/js/detective-case1.js 先載入，掛在 window.DETECTIVE_CASE。
// 畫面用固定的 960 × 600 設計尺寸畫，再整個縮放置中到容器裡，
// 這樣熱點座標永遠對得上，不用管視窗多大。
// 圖層：scene（場景美術）→ hot（熱點）→ hud（固定介面）→ overlay（筆記／指認／結局）
// ============================================================

const CASE = window.DETECTIVE_CASE;
const W = 960, H = 600;
const FONT = "'Noto Sans TC', 'Fredoka', sans-serif";

const COL = {
    panel: 0xfffdf9,
    border: 0xe4d9cd,
    ink: 0x4a3f35,
    muted: 0x8a7b6d,
    bar: 0x3f3730,
    gold: 0xf0b429,
    mint: 0x7fbf9a,
    hint: 0xffd166,
};

const container = document.getElementById('gameContainer');

// ---- 建立 Pixi 應用 ----
const app = new Application();
await app.init({
    resizeTo: container,
    background: getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#f0e6df',
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
await document.fonts.ready;                 // 等中文字型載好再畫文字
document.getElementById('gameLoading')?.remove();
container.appendChild(app.canvas);

// ---- 圖層 ----
const root = new Container();
const sceneLayer = new Container();
const hotLayer = new Container();
const hudLayer = new Container();
const overlayLayer = new Container();
root.addChild(sceneLayer, hotLayer, hudLayer, overlayLayer);
app.stage.addChild(root);

function layout() {
    const s = Math.min(app.screen.width / W, app.screen.height / H);
    root.scale.set(s);
    root.position.set((app.screen.width - W * s) / 2, (app.screen.height - H * s) / 2);
}
app.renderer.on('resize', layout);
layout();

// ---- 遊戲狀態 ----
const state = {
    scene: null,
    clues: [],          // 已蒐集的線索 id
    items: [],          // 已取得的道具 id
    examined: new Set(),// 已調查過的熱點 id
    solved: false,
};

const clueById = id => CASE.clues.find(c => c.id === id);
const itemById = id => CASE.items.find(i => i.id === id);

// ============================================================
// 小工具
// ============================================================
function mkText(str, size, color, opt = {}) {
    return new Text({
        text: str,
        style: {
            fontFamily: FONT,
            fontSize: size,
            fill: color,
            fontWeight: opt.weight || '400',
            align: opt.align || 'left',
            wordWrap: !!opt.wrap,
            wordWrapWidth: opt.wrap || 0,
            breakWords: true,               // 中文沒有空格，要靠這個換行
            lineHeight: opt.lineHeight || Math.round(size * 1.6),
        },
    });
}

function mkButton({ label, x, y, w, h, color = COL.gold, textColor = COL.bar, size = 16, onClick }) {
    const c = new Container();
    c.position.set(x, y);
    c.addChild(new Graphics().roundRect(0, 0, w, h, h / 2).fill({ color }));
    const t = mkText(label, size, textColor, { weight: '700' });
    t.anchor.set(0.5);
    t.position.set(w / 2, h / 2);
    c.addChild(t);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerover', () => { if (!c.locked) c.alpha = 0.85; });
    c.on('pointerout', () => { c.alpha = c.locked ? 0.45 : 1; });
    c.on('pointertap', () => onClick && onClick());
    c.setLocked = v => {
        c.locked = v;
        c.alpha = v ? 0.45 : 1;
        c.cursor = v ? 'default' : 'pointer';
    };
    return c;
}

function drawProps(list, layer) {
    for (const p of list) {
        let node;
        switch (p.t) {
            case 'rect': {
                const g = new Graphics();
                p.r ? g.roundRect(p.x, p.y, p.w, p.h, p.r) : g.rect(p.x, p.y, p.w, p.h);
                g.fill({ color: p.c, alpha: p.a ?? 1 });
                if (p.s) g.stroke({ width: p.sw ?? 3, color: p.s });
                node = g;
                break;
            }
            case 'circle':
                node = new Graphics().circle(p.x, p.y, p.rad).fill({ color: p.c, alpha: p.a ?? 1 });
                if (p.s) node.stroke({ width: p.sw ?? 3, color: p.s });
                break;
            case 'ellipse':
                node = new Graphics().ellipse(p.x, p.y, p.rx, p.ry).fill({ color: p.c, alpha: p.a ?? 1 });
                break;
            case 'poly':
                node = new Graphics().poly(p.pts).fill({ color: p.c, alpha: p.a ?? 1 });
                break;
            case 'line': {
                const g = new Graphics().moveTo(p.pts[0], p.pts[1]);
                for (let i = 2; i < p.pts.length; i += 2) g.lineTo(p.pts[i], p.pts[i + 1]);
                node = g.stroke({ width: p.w ?? 3, color: p.c, cap: 'round' });
                break;
            }
            case 'emoji':
                node = mkText(p.s, p.size, 0xffffff);
                node.anchor.set(0.5);
                node.position.set(p.x, p.y);
                if (p.rot) node.rotation = p.rot;
                if (p.a != null) node.alpha = p.a;
                break;
            case 'text':
                node = mkText(p.s, p.size, p.c, { weight: p.weight });
                node.anchor.set(p.ax ?? 0, p.ay ?? 0);
                node.position.set(p.x, p.y);
                break;
        }
        if (node) layer.addChild(node);
    }
}

// ============================================================
// HUD（上方工具列 + 下方對話框）
// ============================================================
hudLayer.addChild(new Graphics().rect(0, 0, W, 54).fill({ color: COL.bar, alpha: 0.92 }));

const titleText = mkText(`🔍 ${CASE.title}`, 20, 0xfff6e9, { weight: '700' });
titleText.anchor.set(0, 0.5);
titleText.position.set(22, 27);
hudLayer.addChild(titleText);

// 道具格（拿到才顯示）
const itemSlot = new Container();
itemSlot.position.set(556, 10);
itemSlot.addChild(new Graphics().roundRect(0, 0, 88, 34, 17).fill({ color: 0x574c42 }));
const itemLabel = mkText('', 16, 0xfff6e9);
itemLabel.anchor.set(0.5);
itemLabel.position.set(44, 17);
itemSlot.addChild(itemLabel);
itemSlot.visible = false;
itemSlot.eventMode = 'static';
itemSlot.cursor = 'pointer';
itemSlot.on('pointertap', () => {
    const it = itemById(state.items[0]);
    if (it) say(`${it.icon} ${it.name}：${it.desc}`);
});
hudLayer.addChild(itemSlot);

const clueBtn = mkButton({
    label: '🔎 線索 0/6', x: 656, y: 10, w: 134, h: 34,
    color: 0x574c42, textColor: 0xfff6e9, onClick: showNotebook,
});
const accuseBtn = mkButton({
    label: '🕵️ 指認犯人', x: 802, y: 10, w: 138, h: 34,
    onClick: showAccuse,
});
accuseBtn.setLocked(true);
hudLayer.addChild(clueBtn, accuseBtn);

// 場景名牌
const sceneTag = new Container();
sceneTag.position.set(22, 68);
const sceneTagBg = new Graphics();
const sceneTagText = mkText('', 16, COL.ink, { weight: '700' });
sceneTagText.position.set(16, 8);
sceneTag.addChild(sceneTagBg, sceneTagText);
hudLayer.addChild(sceneTag);

// 對話框
hudLayer.addChild(
    new Graphics().roundRect(30, 452, 900, 130, 22)
        .fill({ color: COL.panel }).stroke({ width: 4, color: COL.border })
);
const dlgText = mkText('', 19, COL.ink, { wrap: 840, lineHeight: 31 });
dlgText.position.set(54, 470);
hudLayer.addChild(dlgText);

function say(text) {
    dlgText.text = text;
}

function setSceneTag(name) {
    sceneTagText.text = name;
    sceneTagBg.clear()
        .roundRect(0, 0, sceneTagText.width + 32, 36, 18)
        .fill({ color: COL.panel, alpha: 0.92 })
        .stroke({ width: 3, color: COL.border });
}

function refreshHud() {
    clueBtn.children[1].text = `🔎 線索 ${state.clues.length}/${CASE.clues.length}`;
    const ready = state.clues.length >= CASE.clues.length;
    accuseBtn.setLocked(!ready && !state.solved);
    if (state.items.length) {
        const it = itemById(state.items[0]);
        itemLabel.text = `${it.icon} ${it.name.slice(0, 3)}`;
        itemSlot.visible = true;
    }
}

// ============================================================
// 場景與熱點
// ============================================================
const pulses = [];   // 尚未調查的熱點提示光點

function renderScene(id) {
    state.scene = id;
    const scene = CASE.scenes[id];

    sceneLayer.removeChildren();
    hotLayer.removeChildren();
    pulses.length = 0;

    drawProps(scene.props, sceneLayer);
    setSceneTag(scene.name);

    for (const h of scene.hotspots) hotLayer.addChild(makeHotspot(h));

    say(scene.intro || '點擊場景中的東西開始調查。');
}

function makeHotspot(h) {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new Rectangle(h.x, h.y, h.w, h.h);

    // 滑鼠移過去時的外框
    const outline = new Graphics()
        .roundRect(h.x - 4, h.y - 4, h.w + 8, h.h + 8, 14)
        .stroke({ width: 4, color: COL.hint });
    outline.alpha = 0;
    c.addChild(outline);

    // 名稱標籤
    const label = new Container();
    const lt = mkText(h.name, 16, COL.ink, { weight: '700' });
    lt.position.set(14, 7);
    label.addChild(
        new Graphics().roundRect(0, 0, lt.width + 28, 34, 17)
            .fill({ color: COL.panel }).stroke({ width: 3, color: COL.border }),
        lt
    );
    label.position.set(
        Math.min(Math.max(h.x + h.w / 2 - (lt.width + 28) / 2, 8), W - lt.width - 36),
        Math.max(h.y - 44, 60)
    );
    label.alpha = 0;
    c.addChild(label);

    if (h.exit) {
        // 出口一直看得到：箭頭 + 名稱
        const arrow = mkText(h.dir === 'left' ? '⬅️' : '➡️', 40, 0xffffff);
        arrow.anchor.set(0.5);
        arrow.position.set(h.x + h.w / 2, h.y + h.h / 2);
        c.addChild(arrow);
        label.alpha = 0.95;
    } else if (!state.examined.has(h.id)) {
        // 還沒調查過的東西閃一下，提示可以點
        const dot = new Graphics().circle(0, 0, 7).fill({ color: COL.hint });
        dot.position.set(h.x + h.w - 10, h.y + 12);
        c.addChild(dot);
        pulses.push(dot);
    }

    c.on('pointerover', () => { outline.alpha = 1; label.alpha = 1; });
    c.on('pointerout', () => { outline.alpha = 0; label.alpha = h.exit ? 0.95 : 0; });
    c.on('pointertap', () => onHotspot(h));
    return c;
}

function onHotspot(h) {
    if (overlayLayer.children.length) return;   // 有面板打開時先不理場景

    if (h.goto) {
        transitionTo(h.goto);
        return;
    }

    // 需要道具卻還沒拿到
    if (h.requires && !state.items.includes(h.requires) && !state.examined.has(h.id)) {
        say(h.locked || '這裡打不開。');
        return;
    }

    if (state.examined.has(h.id)) {
        say(h.after || h.look);
        return;
    }

    state.examined.add(h.id);
    let text = h.look;

    if (h.givesItem && !state.items.includes(h.givesItem)) {
        state.items.push(h.givesItem);
        const it = itemById(h.givesItem);
        text += `\n🎒 取得道具：${it.icon} ${it.name}`;
    }
    if (h.gives && !state.clues.includes(h.gives)) {
        state.clues.push(h.gives);
        const cl = clueById(h.gives);
        text += `\n📌 新線索：${cl.icon} ${cl.name}（${state.clues.length}/${CASE.clues.length}）`;
    }

    say(text);
    refreshHud();

    if (state.clues.length === CASE.clues.length && !state.solved) {
        setTimeout(() => say('線索蒐集完成！點右上角的「🕵️ 指認犯人」說出你的推理。'), 2600);
    }

    // 這個熱點的提示光點可以收掉了
    renderHotspotsOnly();
}

function renderHotspotsOnly() {
    hotLayer.removeChildren();
    pulses.length = 0;
    for (const h of CASE.scenes[state.scene].hotspots) hotLayer.addChild(makeHotspot(h));
}

// 換場景時的淡入淡出
const fader = new Graphics().rect(0, 0, W, H).fill({ color: 0x2b2320 });
fader.alpha = 0;
fader.eventMode = 'none';
root.addChild(fader);

function transitionTo(id) {
    let t = 0;
    let switched = false;
    const tick = ticker => {
        t += ticker.deltaMS;
        if (t < 200) {
            fader.alpha = t / 200;
        } else if (!switched) {
            switched = true;
            renderScene(id);
        } else if (t < 400) {
            fader.alpha = 1 - (t - 200) / 200;
        } else {
            fader.alpha = 0;
            app.ticker.remove(tick);
        }
    };
    app.ticker.add(tick);
}

// 提示光點的呼吸效果
app.ticker.add(() => {
    const a = 0.35 + 0.45 * (1 + Math.sin(performance.now() / 320)) / 2;
    for (const d of pulses) d.alpha = a;
});

// ============================================================
// 覆蓋面板（偵探筆記 / 指認 / 結局）
// ============================================================
function openPanel(builder) {
    overlayLayer.removeChildren();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: 0x2b2320, alpha: 0.58 });
    dim.eventMode = 'static';                 // 擋住底下的點擊
    overlayLayer.addChild(dim);
    const panel = new Container();
    overlayLayer.addChild(panel);
    builder(panel);
}

function closePanel() {
    overlayLayer.removeChildren();
}

function panelBase(panel, { x = 140, y = 64, w = 680, h = 472, title }) {
    panel.addChild(
        new Graphics().roundRect(x, y, w, h, 28)
            .fill({ color: COL.panel }).stroke({ width: 6, color: COL.border })
    );
    const t = mkText(title, 26, COL.ink, { weight: '700' });
    t.anchor.set(0.5, 0);
    t.position.set(x + w / 2, y + 26);
    panel.addChild(t);
    return { x, y, w, h };
}

function showNotebook() {
    openPanel(panel => {
        const box = panelBase(panel, { title: '📓 偵探筆記' });
        if (!state.clues.length) {
            const empty = mkText('還沒有任何線索，回場景裡點點看吧！', 18, COL.muted);
            empty.anchor.set(0.5);
            empty.position.set(box.x + box.w / 2, box.y + 200);
            panel.addChild(empty);
        }
        state.clues.forEach((id, i) => {
            const cl = clueById(id);
            const y = box.y + 86 + i * 62;
            panel.addChild(
                new Graphics().roundRect(box.x + 30, y, box.w - 60, 54, 14)
                    .fill({ color: 0xfaf3ea }).stroke({ width: 2, color: COL.border })
            );
            const icon = mkText(cl.icon, 22, 0xffffff);
            icon.anchor.set(0.5);
            icon.position.set(box.x + 62, y + 27);
            const name = mkText(cl.name, 17, COL.ink, { weight: '700' });
            name.position.set(box.x + 86, y + 8);
            const desc = mkText(cl.desc, 13, COL.muted, { wrap: box.w - 150 });
            desc.position.set(box.x + 86, y + 31);
            panel.addChild(icon, name, desc);
        });
        panel.addChild(mkButton({
            label: '關閉', x: box.x + box.w / 2 - 70, y: box.y + box.h - 56, w: 140, h: 40,
            color: COL.border, textColor: COL.ink, onClick: closePanel,
        }));
    });
}

function showAccuse() {
    if (state.solved) { showEnding(); return; }
    if (state.clues.length < CASE.clues.length) {
        say(`線索還不夠（${state.clues.length}/${CASE.clues.length}），再找找看吧！`);
        return;
    }
    openPanel(panel => {
        const box = panelBase(panel, { title: '🕵️ 誰拿走了獎盃？' });
        const tip = mkText('想一想你的線索，點選你認為的犯人。', 16, COL.muted);
        tip.anchor.set(0.5, 0);
        tip.position.set(box.x + box.w / 2, box.y + 66);
        panel.addChild(tip);

        CASE.suspects.forEach((s, i) => {
            const cw = 180, ch = 230;
            const cx = box.x + 40 + i * (cw + 30);
            const cy = box.y + 110;
            const card = new Container();
            const bg = new Graphics().roundRect(cx, cy, cw, ch, 20)
                .fill({ color: 0xfaf3ea }).stroke({ width: 3, color: COL.border });
            const face = mkText(s.emoji, 62, 0xffffff);
            face.anchor.set(0.5);
            face.position.set(cx + cw / 2, cy + 74);
            const name = mkText(s.name, 20, COL.ink, { weight: '700' });
            name.anchor.set(0.5);
            name.position.set(cx + cw / 2, cy + 146);
            const role = mkText(s.role, 14, COL.muted);
            role.anchor.set(0.5);
            role.position.set(cx + cw / 2, cy + 176);
            card.addChild(bg, face, name, role);
            card.eventMode = 'static';
            card.cursor = 'pointer';
            const paint = color => bg.clear().roundRect(cx, cy, cw, ch, 20)
                .fill({ color: 0xfaf3ea }).stroke({ width: 3, color });
            card.on('pointerover', () => paint(COL.gold));
            card.on('pointerout', () => paint(COL.border));
            card.on('pointertap', () => accuse(s));
            panel.addChild(card);
        });

        panel.addChild(mkButton({
            label: '再想一下', x: box.x + box.w / 2 - 70, y: box.y + box.h - 52, w: 140, h: 38,
            color: COL.border, textColor: COL.ink, onClick: closePanel,
        }));
    });
}

function accuse(s) {
    if (s.id === CASE.culprit) {
        state.solved = true;
        showEnding();
    } else {
        closePanel();
        say(`❌ 不對喔 —— ${s.wrong}`);
    }
}

function showEnding() {
    openPanel(panel => {
        const box = panelBase(panel, { title: '🎉 案件偵破！' });
        const body = mkText(CASE.solution, 17, COL.ink, { wrap: box.w - 80, lineHeight: 29 });
        body.position.set(box.x + 40, box.y + 76);
        panel.addChild(body);
        panel.addChild(mkButton({
            label: '🔁 再查一次', x: box.x + 116, y: box.y + box.h - 62, w: 180, h: 44,
            onClick: () => location.reload(),
        }));
        panel.addChild(mkButton({
            label: '🏠 回學習主頁', x: box.x + 330, y: box.y + box.h - 62, w: 180, h: 44,
            color: COL.mint, textColor: 0xffffff,
            onClick: () => { location.href = '../index.html'; },
        }));
    });
}

// ============================================================
// 開場
// ============================================================
function showBrief() {
    openPanel(panel => {
        const box = panelBase(panel, { y: 110, h: 380, title: CASE.title });
        const body = mkText(CASE.brief, 18, COL.ink, { wrap: box.w - 90, lineHeight: 32, align: 'center' });
        body.anchor.set(0.5, 0);
        body.position.set(box.x + box.w / 2, box.y + 92);
        panel.addChild(body);
        panel.addChild(mkButton({
            label: '開始調查', x: box.x + box.w / 2 - 90, y: box.y + box.h - 78, w: 180, h: 48,
            size: 18, onClick: closePanel,
        }));
    });
}

renderScene(CASE.startScene);
refreshHud();
showBrief();
