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
globalThis.__PIXI_APP__ = app;               // Pixi Devtools 的標準掛勾，方便除錯
app.stage.eventMode = 'static';              // 濾鏡謎題要靠 stage 收拖曳事件
await document.fonts.ready;                  // 等中文字型載好再畫文字
await preloadImages(CASE);                   // 有正式素材才會載，缺圖不影響
document.getElementById('gameLoading')?.remove();
container.appendChild(app.canvas);

// ---- 圖層 ----
const root = new Container();
const sceneLayer = new Container();
const hotLayer = new Container();
const objLayer = new Container();             // 可拖移物件（每個資產編號一個實體）
const hudLayer = new Container();             // ↑ 要疊在 hotLayer 上面，否則物件被拖到熱點上時，
const overlayLayer = new Container();         //   熱點那塊透明的判定框會把點擊吃掉
root.addChild(sceneLayer, hotLayer, objLayer, hudLayer, overlayLayer);
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
    stored: new Set(),        // 收進物品欄的物件 id
    storedOrder: [],          // 收納順序（物品欄顯示用）
    combined: new Set(),      // 已組合掉的物件 id（例如裝回底座的轉輪）
    solved: false,
};

const clueById = id => CASE.clues.find(c => c.id === id);
const itemById = id => CASE.items.find(i => i.id === id);
const hasClue = id => state.clues.includes(id);
const hasItem = id => state.items.includes(id);
// 有些物件在拿到某道具後說法會變（例如解密盤裝好之後）
const lookOf = h => (h.doneItem && hasItem(h.doneItem) && h.lookDone) || h.look;

// 所有場景的物件索引（物品欄的圖示點擊要靠它找回資料）
const OBJ_INDEX = {};
for (const sc of Object.values(CASE.scenes)) {
    for (const o of sc.objects || []) OBJ_INDEX[o.id] = o;
}

// ============================================================
// HUD
// ============================================================
hudLayer.addChild(new Graphics().rect(0, 0, W, 54).fill({ color: COL.bar, alpha: 0.92 }));

const titleText = mkText(`🔍 ${CASE.title}`, 19, 0xfff6e9, { weight: '700' });
titleText.anchor.set(0, 0.5);
titleText.position.set(22, 27);
hudLayer.addChild(titleText);

// ============================================================
// 物品欄（畫面最下方）：
// 拖移物件放進來收納，道具（透鏡等）也會出現在這裡，點一下隨時查看。
// ============================================================
const trayBar = new Container();
hudLayer.addChild(trayBar);
trayBar.addChild(
    new Graphics().roundRect(30, 542, 900, 52, 16).fill({ color: COL.bar, alpha: 0.95 })
);
const trayLabel = mkText('🎒', 20, 0xffffff);
trayLabel.anchor.set(0.5);
trayLabel.position.set(54, 568);
trayBar.addChild(trayLabel);
const trayChips = new Container();
trayBar.addChild(trayChips);
const trayPulses = [];                          // 物品欄裡還沒查看過的東西閃提示
const TRAY_Y = 520;                             // 拖到這條線以下就算「放進物品欄」

function renderTray() {
    trayChips.removeChildren();
    trayPulses.length = 0;
    const entries = [
        ...state.storedOrder.map(id => ({ kind: 'obj', id })),
        ...state.items.map(id => ({ kind: 'item', id })),
    ];
    entries.forEach((en, i) => {
        const chip = new Container();
        chip.position.set(92 + i * 46, 568);
        chip.addChild(new Graphics().circle(0, 0, 19).fill({ color: 0x574c42 }));
        const icon = en.kind === 'obj'
            ? (OBJ_INDEX[en.id].icon || '📦')
            : itemById(en.id).icon;
        const t = mkText(icon, 18, 0xffffff);
        t.anchor.set(0.5);
        chip.addChild(t);
        if (en.kind === 'obj' && !state.examined.has(en.id)) {
            const dot = new Graphics().circle(13, -13, 5).fill({ color: COL.hint });
            chip.addChild(dot);
            trayPulses.push(dot);
        }
        chip.eventMode = 'static';
        chip.cursor = 'pointer';
        chip.on('pointertap', () => {
            if (overlayLayer.children.length) return;
            if (en.kind === 'obj') { onHotspot(OBJ_INDEX[en.id]); return; }
            const it = itemById(en.id);
            say(`${it.icon} ${it.name}：${it.desc}`);
        });
        trayChips.addChild(chip);
    });
}

const clueBtn = mkButton({
    label: '', x: 656, y: 10, w: 134, h: 34,
    color: 0x574c42, textColor: 0xfff6e9, onClick: showNotebook,
});
const accuseBtn = mkButton({
    label: '🕵️ 指認犯人', x: 802, y: 10, w: 138, h: 34, onClick: showAccuse,
});
hudLayer.addChild(clueBtn, accuseBtn);

// 場景名牌：放在頂欄正中間，不擋場景
const sceneTag = new Container();
const sceneTagBg = new Graphics();
const sceneTagText = mkText('', 15, COL.ink, { weight: '700' });
sceneTagText.anchor.set(0, 0.5);
sceneTagText.position.set(16, 17);
sceneTag.addChild(sceneTagBg, sceneTagText);
hudLayer.addChild(sceneTag);

// 對話框（左邊坐著助手小貓喵喵）—— 可以收起來，把整個場景看個清楚
// 下方要讓位給物品欄，所以比較扁；太長的訊息會自動縮小字級。
const dlgBox = new Container();
hudLayer.addChild(dlgBox);
dlgBox.addChild(
    new Graphics().roundRect(30, 452, 900, 84, 18)
        .fill({ color: COL.panel }).stroke({ width: 4, color: COL.border })
);
// 喵喵只住在對話框裡：點頭像＝跟助手求提示（場景中不再出現）
const catBtn = new Container();
catBtn.position.set(66, 494);
catBtn.addChild(new Graphics().circle(0, 0, 22).fill({ color: COL.panel2 }).stroke({ width: 3, color: COL.border }));
const dlgCat = mkText('🐱', 24, 0xffffff);
dlgCat.anchor.set(0.5);
catBtn.addChild(dlgCat);
const catTip = mkText('提示', 9, COL.muted, { weight: '700' });
catTip.anchor.set(0.5);
catTip.position.set(0, 16);
catBtn.addChild(catTip);
catBtn.eventMode = 'static';
catBtn.cursor = 'pointer';
catBtn.on('pointerover', () => { catBtn.scale.set(1.1); });
catBtn.on('pointerout', () => { catBtn.scale.set(1); });
catBtn.on('pointertap', () => {
    if (overlayLayer.children.length) return;
    const hints = CASE.hints || [];
    const line = hints.find(e =>
        (e.unless && !hasClue(e.unless)) || (e.unlessItem && !hasItem(e.unlessItem))
    ) || hints[hints.length - 1];
    if (line) say(line.text);
});
dlgBox.addChild(catBtn);
const dlgText = mkText('', 16, COL.ink, { wrap: 760, lineHeight: 23 });
dlgText.position.set(98, 462);
dlgBox.addChild(dlgText);

// 圓形小按鈕（收起 / 展開）
function mkRoundBtn(x, y, rad, label, size, onClick) {
    const c = new Container();
    c.position.set(x, y);
    c.addChild(
        new Graphics().circle(0, 0, rad)
            .fill({ color: COL.panel }).stroke({ width: 3, color: COL.border })
    );
    const t = mkText(label, size, COL.ink, { weight: '700' });
    t.anchor.set(0.5);
    c.addChild(t);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerover', () => { c.alpha = 0.8; });
    c.on('pointerout', () => { c.alpha = 1; });
    c.on('pointertap', onClick);
    return c;
}

let dlgOpen = true, dlgUnread = false;

dlgBox.addChild(mkRoundBtn(900, 470, 13, '✕', 14, () => setDialog(false)));

const showBtn = mkRoundBtn(56, 512, 22, '💬', 20, () => setDialog(true));
const unreadDot = new Graphics().circle(16, -16, 6).fill({ color: COL.red });
showBtn.addChild(unreadDot);
hudLayer.addChild(showBtn);

function setDialog(open) {
    dlgOpen = open;
    dlgBox.visible = open;
    showBtn.visible = !open;
    if (open) dlgUnread = false;
    unreadDot.visible = dlgUnread;
}

let lastMsg = '';
const say = text => {
    // 對話框變扁了，太長的訊息自動縮小字級塞進去
    for (const [size, lh] of [[16, 23], [14, 20], [12, 17]]) {
        dlgText.style.fontSize = size;
        dlgText.style.lineHeight = lh;
        dlgText.text = text;
        if (dlgText.height <= 70) break;
    }
    // 新訊息強制跳出對話框一次；同一則訊息之後由使用者自由開關
    if (text !== lastMsg) {
        lastMsg = text;
        if (!dlgOpen) setDialog(true);
    } else if (!dlgOpen) {
        dlgUnread = true;
        unreadDot.visible = true;
    }
};

setDialog(true);

function setSceneTag(name) {
    sceneTagText.text = name;
    const w = sceneTagText.width + 32;
    sceneTagBg.clear()
        .roundRect(0, 0, w, 34, 17)
        .fill({ color: COL.panel, alpha: 0.92 })
        .stroke({ width: 3, color: COL.border });
    sceneTag.position.set(480 - w / 2, 10);       // 頂欄置中
}

function refreshHud() {
    clueBtn.setLabel(`🔎 線索 ${state.clues.length}/${CASE.clues.length}`);
    accuseBtn.setLocked(state.clues.length < CASE.clues.length && !state.solved);
    renderTray();
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
    renderInteractives();
    say(scene.intro || '點擊場景中的東西開始調查。');
}

// 物件（可拖移）畫在熱點底下，兩邊都會重畫
function renderInteractives() {
    pulses.length = 0;
    objLayer.removeChildren();
    hotLayer.removeChildren();
    for (const o of CASE.scenes[state.scene].objects || []) {
        if (state.stored.has(o.id) || state.combined.has(o.id)) continue;   // 收進物品欄／已組合掉的不畫
        objLayer.addChild(makeObject(o));
    }
    for (const h of CASE.scenes[state.scene].hotspots) hotLayer.addChild(makeHotspot(h));
}

// ============================================================
// 可拖移物件：一個資產編號 → 一個實體
// 資料寫在 scenes.<場景>.objects[]：
//   { id（資產編號，例如 'SP01'）, name, x, y, w, h, draggable?,
//     art:[ ...props，座標以物件左上角為原點... ],
//     其餘互動欄位（look / after / gives / givesItem / puzzle / requires…）
//     跟 hotspot 完全一樣，所以行為不用另外寫。}
// 換成正式美術時，art 換成 [{ t:'img', src:'...', x:0, y:0, w, h }] 就好。
// ============================================================
const objPositions = {};                       // 玩家拖過的位置記在這，重畫也不會跑回去
let drag = null;                               // { o, node }
let dragOff = { x: 0, y: 0 }, dragFrom = { x: 0, y: 0 }, dragDist = 0;
const DRAG_SLOP = 6;                           // 移動超過這距離才算「拖」，否則當成點一下

function makeObject(o) {
    const c = new Container();
    const p = objPositions[o.id] || { x: o.x, y: o.y };
    c.position.set(p.x, p.y);
    c.eventMode = 'static';
    c.cursor = o.draggable ? 'grab' : 'pointer';
    c.hitArea = new Rectangle(0, 0, o.w, o.h);

    // 美術本體：pivot 放中心，拖起來時可以從中心稍微放大
    const art = new Container();
    art.pivot.set(o.w / 2, o.h / 2);
    art.position.set(o.w / 2, o.h / 2);
    // 拿到某道具後外觀會變（例如解密盤裝好轉輪）
    drawProps((o.doneItem && hasItem(o.doneItem) && o.artDone) || o.art, art);
    c.addChild(art);
    c.art = art;

    const outline = new Graphics()
        .roundRect(-4, -4, o.w + 8, o.h + 8, 12)
        .stroke({ width: 4, color: COL.hint });
    outline.alpha = 0;
    c.addChild(outline);

    const lt = mkText(o.draggable ? `${o.name} ✋` : o.name, 16, COL.ink, { weight: '700' });
    lt.position.set(14, 7);
    const label = new Container();
    label.addChild(
        new Graphics().roundRect(0, 0, lt.width + 28, 34, 17)
            .fill({ color: COL.panel }).stroke({ width: 3, color: COL.border }),
        lt
    );
    label.alpha = 0;
    c.addChild(label);
    // 名牌跟著物件跑；靠近畫面上緣時改掛在下面，才不會被工具列吃掉
    c.placeLabel = () => label.position.set(
        o.w / 2 - (lt.width + 28) / 2,
        c.y - 44 < 58 ? o.h + 10 : -44
    );
    c.placeLabel();

    if (!state.examined.has(o.id)) {
        const dot = new Graphics().circle(0, 0, 7).fill({ color: COL.hint });
        dot.position.set(o.w - 8, 10);
        c.addChild(dot);
        pulses.push(dot);
    }

    c.on('pointerover', () => { outline.alpha = 1; label.alpha = 1; });
    c.on('pointerout', () => {
        if (drag && drag.node === c) return;
        outline.alpha = 0; label.alpha = 0;
    });

    c.on('pointerdown', e => {
        if (!o.draggable || overlayLayer.children.length) return;
        drag = { o, node: c };
        const g = root.toLocal(e.global);
        dragOff = { x: g.x - c.x, y: g.y - c.y };
        dragFrom = { x: c.x, y: c.y };
        dragDist = 0;
        objLayer.addChild(c);                  // 拉到最上層
        c.cursor = 'grabbing';
        art.scale.set(1.06);
        art.alpha = 0.92;
    });
    // 放開時只移動了一點點 → 當成「點一下查看」，而不是拖曳
    // （不可拖的物件沒有 pointerdown 流程，直接當點擊）
    c.on('pointerup', () => {
        if (!o.draggable) { onHotspot(o); return; }
        if (drag && drag.node === c && dragDist < DRAG_SLOP) onHotspot(o);
    });

    return c;
}

function onObjMove(e) {
    if (!drag) return;
    const g = root.toLocal(e.global);
    const { o, node } = drag;
    const nx = Math.min(Math.max(g.x - dragOff.x, 6), W - o.w - 6);
    const ny = Math.min(Math.max(g.y - dragOff.y, 60), H - o.h - 6);
    node.position.set(nx, ny);
    dragDist = Math.max(dragDist, Math.hypot(nx - dragFrom.x, ny - dragFrom.y));
    node.placeLabel();
}

function onObjUp() {
    if (!drag) return;
    const { o, node } = drag;
    drag = null;
    node.cursor = 'grab';
    node.art.scale.set(1);
    node.art.alpha = 1;
    if (dragDist < DRAG_SLOP) return;                  // 只是點一下，位置不動

    const cx = node.x + o.w / 2, cy = node.y + o.h / 2;

    // 1) 拖到組合目標上（例如轉輪 → 底座）
    if (o.dropTarget) {
        const t = OBJ_INDEX[o.dropTarget];
        const tp = objPositions[t.id] || { x: t.x, y: t.y };
        const hit = node.x < tp.x + t.w && tp.x < node.x + o.w &&
                    node.y < tp.y + t.h && tp.y < node.y + o.h;
        if (hit) {
            state.combined.add(o.id);
            let msg = o.dropSay || '';
            if (o.dropGivesItem && !hasItem(o.dropGivesItem)) {
                state.items.push(o.dropGivesItem);
                const it = itemById(o.dropGivesItem);
                msg += `\n🎒 取得道具：${it.icon} ${it.name}`;
            }
            say(msg);
            refreshHud();
            renderInteractives();
            return;
        }
        // 組合零件不收進物品欄，免得卡關
        if (cy > TRAY_Y) {
            say(`${o.name}要裝回去才有用 —— 把它拖到${OBJ_INDEX[o.dropTarget].name}上吧。`);
            node.position.set(dragFrom.x, dragFrom.y);
            node.placeLabel();
            return;
        }
    }

    // 2) 拖到下方 → 收進物品欄
    if (!o.dropTarget && cy > TRAY_Y && cx > 30 && cx < 930) {
        state.stored.add(o.id);
        state.storedOrder.push(o.id);
        delete objPositions[o.id];
        say(`🎒 ${o.name}收進物品欄了。點下方的圖示隨時查看。`);
        refreshHud();
        renderInteractives();
        return;
    }

    // 3) 一般放下：別藏到對話框後面
    const maxY = (dlgOpen ? 446 : 536) - o.h;
    if (node.y > maxY) { node.y = Math.max(60, maxY); node.placeLabel(); }
    objPositions[o.id] = { x: node.x, y: node.y };
}

app.stage.on('globalpointermove', onObjMove);
app.stage.on('pointerup', onObjUp);
app.stage.on('pointerupoutside', onObjUp);

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
        say(lookOf(h));
        openPuzzle(h);
        return;
    }
    if (state.examined.has(h.id)) {
        say(h.after || lookOf(h));
        return;
    }
    award(h, lookOf(h));
}

function award(h, text) {
    state.examined.add(h.id);
    let msg = text;

    for (const id of [].concat(h.givesItem || [])) {
        if (hasItem(id)) continue;
        state.items.push(id);
        const it = itemById(id);
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
    renderInteractives();

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
    for (const d of trayPulses) d.alpha = a;
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
        const box = panelBase(panel, { title: cfg.title, ...(cfg.box || {}) });
        const ctx = { app, root, say };
        panelCleanup = PUZZLES[cfg.type](ctx, panel, box, cfg, () => {
            closePanel();
            award(h, h.solvedText || lookOf(h));
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

        const n = CASE.suspects.length;
        const cw = 142, chh = 216, gap = 22;
        const startX = box.cx - (n * cw + (n - 1) * gap) / 2;
        CASE.suspects.forEach((s, i) => {
            const cx = startX + i * (cw + gap);
            const cy = box.y + 112;
            const card = new Container();
            const bg = new Graphics();
            const paint = color => bg.clear().roundRect(cx, cy, cw, chh, 20)
                .fill({ color: COL.panel2 }).stroke({ width: 3, color });
            paint(COL.border);
            const face = mkText(s.emoji, 50, 0xffffff);
            face.anchor.set(0.5);
            face.position.set(cx + cw / 2, cy + 56);
            const name = mkText(s.name, 19, COL.ink, { weight: '700' });
            name.anchor.set(0.5);
            name.position.set(cx + cw / 2, cy + 106);
            const role = mkText(s.role, 13, COL.muted);
            role.anchor.set(0.5);
            role.position.set(cx + cw / 2, cy + 130);
            const memo = mkText(s.testimony || '', 11, COL.muted, { wrap: cw - 24, align: 'center', lineHeight: 16 });
            memo.anchor.set(0.5, 0);
            memo.position.set(cx + cw / 2, cy + 152);
            card.addChild(bg, face, name, role, memo);
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
