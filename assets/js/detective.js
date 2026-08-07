import {
    Application, Assets, Container, Graphics, Rectangle
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import {
    W, H, COL, mkText, mkButton, panelBase, drawProps, preloadImages, hasTexture
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
const boardLayer = new Container();           // 黑板上的證詞紀錄表（純顯示，不吃點擊）
const hotLayer = new Container();
const objLayer = new Container();             // 可拖移物件（每個資產編號一個實體）
const fxLayer = new Container();              // 落地的灰塵等特效
const labelLayer = new Container();           // 滑鼠名牌：獨立一層疊在最上面，
                                              //   否則會被前面的物件蓋住（例如桌上的獎盃擋住「抽屜」名牌）
const hudLayer = new Container();             // ↑ objLayer 要疊在 hotLayer 上面，否則物件被拖到熱點上時，
const overlayLayer = new Container();         //   熱點那塊透明的判定框會把點擊吃掉
root.addChild(sceneLayer, boardLayer, hotLayer, objLayer, fxLayer, labelLayer, hudLayer, overlayLayer);
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

// ============================================================
// 動態文案：look / after / locked / lockedClue / intro / 提示的 text
// 都可以寫成函式，吃下面這包進度查詢、回傳當下該講的話 ——
// 玩家點東西的順序是自由的，寫死的句子常常會指著還沒出現的東西講。
// ============================================================
const txtApi = {
    hasClue, hasItem,
    examined: id => state.examined.has(id),
    stored: id => state.stored.has(id),
    scene: () => state.scene,
    solved: () => state.solved,
};
const txt = v => (typeof v === 'function' ? v(txtApi) : v);

// 有些物件在拿到某道具後說法會變（例如解密盤裝好之後）
const lookOf = h => txt((h.doneItem && hasItem(h.doneItem) && h.lookDone) || h.look);

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
// 整條通到底的橫幅（和頂欄同樣是滿版），順便蓋掉背景圖最下面補出來的那條地板。
// 要調高低就改 TRAY_TOP，圖示會跟著置中。
const TRAY_TOP = 514;
const trayBar = new Container();
hudLayer.addChild(trayBar);
trayBar.addChild(
    new Graphics().rect(0, TRAY_TOP, W, H - TRAY_TOP).fill({ color: COL.bar, alpha: 0.95 })
);
const TRAY_MID = TRAY_TOP + (H - TRAY_TOP) / 2;
const trayLabel = mkText('道具', 19, 0xfff6e9, { weight: '700' });
trayLabel.anchor.set(0.5);
trayLabel.position.set(46, TRAY_MID);
trayBar.addChild(trayLabel);

// 格子：先畫一整排空格當底，撿到東西再把「有東西的格子」疊上去。
// 想調格數／大小就改這三個常數，位置會自己算。
const SLOT_N = 12, SLOT_SIZE = 60, SLOT_PITCH = 71, SLOT_X0 = 84;
const slotY = TRAY_MID - SLOT_SIZE / 2;
const slotCX = i => SLOT_X0 + i * SLOT_PITCH + SLOT_SIZE / 2;
const emptySlots = new Graphics();
for (let i = 0; i < SLOT_N; i++) {
    emptySlots
        .roundRect(SLOT_X0 + i * SLOT_PITCH, slotY, SLOT_SIZE, SLOT_SIZE, 12)
        .fill({ color: 0x2b241e, alpha: 0.5 })
        .stroke({ width: 2, color: 0x6b5b4d });
}
trayBar.addChild(emptySlots);

const trayChips = new Container();
trayBar.addChild(trayChips);
const trayPulses = [];                          // 物品欄裡還沒查看過的東西閃提示
const TRAY_Y = TRAY_TOP + 6;                    // 拖到這條線以下就算「放進物品欄」

// 有些道具的「實體」是場景裡一個 storeAs 指向它的物件（解密盤裝好就算拿到 dial，
// 可是盤子還擺在校長桌上）。這種道具在玩家真的把它拖進物品欄之前不該佔一格，
// 不然同一樣東西會同時出現在桌上和物品欄裡。
const stillOnStage = id => Object.values(OBJ_INDEX)
    .some(o => o.storeAs === id && !state.stored.has(o.id));

function renderTray() {
    trayChips.removeChildren();
    trayPulses.length = 0;
    const entries = [
        ...state.storedOrder.map(id => ({ kind: 'obj', id })),
        ...state.items.filter(id => !stillOnStage(id)).map(id => ({ kind: 'item', id })),
    ];
    entries.slice(0, SLOT_N).forEach((en, i) => {
        const chip = new Container();
        chip.position.set(slotCX(i), TRAY_MID);
        // 有東西的格子換成亮一點的底＋金色外框，一眼看得出哪幾格滿了
        chip.addChild(
            new Graphics()
                .roundRect(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, 12)
                .fill({ color: 0x574c42 })
                .stroke({ width: 2, color: COL.gold })
        );
        const icon = en.kind === 'obj'
            ? (OBJ_INDEX[en.id].icon || '📦')
            : itemById(en.id).icon;
        const t = mkText(icon, 30, 0xffffff);
        t.anchor.set(0.5);
        chip.addChild(t);
        if (en.kind === 'obj' && !state.examined.has(en.id)) {
            const dot = new Graphics().circle(21, -21, 6).fill({ color: COL.hint });
            chip.addChild(dot);
            trayPulses.push(dot);
        }
        chip.eventMode = 'static';
        chip.cursor = 'pointer';
        chip.on('pointertap', () => {
            if (overlayLayer.children.length) return;
            if (en.kind === 'obj') { onHotspot(OBJ_INDEX[en.id]); return; }
            const it = itemById(en.id);
            // 道具寫了 opens: '<物件 id>' 就直接開那個物件的介面
            //（例如解密盤 → 打開凱撒轉盤），沒寫的才只顯示說明
            if (it.opens && OBJ_INDEX[it.opens]) { onHotspot(OBJ_INDEX[it.opens]); return; }
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

// 對話框（左邊坐著助手大耳狗喜拿）—— 可以收起來，把整個場景看個清楚
// 下方要讓位給物品欄，所以比較扁；太長的訊息會自動縮小字級。
const dlgBox = new Container();
hudLayer.addChild(dlgBox);
dlgBox.addChild(
    new Graphics().roundRect(30, 452, 900, 84, 18)
        .fill({ color: COL.panel }).stroke({ width: 4, color: COL.border })
);
// 喜拿只住在對話框裡：點頭像＝跟助手求提示（場景中不再出現）
// 圓底 → 頭像 → 圓框，三層疊出標準頭像；缺圖時退回 🐶 emoji，版面不會垮。
// 半徑 26：頭像 34–86，對話文字從 x=98 開始，連 hover 放大 1.1 倍都碰不到。
const catBtn = new Container();
catBtn.position.set(60, 486);
const AVATAR_R = 26;
const ASSIST = CASE.assistantImg;
catBtn.addChild(new Graphics().circle(0, 0, AVATAR_R).fill({ color: COL.panel2 }));
if (hasTexture(ASSIST)) {
    drawProps([{ t: 'img', src: ASSIST, x: -AVATAR_R, y: -AVATAR_R, w: AVATAR_R * 2, h: AVATAR_R * 2 }], catBtn);
} else {
    const fallback = mkText('🐶', 26, 0xffffff);
    fallback.anchor.set(0.5);
    catBtn.addChild(fallback);
}
catBtn.addChild(new Graphics().circle(0, 0, AVATAR_R).stroke({ width: 3, color: COL.border }));
const catTip = mkText('提示', 9, COL.muted, { weight: '700' });
catTip.anchor.set(0.5);
catTip.position.set(0, 36);      // 頭像圓框底在 +26，這裡再讓 3px 才不會貼著
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
    if (line) say(txt(line.text));
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
    c.setLabel = s => { t.text = s; };
    return c;
}

// ============================================================
// 全螢幕：只把遊戲容器放大，頁面的頂欄不跟進來。
// 切換鈕只有畫布裡那一顆 —— 全螢幕時 HTML 頂欄整個看不到，
// 觸控螢幕又沒有 Esc 可按，所以鈕一定要畫在畫布上。
//
// 兩種模式：
//   原生   —— 走 Fullscreen API（桌機、Android、iPad Safari）
//   備援   —— iPhone 的 Safari 不讓一般元素進全螢幕（Apple 的限制，
//             只有 <video> 可以），所以退成 CSS 假全螢幕：
//             body 加上 .fs-fallback，容器 fixed 撐滿視窗、頁面頂欄收起來。
//             視覺上一樣「只剩遊戲」，差別只在系統的網址列還在。
// ============================================================
const canNativeFS = !!(container.requestFullscreen || container.webkitRequestFullscreen)
    && document.fullscreenEnabled !== false;

const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const isFullscreen = () => (canNativeFS
    ? !!fsElement()
    : document.body.classList.contains('fs-fallback'));

const toggleFullscreen = () => {
    if (canNativeFS) {
        if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        else (container.requestFullscreen || container.webkitRequestFullscreen)?.call(container);
        return;                                    // 之後由 fullscreenchange 收尾
    }
    document.body.classList.toggle('fs-fallback');
    syncFsUI();
};

// 頂欄裡的 ⛶：擺在場景名牌和線索鈕中間的空檔
const fsHudBtn = mkRoundBtn(624, 27, 16, '⛶', 15, () => {
    if (overlayLayer.children.length) return;      // 面板開著先不切，免得誤觸
    toggleFullscreen();
});
hudLayer.addChild(fsHudBtn);

function syncFsUI() {
    const fs = isFullscreen();
    fsHudBtn.setLabel(fs ? '✕' : '⛶');
    // 等版面重排完再叫 Pixi 重算尺寸，否則量到的還是舊的容器大小
    requestAnimationFrame(() => app.resize());
}

for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) {
    document.addEventListener(ev, syncFsUI);
}
// 備援模式下轉螢幕方向，視窗尺寸會變（原生模式 Pixi 自己會處理）
window.addEventListener('orientationchange', () => {
    if (!canNativeFS) requestAnimationFrame(() => app.resize());
});

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
    syncZoomBtn();                                // 放大鈕是說明的一部分，跟著一起收放
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

// ============================================================
// 「放大看」按鈕：浮在對話框正上方
// 東西上刻的字太小（例如展示座正面的銅牌），光靠場景裡的縮圖看不清楚，
// 所以在資料裡寫 zoom 的物件／熱點，查看之後就能點這顆按鈕拉近看。
// ★ 它講的是對話框裡那則說明，所以說明收起來時它也要跟著不見，
//   不然喵喵的話關掉了，按鈕還孤零零掛在場景上。
// ============================================================
let zoomCfg = null;

const zoomBtn = mkButton({
    label: '🔍 放大看', x: 760, y: 410, w: 170, h: 34,
    onClick: () => {
        if (zoomCfg && !overlayLayer.children.length) showZoom(zoomCfg);
    },
});
zoomBtn.visible = false;
hudLayer.addChild(zoomBtn);

// 沒有可放大的東西、或說明被收起來了，按鈕就不該留在畫面上
function syncZoomBtn() {
    zoomBtn.visible = !!zoomCfg && dlgOpen;
}

function setZoom(cfg) {
    zoomCfg = cfg || null;
    if (cfg) zoomBtn.setLabel(cfg.btn || '🔍 放大看');
    syncZoomBtn();
}

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
const visitedScenes = new Set();

function renderScene(id) {
    state.scene = id;
    const scene = CASE.scenes[id];

    sceneLayer.removeChildren();
    drawProps(scene.bg ? [{ t: 'img', src: scene.bg, x: 0, y: 0, w: W, h: H }, ...scene.props] : scene.props, sceneLayer);
    setSceneTag(scene.name);
    setZoom(null);                                // 換場景就把上一個東西的放大鈕收起來
    renderBoard();
    renderInteractives();
    // 第一次進場講開場白；之後再回來改講 introBack，才不會一直重講「快來調查吧」
    const first = !visitedScenes.has(id);
    visitedScenes.add(id);
    say(txt(first ? scene.intro : (scene.introBack || scene.intro)) || '點擊場景中的東西開始調查。');
}

// ============================================================
// 黑板上的證詞紀錄表
// 場景寫 board: { x, y, w, h, cols? } 指定黑板在畫面上的位置（cols 沒寫就兩欄），
// 再寫 records: [ { emoji, name, role, facts:[四則短句], note }, … ]，
// 進場就會把它們排成格子貼在黑板上（純顯示，不用點）。
// 最後一列排不滿時會置中，五張卡（三欄）才不會整塊偏左。
// facts 的順序固定是：身高 / 慣用手 / 單片眼鏡 / 案發時段。
//
// ★ record 寫了 img 就改貼正式美術（等比縮進格子裡置中）。
//   黑板上的格子很小，卡片上的字一定看不清楚 —— 那是給人「認得出黑板上貼著卡」用的，
//   要讀內容請點黑板，用放大檢視一張一張看。
// ============================================================
const BOARD_MARGIN = 8, BOARD_GAP = 7;
// 缺圖時的替代卡照這個尺寸畫版面，再整張縮進格子裡 ——
// 欄數變多、格子變窄時，字會跟著等比縮小，而不是擠成一團
const CARD_DW = 160, CARD_DH = 90;

function renderBoard() {
    boardLayer.removeChildren();
    const scene = CASE.scenes[state.scene];
    const area = scene?.board, records = scene?.records;
    if (!area || !records?.length) return;

    const cols = Math.max(1, area.cols || 2);
    const rows = Math.ceil(records.length / cols);
    const cw = (area.w - BOARD_MARGIN * 2 - BOARD_GAP * (cols - 1)) / cols;
    const ch = (area.h - BOARD_MARGIN * 2 - BOARD_GAP * (rows - 1)) / rows;

    records.forEach((r, i) => {
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, records.length - row * cols);   // 這一列實際有幾張
        const rowW = inRow * cw + (inRow - 1) * BOARD_GAP;
        const card = new Container();
        card.position.set(
            area.x + (area.w - rowW) / 2 + (i - row * cols) * (cw + BOARD_GAP),
            area.y + BOARD_MARGIN + row * (ch + BOARD_GAP)
        );

        // 有正式美術就直接貼圖，等比縮到格子裡置中
        if (hasTexture(r.img)) {
            const tex = Assets.get(r.img);
            const s = Math.min(cw / tex.width, ch / tex.height);
            const iw = tex.width * s, ih = tex.height * s;
            drawProps([{ t: 'img', src: r.img, x: (cw - iw) / 2, y: (ch - ih) / 2, w: iw, h: ih }], card);
            boardLayer.addChild(card);
            return;
        }

        // 缺圖的替代卡：先照 CARD_DW × CARD_DH 排版，最後整張縮進格子
        const face = new Container();
        const s = Math.min(cw / CARD_DW, ch / CARD_DH);
        face.scale.set(s);
        face.position.set((cw - CARD_DW * s) / 2, (ch - CARD_DH * s) / 2);
        card.addChild(face);

        // 紙、影子，還有黏在上緣的紙膠帶
        face.addChild(new Graphics().roundRect(2, 3, CARD_DW, CARD_DH, 5).fill({ color: 0x000000, alpha: 0.25 }));
        face.addChild(
            new Graphics().roundRect(0, 0, CARD_DW, CARD_DH, 5)
                .fill({ color: 0xfdf6e6 }).stroke({ width: 2, color: 0xd8cdbc })
        );
        face.addChild(
            new Graphics().roundRect(CARD_DW / 2 - 22, -5, 44, 11, 2).fill({ color: 0xf2e6c8, alpha: 0.9 })
        );

        const put = (str, x, y, size, color, weight) => {
            const t = mkText(str, size, color, weight ? { weight } : {});
            t.position.set(x, y);
            face.addChild(t);
        };

        const em = mkText(r.emoji || '❓', 17, 0xffffff);
        em.anchor.set(0.5);
        em.position.set(17, 17);
        face.addChild(em);
        put(r.name || '', 32, 5, 14, COL.ink, '700');
        put(r.role || '', 80, 9, 10, COL.muted);
        face.addChild(
            new Graphics().moveTo(10, 27).lineTo(CARD_DW - 10, 27).stroke({ width: 2, color: 0xd8cdbc })
        );

        // 四則短句排成 2×2
        (r.facts || []).slice(0, 4).forEach((f, k) => {
            put(f, k % 2 ? 86 : 10, 33 + Math.floor(k / 2) * 18, 11, COL.ink, '700');
        });

        if (r.note) put(r.note, 10, 69, 10, COL.muted);
        boardLayer.addChild(card);
    });
}

// 物件（可拖移）畫在熱點底下，兩邊都會重畫
function renderInteractives() {
    objLayer.removeChildren();
    hotLayer.removeChildren();
    labelLayer.removeChildren();
    for (const o of CASE.scenes[state.scene].objects || []) {
        if (state.stored.has(o.id) || state.combined.has(o.id)) continue;   // 收進物品欄／已組合掉的不畫
        if (isHidden(o)) continue;                                          // 還沒被翻出來的不畫
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
// 物件可以寫 hiddenUntil: '<某個熱點的 id>'，在那個熱點被調查過之前不畫出來、
// 也不能互動 —— 用來把東西「藏」在抽屜、花盆這類地方，讓找東西本身變成一關。
// （award() 調查完會呼叫 renderInteractives，所以翻到之後會馬上出現）
const isHidden = o => !!o.hiddenUntil && !state.examined.has(o.hiddenUntil);

// ============================================================
// 被翻出來時的掉落動畫
// 東西是從「你剛剛點的那個地方」飛出來的，所以起點取該熱點的位置，
// 沿拋物線落到定點，接著壓扁回彈、揚起灰塵。每個物件只播一次。
// ============================================================
const dropPlayed = new Set();

// 落地的灰塵：往兩側噴開，帶重力和空氣阻力，邊放大邊淡出
function puff(cx, cy, spread) {
    const bits = [];
    for (let i = 0; i < 9; i++) {
        const g = new Graphics().circle(0, 0, 2 + Math.random() * 3.5).fill({ color: 0xcbb894 });
        g.position.set(cx + (Math.random() - 0.5) * spread * 0.8, cy + (Math.random() - 0.5) * 5);
        g.alpha = 0.9;
        fxLayer.addChild(g);
        const dir = Math.random() < 0.5 ? -1 : 1;
        bits.push({ g, vx: dir * (0.5 + Math.random() * 1.4), vy: -0.5 - Math.random() * 0.9 });
    }
    let t = 0;
    const tick = ticker => {
        t += ticker.deltaMS;
        const k = Math.min(t / 540, 1);
        for (const b of bits) {
            b.g.x += b.vx; b.g.y += b.vy;
            b.vy += 0.05; b.vx *= 0.96;
            b.g.alpha = 0.9 * (1 - k) * (1 - k);
            b.g.scale.set(1 + k * 1.4);
        }
        if (k >= 1) { bits.forEach(b => b.g.destroy()); app.ticker.remove(tick); }
    };
    app.ticker.add(tick);
}

function playDrop(node, o, from) {
    const toX = node.x, toY = node.y;
    const DUR = 640, FLY = 0.72, ARC = 34;
    // 接地陰影：越接近地面越大越濃
    const shadow = new Graphics()
        .ellipse(0, 0, o.w * 0.44, Math.max(5, o.w * 0.15))
        .fill({ color: 0x000000 });
    shadow.position.set(toX + o.w / 2, toY + o.h - 3);
    shadow.alpha = 0;
    fxLayer.addChild(shadow);

    const art = node.art;
    const spin = (o.w < 60 ? 2.6 : 1.1) * (from.x > toX ? -1 : 1);
    let t = 0, landed = false;
    node.position.set(from.x, from.y);
    node.alpha = 0;

    const tick = ticker => {
        t += ticker.deltaMS;
        const k = Math.min(t / DUR, 1);
        node.alpha = Math.min(1, k * 7);

        if (k < FLY) {
            const f = k / FLY;
            const fall = f * f;                                  // 越掉越快
            node.x = from.x + (toX - from.x) * f;
            node.y = from.y + (toY - from.y) * fall - ARC * 4 * f * (1 - f);
            if (art) art.rotation = spin * f * (1 - f * 0.4);
            shadow.alpha = 0.06 + 0.22 * fall;
            shadow.scale.set(0.45 + 0.55 * fall);
        } else {
            if (!landed) { landed = true; puff(toX + o.w / 2, toY + o.h - 3, o.w); }
            const f = (k - FLY) / (1 - FLY);
            const decay = (1 - f) * (1 - f);
            node.x = toX;
            node.y = toY - Math.abs(Math.sin(f * Math.PI * 2.2)) * 16 * decay;   // 兩下遞減回彈
            if (art) {
                art.rotation *= 0.74;
                const sq = 1 - 0.24 * Math.max(0, Math.cos(f * Math.PI * 2.2)) * decay;
                art.scale.set(2 - sq, sq);                        // 落地壓扁再彈回
            }
            shadow.alpha = 0.28 * (1 - f * 0.25);
            shadow.scale.set(1);
        }
        if (node.placeLabel) node.placeLabel();

        if (k >= 1) {
            node.position.set(toX, toY);
            node.alpha = 1;
            if (art) { art.rotation = 0; art.scale.set(1); }
            if (node.placeLabel) node.placeLabel();
            app.ticker.remove(tick);
            fadeOut(shadow, 300);
        }
    };
    app.ticker.add(tick);
}

function fadeOut(node, ms) {
    const a0 = node.alpha;
    let t = 0;
    const tick = ticker => {
        t += ticker.deltaMS;
        node.alpha = a0 * Math.max(0, 1 - t / ms);
        if (t >= ms) { node.destroy(); app.ticker.remove(tick); }
    };
    app.ticker.add(tick);
}

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

    // 滑過去只出現名牌，不畫外框（外框太搶眼，會蓋掉美術）
    const lt = mkText(o.draggable ? `${o.name} ✋` : o.name, 16, COL.ink, { weight: '700' });
    lt.position.set(14, 7);
    const label = new Container();
    label.addChild(
        new Graphics().roundRect(0, 0, lt.width + 28, 34, 17)
            .fill({ color: COL.panel }).stroke({ width: 3, color: COL.border }),
        lt
    );
    label.alpha = 0;
    labelLayer.addChild(label);                // 放獨立圖層，座標改成畫面絕對座標
    // 名牌跟著物件跑；靠近畫面上緣時改掛在下面，才不會被工具列吃掉
    c.placeLabel = () => label.position.set(
        c.x + o.w / 2 - (lt.width + 28) / 2,
        c.y - 44 < 58 ? c.y + o.h + 10 : c.y - 44
    );
    c.placeLabel();

    c.on('pointerover', () => { label.alpha = 1; });
    c.on('pointerout', () => {
        if (drag && drag.node === c) return;
        label.alpha = 0;
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

    // 剛被翻出來的東西播一次掉落動畫（只有藏起來的物件、且還沒被玩家搬過位置）
    if (o.hiddenUntil && !dropPlayed.has(o.id) && !objPositions[o.id]) {
        dropPlayed.add(o.id);
        // 起點＝剛剛點的那個熱點，讓東西看起來是從那裡掉出來的。
        // 但一律從落點上方開始，否則往上飛看起來很怪（例如從抽屜「飛」到桌面）。
        const src = (CASE.scenes[state.scene].hotspots || []).find(h => h.id === o.hiddenUntil);
        const from = src
            ? { x: src.x + src.w / 2 - o.w / 2, y: Math.min(src.y + src.h / 2 - o.h / 2, p.y - 70) }
            : { x: p.x, y: p.y - 90 };
        playDrop(c, o, from);
    }

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
        // 目標本身還沒被翻出來時不能組合，否則會對著一塊空地「裝上去」
        const hit = !isHidden(t) &&
                    node.x < tp.x + t.w && tp.x < node.x + o.w &&
                    node.y < tp.y + t.h && tp.y < node.y + o.h;
        if (hit) {
            state.combined.add(o.id);
            let msg = o.dropSay || '';
            if (o.dropGivesItem && !hasItem(o.dropGivesItem)) {
                state.items.push(o.dropGivesItem);
                const it = itemById(o.dropGivesItem);
                // 組好的東西還擺在場景裡（storeAs），這時候物品欄不會多一格 ——
                // 別報「取得道具」，改成告訴玩家要收起來得自己拖下去
                msg += stillOnStage(o.dropGivesItem)
                    ? `\n（${it.name}就擺在原地。想收進物品欄的話，把它拖到下面那排格子裡。）`
                    : `\n🎒 取得道具：${it.icon} ${it.name}`;
            }
            say(msg);
            refreshHud();
            renderInteractives();
            return;
        }
        // 組合零件不收進物品欄，免得卡關
        // ★ 目標還沒被翻出來時別直接報它的名字 —— 玩家根本還沒看過那個東西
        if (cy > TRAY_Y) {
            const t = OBJ_INDEX[o.dropTarget];
            say(isHidden(t)
                ? `${o.name}是某個東西缺掉的零件，先收不起來 —— 它的本體還藏在房間裡，再找找看。`
                : `${o.name}要裝回去才有用 —— 把它拖到${t.name}上吧。`);
            node.position.set(dragFrom.x, dragFrom.y);
            node.placeLabel();
            return;
        }
    }

    // 2) 拖到下方 → 收進物品欄
    if (!o.dropTarget && cy > TRAY_Y && cx > 30 && cx < 930) {
        // storeAs：這個物件已經有一個對應的道具（例如裝好的解密盤 → 道具 dial）。
        //   還沒拿到那個道具就不准收，否則零件收走會卡關；
        //   收起來時也只從場景移除，不再另外佔一格，免得同一樣東西出現兩次。
        if (o.storeAs) {
            if (!hasItem(o.storeAs)) {
                say(`${o.name}還沒組好，先別收起來。`);
                node.position.set(dragFrom.x, dragFrom.y);
                node.placeLabel();
                return;
            }
            const it = itemById(o.storeAs);
            state.stored.add(o.id);
            delete objPositions[o.id];
            say(`🎒 ${o.name}收起來了。要用的時候點道具欄裡的 ${it.icon} ${it.name}。`);
            refreshHud();
            renderInteractives();
            return;
        }
        state.stored.add(o.id);
        state.storedOrder.push(o.id);
        delete objPositions[o.id];
        say(`🎒 ${o.name}收進物品欄了。點下方的圖示隨時查看。`);
        refreshHud();
        renderInteractives();
        return;
    }

    // 3) 一般放下：別藏到對話框或物品欄後面
    const maxY = (dlgOpen ? 446 : TRAY_TOP - 6) - o.h;
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

    // 滑過去只出現名牌，不畫外框（外框太搶眼，會蓋掉背景美術）
    const lt = mkText(h.name, 16, COL.ink, { weight: '700' });
    lt.position.set(14, 7);
    const label = new Container();
    label.addChild(
        new Graphics().roundRect(0, 0, lt.width + 28, 34, 17)
            .fill({ color: COL.panel }).stroke({ width: 3, color: COL.border }),
        lt
    );
    // 名牌掛在熱點上方；太靠近畫面頂端就貼齊頂欄下緣（y=58），不要鑽到頂欄底下。
    // 少數又矮又貼頂的熱點（例如掛鐘），貼齊後還是會蓋住自己，
    // 那種在資料裡加 labelBelow: true 改掛到下面。
    // ★ 別把「放不下就一律翻到下面」寫成通則 —— 高的熱點（書櫃）翻下去會壓到
    //   擺在它裡面的東西（展示座）。
    label.position.set(
        Math.min(Math.max(h.x + h.w / 2 - (lt.width + 28) / 2, 8), W - lt.width - 36),
        h.labelBelow ? h.y + h.h + 10 : Math.max(h.y - 44, 58)
    );
    label.alpha = 0;
    labelLayer.addChild(label);                // 放獨立圖層，才不會被前面的物件蓋住

    // 出口不再另外畫箭頭、名牌也不常駐 —— 通往別的房間的門畫在背景圖裡，
    // 跟其他熱點一樣滑過去才亮框和名牌。

    c.on('pointerover', () => { label.alpha = 1; });
    c.on('pointerout', () => { label.alpha = 0; });
    c.on('pointertap', () => onHotspot(h));
    return c;
}

function onHotspot(h) {
    if (overlayLayer.children.length) return;          // 面板打開時先不理場景
    setZoom(null);                                     // 放大鈕永遠只跟著「現在這一則」說明
    if (isHidden(h)) { say('那個東西你還沒找到。'); return; }   // 從道具欄繞過來的也擋一下

    // 需要某條線索才知道要做什麼
    if (h.needsClue && !hasClue(h.needsClue) && !state.examined.has(h.id)) {
        say(txt(h.lockedClue) || '你還不知道該從哪裡下手。');
        return;
    }
    // 需要道具
    if (h.requires && !hasItem(h.requires)) {
        say(txt(h.locked) || '這裡打不開。');
        return;
    }
    if (h.goto) { transitionTo(h.goto); return; }

    // 看得到本體了 → 可以拉近看上面刻的小字
    setZoom(h.zoom);

    // 謎題：解開才算調查完成
    if (h.puzzle && !state.examined.has(h.id)) {
        say(lookOf(h));
        openPuzzle(h);
        return;
    }
    if (state.examined.has(h.id)) {
        say(txt(h.after) || lookOf(h));
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

// 提示光點的呼吸效果（場景裡的光點已移除，只剩物品欄裡還沒查看過的道具）
app.ticker.add(() => {
    const a = 0.35 + 0.45 * (1 + Math.sin(performance.now() / 320)) / 2;
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
        const box = panelBase(panel, { title: cfg.title, bg: cfg.bgImg, ...(cfg.box || {}) });
        // api 讓謎題自己查進度（例如推理板要知道哪幾欄的物證還沒到手）
        const ctx = { app, root, say, api: txtApi };
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

// ============================================================
// 放大檢視面板（兩種版型，看 zoom 給的是一張還是一疊）
//
// A. 單張特寫：左邊實物、右邊中文註解卡
//    { btn?, title, img, imgW?, imgH?, note?, lead?, notes?, okLabel? }
//
// B. 多張圖冊：一次看一張，用 ◀ ▶ 翻頁
//    { btn?, title, imgs: [...], captions?: [...], okLabel? }
//    黑板上的證詞紀錄表縮得很小、字根本看不清楚，靠這個版型一張一張放大讀。
// ============================================================
function showZoom(cfg) {
    const imgs = cfg.imgs || (cfg.img ? [cfg.img] : []);
    if (imgs.length > 1) { showGallery(cfg, imgs); return; }
    openPanel(panel => {
        const box = panelBase(panel, { title: cfg.title || '🔍 放大看' });

        // 內容從這條線開始 —— 標題 25px 的行高佔到 box.y+62，再低於這個值會被壓到
        const top = box.y + 76;

        // ---- 左：實物特寫，外面加一圈木框，像把東西端到眼前 ----
        // ★ 對齊的是「木框外緣」，不是圖本身 —— 木框往外多 FRAME 一圈，
        //   所以圖要往下讓一個 FRAME，兩欄的頂端才會切齊右邊那張註解卡。
        const IW = cfg.imgW || 260, IH = cfg.imgH || 210, FRAME = 7;
        const ix = box.x + 36 + FRAME, iy = top + FRAME;
        panel.addChild(
            new Graphics().roundRect(box.x + 36, top, IW + FRAME * 2, IH + FRAME * 2, 10)
                .fill({ color: 0x6b4a2f })
        );
        if (hasTexture(cfg.img)) {
            drawProps([{ t: 'img', src: cfg.img, x: ix, y: iy, w: IW, h: IH }], panel);
        } else {
            panel.addChild(new Graphics().roundRect(ix, iy, IW, IH, 4).fill({ color: COL.panel2 }));
        }
        // 圖下面這段是「你看到了什麼」，字級跟對話框一樣大，不是附註小字
        if (cfg.note) {
            const n = mkText(cfg.note, 16, COL.ink, { wrap: IW, lineHeight: 26 });
            n.position.set(ix, iy + IH + 16);
            panel.addChild(n);
        }

        // ---- 右：中文註解卡（英文在左邊那張圖上已經看得清清楚楚了）----
        // ★ 卡片高度照內容算，不是寫死的 —— 寫死的話文字短的時候下面會空一大塊，
        //   上下左右的留白就對不起來。先把每段文字做出來量高度，再決定卡片多高。
        const PAD = 22;                                     // 上下左右統一用這個間距
        const GAP = 12;                                     // 段落之間（跟外框留白無關）
        const px = box.x + 328, pw = 323;
        const wrap = pw - PAD * 2;
        const blocks = [];
        if (cfg.lead) blocks.push(mkText(cfg.lead, 19, COL.ink, { weight: '700', lineHeight: 28, wrap }));
        for (const line of cfg.notes || []) blocks.push(mkText(line, 16, COL.ink, { lineHeight: 26, wrap }));

        const contentH = blocks.reduce((s, t) => s + t.height, 0) + Math.max(0, blocks.length - 1) * GAP;
        // 內容真的很長時就讓卡片停在按鈕上面，不要壓過去
        const maxH = (box.y + box.h - 52) - 14 - top;
        const ph = Math.min(contentH + PAD * 2, maxH);
        panel.addChild(
            new Graphics().roundRect(px, top, pw, ph, 12)
                .fill({ color: COL.panel2 }).stroke({ width: 3, color: COL.border })
        );

        let ty = top + PAD;
        for (const t of blocks) {
            t.position.set(px + PAD, ty);
            panel.addChild(t);
            ty += t.height + GAP;
        }

        panel.addChild(mkButton({
            label: cfg.okLabel || '👍 看清楚了',
            x: box.cx - 80, y: box.y + box.h - 52, w: 160, h: 38,
            onClick: closePanel,
        }));
    });
}

// 圖冊版型：一次一張大圖，◀ ▶ 翻頁。
// 卡片是直式的，面板開太寬只會多出一片白 —— 寬度收到剛好容得下卡片和左右箭頭，
// 卡片後面再襯一塊黑板色，看起來就像把卡片從黑板上取下來看。
// 版面（960×600 設計座標）由上到下：標題 → 頁碼 → 卡片 → 說明 → 按鈕，各佔一條，不重疊。
function showGallery(cfg, imgs) {
    const captions = cfg.captions || [];
    let idx = 0;

    openPanel(panel => {
        const box = panelBase(panel, { x: 190, y: 16, w: 580, h: 568, title: cfg.title || '🔍 放大看' });

        const counter = mkText('', 14, COL.muted);
        counter.anchor.set(0.5, 0);
        counter.position.set(box.cx, box.y + 64);
        panel.addChild(counter);

        // 卡片區：襯底 ＋ 圖
        const AREA_Y = box.y + 86, AREA_H = 378;
        panel.addChild(
            new Graphics().roundRect(box.cx - 190, AREA_Y - 10, 380, AREA_H + 20, 14)
                .fill({ color: 0x3f5147 }).stroke({ width: 3, color: 0x2d3a33 })
        );
        const holder = new Container();
        panel.addChild(holder);

        const caption = mkText('', 16, COL.ink, { weight: '700', align: 'center', wrap: box.w - 60 });
        caption.anchor.set(0.5, 0);
        caption.position.set(box.cx, AREA_Y + AREA_H + 22);
        panel.addChild(caption);

        function show(n) {
            idx = (n + imgs.length) % imgs.length;
            holder.removeChildren();
            const src = imgs[idx];
            if (hasTexture(src)) {
                const tex = Assets.get(src);
                const s = Math.min(360 / tex.width, AREA_H / tex.height);
                const iw = tex.width * s, ih = tex.height * s;
                drawProps([{ t: 'img', src, x: box.cx - iw / 2, y: AREA_Y + (AREA_H - ih) / 2, w: iw, h: ih }], holder);
            } else {
                holder.addChild(
                    new Graphics().roundRect(box.cx - 150, AREA_Y, 300, AREA_H, 10).fill({ color: COL.panel2 })
                );
            }
            caption.text = captions[idx] || '';
            counter.text = `${idx + 1} / ${imgs.length}`;
        }

        const arrowY = AREA_Y + AREA_H / 2 - 26;
        panel.addChild(mkButton({
            label: '◀', x: box.x + 18, y: arrowY, w: 58, h: 52,
            size: 22, color: COL.border, textColor: COL.ink, onClick: () => show(idx - 1),
        }));
        panel.addChild(mkButton({
            label: '▶', x: box.x + box.w - 76, y: arrowY, w: 58, h: 52,
            size: 22, color: COL.border, textColor: COL.ink, onClick: () => show(idx + 1),
        }));
        panel.addChild(mkButton({
            label: cfg.okLabel || '👍 看完了',
            x: box.cx - 80, y: box.y + box.h - 54, w: 160, h: 40,
            onClick: closePanel,
        }));

        show(0);
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
        // ★ 卡片上不放 emoji 大頭 —— 只留名字、職稱和證詞（卡片高度跟著縮短）
        // 面板寬度照人數算：卡片維持 142 寬，人多就把面板撐開，而不是把卡片壓扁
        const n = CASE.suspects.length;
        const cw = 142, chh = 168, gap = 22;
        const pw = Math.min(W - 40, Math.max(680, n * cw + (n - 1) * gap + 56));
        // 卡片拿掉 emoji 之後矮了 48，面板跟著收高，才不會下半部空一大塊
        const box = panelBase(panel, {
            x: (W - pw) / 2, y: 96, w: pw, h: 400, title: '🕵️ 誰帶走了黃金貓頭鷹？',
        });
        const tip = mkText('想一想筆記裡的線索，點選你認為的犯人。', 16, COL.muted);
        tip.anchor.set(0.5, 0);
        tip.position.set(box.cx, box.y + 64);
        panel.addChild(tip);

        const startX = box.cx - (n * cw + (n - 1) * gap) / 2;
        CASE.suspects.forEach((s, i) => {
            const cx = startX + i * (cw + gap);
            const cy = box.y + 130;
            const card = new Container();
            const bg = new Graphics();
            const paint = color => bg.clear().roundRect(cx, cy, cw, chh, 20)
                .fill({ color: COL.panel2 }).stroke({ width: 3, color });
            paint(COL.border);
            const name = mkText(s.name, 19, COL.ink, { weight: '700' });
            name.anchor.set(0.5);
            name.position.set(cx + cw / 2, cy + 26);
            const role = mkText(s.role, 13, COL.muted);
            role.anchor.set(0.5);
            role.position.set(cx + cw / 2, cy + 50);
            const memo = mkText(s.testimony || '', 11, COL.muted, { wrap: cw - 24, align: 'center', lineHeight: 16 });
            memo.anchor.set(0.5, 0);
            memo.position.set(cx + cw / 2, cy + 74);
            card.addChild(bg, name, role, memo);
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
        // 破案說明很長，面板放大並讓字級自動縮到按鈕上方，才不會被按鈕壓到
        const box = panelBase(panel, { x: 90, y: 40, w: 780, h: 520, title: '🎉 案件偵破！' });
        const btnY = box.y + box.h - 62;
        const maxH = btnY - (box.y + 62) - 14;
        const body = mkText(CASE.solution, 15, COL.ink, { wrap: box.w - 76, lineHeight: 25 });
        for (const [size, lh] of [[15, 25], [14, 23], [13, 21], [12, 19]]) {
            body.style.fontSize = size;
            body.style.lineHeight = lh;
            if (body.height <= maxH) break;
        }
        body.position.set(box.x + 38, box.y + 62);
        panel.addChild(body);
        panel.addChild(mkButton({
            label: '🔁 再查一次', x: box.cx - 200, y: btnY, w: 180, h: 44,
            onClick: () => location.reload(),
        }));
        panel.addChild(mkButton({
            label: '🏠 回學習主頁', x: box.cx + 20, y: btnY, w: 180, h: 44,
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
