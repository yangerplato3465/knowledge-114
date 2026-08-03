import {
    Application, Container, Graphics, Rectangle
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import {
    W, H, COL, mkText, mkButton, panelBase, drawProps, preloadImages
} from './detective-ui.js';
import { PUZZLES } from './detective-puzzles.js';

// ============================================================
// 偵探事件簿 · 點擊解謎引擎（Pixi.js v8）
// 案件資料由 assets/js/detective-case-owl.js 先載入，掛在 window.DETECTIVE_CASE。
// 畫面用固定的 960 × 600 設計尺寸畫，再整個縮放置中到容器裡，
// 這樣熱點座標永遠對得上，換成正式美術素材時也不用重寫。
// 圖層：scene（場景）→ hot（熱點）→ hud（固定介面）→ overlay（面板）
// ============================================================

const CASE = window.DETECTIVE_CASE;
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
app.stage.eventMode = 'static';              // 濾鏡謎題要靠 stage 收拖曳事件
await document.fonts.ready;                  // 等中文字型載好再畫文字
await preloadImages(CASE);                   // 有正式素材才會載，缺圖不影響
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
    clues: [],
    items: [],
    examined: new Set(),
    solved: false,
};

const clueById = id => CASE.clues.find(c => c.id === id);
const itemById = id => CASE.items.find(i => i.id === id);
const hasClue = id => state.clues.includes(id);
const hasItem = id => state.items.includes(id);

// ============================================================
// HUD
// ============================================================
hudLayer.addChild(new Graphics().rect(0, 0, W, 54).fill({ color: COL.bar, alpha: 0.92 }));

const titleText = mkText(`🔍 ${CASE.title}`, 19, 0xfff6e9, { weight: '700' });
titleText.anchor.set(0, 0.5);
titleText.position.set(22, 27);
hudLayer.addChild(titleText);

// 道具格
const itemSlot = new Container();
itemSlot.position.set(536, 10);
itemSlot.addChild(new Graphics().roundRect(0, 0, 104, 34, 17).fill({ color: 0x574c42 }));
const itemLabel = mkText('', 15, 0xfff6e9);
itemLabel.anchor.set(0.5);
itemLabel.position.set(52, 17);
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
    label: '', x: 656, y: 10, w: 134, h: 34,
    color: 0x574c42, textColor: 0xfff6e9, onClick: showNotebook,
});
const accuseBtn = mkButton({
    label: '🕵️ 指認犯人', x: 802, y: 10, w: 138, h: 34, onClick: showAccuse,
});
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
const dlgText = mkText('', 18, COL.ink, { wrap: 848, lineHeight: 29 });
dlgText.position.set(52, 468);
hudLayer.addChild(dlgText);

const say = text => { dlgText.text = text; };

function setSceneTag(name) {
    sceneTagText.text = name;
    sceneTagBg.clear()
        .roundRect(0, 0, sceneTagText.width + 32, 36, 18)
        .fill({ color: COL.panel, alpha: 0.92 })
        .stroke({ width: 3, color: COL.border });
}

function refreshHud() {
    clueBtn.setLabel(`🔎 線索 ${state.clues.length}/${CASE.clues.length}`);
    accuseBtn.setLocked(state.clues.length < CASE.clues.length && !state.solved);
    if (state.items.length) {
        const it = itemById(state.items[0]);
        itemLabel.text = `${it.icon} ${it.name}`;
        itemSlot.visible = true;
    }
}

// ============================================================
// 場景與熱點
// ============================================================
const pulses = [];

function renderScene(id) {
    state.scene = id;
    const scene = CASE.scenes[id];

    sceneLayer.removeChildren();
    drawProps(scene.bg ? [{ t: 'img', src: scene.bg, x: 0, y: 0, w: W, h: H }, ...scene.props] : scene.props, sceneLayer);
    setSceneTag(scene.name);
    renderHotspots();
    say(scene.intro || '點擊場景中的東西開始調查。');
}

function renderHotspots() {
    hotLayer.removeChildren();
    pulses.length = 0;
    for (const h of CASE.scenes[state.scene].hotspots) hotLayer.addChild(makeHotspot(h));
}

function makeHotspot(h) {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new Rectangle(h.x, h.y, h.w, h.h);

    const outline = new Graphics()
        .roundRect(h.x - 4, h.y - 4, h.w + 8, h.h + 8, 14)
        .stroke({ width: 4, color: COL.hint });
    outline.alpha = 0;
    c.addChild(outline);

    const lt = mkText(h.name, 16, COL.ink, { weight: '700' });
    lt.position.set(14, 7);
    const label = new Container();
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
        // 出口一直看得到
        const arrow = mkText(h.dir === 'left' ? '⬅️' : '➡️', 40, 0xffffff);
        arrow.anchor.set(0.5);
        arrow.position.set(h.x + h.w / 2, h.y + h.h / 2);
        c.addChild(arrow);
        label.alpha = 0.95;
    } else if (!state.examined.has(h.id)) {
        // 還沒查過的東西閃一下
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
    if (overlayLayer.children.length) return;          // 面板打開時先不理場景

    // 需要某條線索才知道要做什麼
    if (h.needsClue && !hasClue(h.needsClue) && !state.examined.has(h.id)) {
        say(h.lockedClue || '你還不知道該從哪裡下手。');
        return;
    }
    // 需要道具
    if (h.requires && !hasItem(h.requires)) {
        say(h.locked || '這裡打不開。');
        return;
    }
    if (h.goto) { transitionTo(h.goto); return; }

    // 謎題：解開才算調查完成
    if (h.puzzle && !state.examined.has(h.id)) {
        say(h.look);
        openPuzzle(h);
        return;
    }
    if (state.examined.has(h.id)) {
        say(h.after || h.look);
        return;
    }
    award(h, h.look);
}

function award(h, text) {
    state.examined.add(h.id);
    let msg = text;

    if (h.givesItem && !hasItem(h.givesItem)) {
        state.items.push(h.givesItem);
        const it = itemById(h.givesItem);
        msg += `\n🎒 取得道具：${it.icon} ${it.name}`;
    }
    for (const id of [].concat(h.gives || [])) {
        if (hasClue(id)) continue;
        state.clues.push(id);
        const cl = clueById(id);
        msg += `\n📌 新線索：${cl.icon} ${cl.name}（${state.clues.length}/${CASE.clues.length}）`;
    }

    say(msg);
    refreshHud();
    renderHotspots();

    if (state.clues.length === CASE.clues.length && !state.solved) {
        setTimeout(() => say('線索蒐集完成！點右上角的「🕵️ 指認犯人」說出你的推理。'), 3000);
    }
}

// 換場景的淡入淡出
const fader = new Graphics().rect(0, 0, W, H).fill({ color: 0x2b2320 });
fader.alpha = 0;
fader.eventMode = 'none';
root.addChild(fader);

function transitionTo(id) {
    let t = 0, switched = false;
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
// 覆蓋面板（謎題 / 筆記 / 指認 / 結局）
// ============================================================
let panelCleanup = null;

function openPanel(builder) {
    closePanel();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: 0x2b2320, alpha: 0.58 });
    dim.eventMode = 'static';
    overlayLayer.addChild(dim);
    const panel = new Container();
    overlayLayer.addChild(panel);
    builder(panel);
}

function closePanel() {
    if (panelCleanup) { panelCleanup(); panelCleanup = null; }
    overlayLayer.removeChildren();
}

function openPuzzle(h) {
    const cfg = h.puzzle;
    openPanel(panel => {
        const box = panelBase(panel, { title: cfg.title });
        const ctx = { app, root, say };
        panelCleanup = PUZZLES[cfg.type](ctx, panel, box, cfg, () => {
            closePanel();
            award(h, h.solvedText || h.look);
        }) || null;
        panel.addChild(mkButton({
            label: '稍後再解', x: box.x + box.w - 130, y: box.y + 14, w: 110, h: 32,
            size: 14, color: COL.border, textColor: COL.ink, onClick: closePanel,
        }));
    });
}

function showNotebook() {
    openPanel(panel => {
        const box = panelBase(panel, { title: '📓 偵探筆記' });
        if (!state.clues.length) {
            const empty = mkText('還沒有任何線索，回場景裡點點看吧！', 18, COL.muted);
            empty.anchor.set(0.5);
            empty.position.set(box.cx, box.y + 200);
            panel.addChild(empty);
        }
        state.clues.forEach((id, i) => {
            const cl = clueById(id);
            const y = box.y + 74 + i * 54;
            panel.addChild(
                new Graphics().roundRect(box.x + 30, y, box.w - 60, 48, 12)
                    .fill({ color: COL.panel2 }).stroke({ width: 2, color: COL.border })
            );
            const icon = mkText(cl.icon, 20, 0xffffff);
            icon.anchor.set(0.5);
            icon.position.set(box.x + 60, y + 24);
            const name = mkText(cl.name, 16, COL.ink, { weight: '700' });
            name.position.set(box.x + 84, y + 5);
            const desc = mkText(cl.desc, 13, COL.muted, { wrap: box.w - 150 });
            desc.position.set(box.x + 84, y + 26);
            panel.addChild(icon, name, desc);
        });
        panel.addChild(mkButton({
            label: '關閉', x: box.cx - 70, y: box.y + box.h - 54, w: 140, h: 40,
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
        const box = panelBase(panel, { title: '🕵️ 誰帶走了黃金貓頭鷹？' });
        const tip = mkText('想一想筆記裡的線索，點選你認為的犯人。', 16, COL.muted);
        tip.anchor.set(0.5, 0);
        tip.position.set(box.cx, box.y + 64);
        panel.addChild(tip);

        CASE.suspects.forEach((s, i) => {
            const cw = 180, chh = 230;
            const cx = box.x + 40 + i * (cw + 30);
            const cy = box.y + 108;
            const card = new Container();
            const bg = new Graphics();
            const paint = color => bg.clear().roundRect(cx, cy, cw, chh, 20)
                .fill({ color: COL.panel2 }).stroke({ width: 3, color });
            paint(COL.border);
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
            card.on('pointerover', () => paint(COL.gold));
            card.on('pointerout', () => paint(COL.border));
            card.on('pointertap', () => accuse(s));
            panel.addChild(card);
        });

        panel.addChild(mkButton({
            label: '再想一下', x: box.cx - 70, y: box.y + box.h - 52, w: 140, h: 38,
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
        const body = mkText(CASE.solution, 15, COL.ink, { wrap: box.w - 76, lineHeight: 25 });
        body.position.set(box.x + 38, box.y + 66);
        panel.addChild(body);
        panel.addChild(mkButton({
            label: '🔁 再查一次', x: box.x + 116, y: box.y + box.h - 60, w: 180, h: 44,
            onClick: () => location.reload(),
        }));
        panel.addChild(mkButton({
            label: '🏠 回學習主頁', x: box.x + 330, y: box.y + box.h - 60, w: 180, h: 44,
            color: COL.mint, textColor: 0xffffff,
            onClick: () => { location.href = '../index.html'; },
        }));
    });
}

function showBrief() {
    openPanel(panel => {
        const box = panelBase(panel, { y: 96, h: 408, title: CASE.title });
        const body = mkText(CASE.brief, 17, COL.ink, { wrap: box.w - 90, lineHeight: 30, align: 'center' });
        body.anchor.set(0.5, 0);
        body.position.set(box.cx, box.y + 78);
        panel.addChild(body);
        panel.addChild(mkButton({
            label: '開始調查', x: box.cx - 90, y: box.y + box.h - 76, w: 180, h: 48,
            size: 18, onClick: closePanel,
        }));
    });
}

renderScene(CASE.startScene);
refreshHud();
showBrief();
