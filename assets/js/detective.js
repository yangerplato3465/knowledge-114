import {
    Application, Assets, Container, Graphics, Rectangle
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import {
    W, H, COL, mkText, mkButton, panelBase, drawProps,
    preloadImages, ensureSceneLoaded, hasTexture
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
// 字型和圖片沒有先後關係，兩件事同時等 —— 分開 await 的話，
// 十幾個 woff2 子集載完才會開始抓圖，白白多花一段時間。
// 圖只等「起始場景 + 全域」那批，其他場景在背景繼續載
//（見 detective-ui.js 的 preloadImages）。缺圖不影響，會退回向量替代圖形。
// 有存檔的話開場會直接進存檔記的那個場景，所以要先載「那個」場景的圖，
// 不是起始場景的 —— 否則會進到一個沒有背景的空場景（實際踩過的 bug）。
const savedScene = window.DETECTIVE_SESSION?.progress?.scene;
const bootScene = (savedScene && CASE.scenes[savedScene]) ? savedScene : CASE.startScene;

await Promise.all([
    document.fonts.ready,
    preloadImages(CASE, bootScene),
]);
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
                                              //   熱點那塊透明的判定框會把點擊吃掉
// ★ 拖曳中的物件搬到這一層 —— 它疊在 hudLayer 之上，所以往下拖去收納時，
//   物件會蓋在道具欄橫幅（和對話框）上面，而不是鑽到它們後面消失。
//   放手之後就搬回 objLayer，靜置的物件仍然在 HUD 底下。
const dragLayer = new Container();
const overlayLayer = new Container();
root.addChild(sceneLayer, boardLayer, hotLayer, objLayer, fxLayer, labelLayer, hudLayer, dragLayer, overlayLayer);
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
    .some(o => o.storeAs === id && !state.stored.has(o.id) && !state.combined.has(o.id));

// 組合零件的另一半：可能是「零件 → 本體」（dropTarget），也可能反過來查
const partnerOf = id => OBJ_INDEX[id]?.dropTarget
    ? OBJ_INDEX[OBJ_INDEX[id].dropTarget]
    : Object.values(OBJ_INDEX).find(o => o.dropTarget === id);

// 兩個半邊都收在物品欄裡時，點其中一個就直接組起來。
// ★ 零件現在可以單獨收進物品欄（解密盤的內外圈各收各的），所以一定要有這條
//   「在包包裡組裝」的路 —— 不然兩半都收進去就再也裝不起來了。
function combineInTray(id) {
    const a = OBJ_INDEX[id], b = partnerOf(id);
    if (!a || !b) return false;
    if (!state.stored.has(a.id) || !state.stored.has(b.id)) return false;

    const part = a.dropTarget ? a : b;           // 帶著 dropSay / dropGivesItem 的是零件那一半
    for (const o of [a, b]) {
        state.combined.add(o.id);
        state.stored.delete(o.id);
        const k = state.storedOrder.indexOf(o.id);
        if (k >= 0) state.storedOrder.splice(k, 1);
    }
    let msg = part.dropSay || `${a.name}和${b.name}裝在一起了。`;
    if (part.dropGivesItem && !hasItem(part.dropGivesItem)) {
        state.items.push(part.dropGivesItem);
        const it = itemById(part.dropGivesItem);
        msg += `\n🎒 取得道具：${it.icon} ${it.name}`;
    }
    say(msg);
    refreshHud();
    renderInteractives();
    saveProgress();
    return true;
}

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
            if (en.kind === 'obj') {
                if (combineInTray(en.id)) return;      // 兩個半邊都在包包裡 → 點一下就組起來
                onHotspot(OBJ_INDEX[en.id]);
                return;
            }
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
// 進度存檔
//
// 存檔寫回「開啟這一台的那組驗證碼」那筆文件（實際寫入在 detective-gate.js），
// 所以一組碼＝一組學生的進度；四組輪流用同一台電視也不會互相蓋掉。
//
// 這裡只負責把記憶體裡的狀態壓成一包純資料 —— Set 一律轉成陣列，Firestore 存不了 Set。
// SAVE_VERSION 之後改存檔格式時，用來擋掉讀不懂的舊資料。
// ============================================================
const SAVE_VERSION = 1;
const SAVE_DELAY = 1200;                       // 連續操作只寫最後一次，省掉一堆沒必要的寫入

function snapshotState() {
    return {
        v: SAVE_VERSION,
        scene: state.scene,
        clues: [...state.clues],
        items: [...state.items],
        examined: [...state.examined],
        stored: [...state.stored],
        storedOrder: [...state.storedOrder],
        combined: [...state.combined],
        solved: state.solved,
        visited: [...visitedScenes],           // 進過的場景，免得回頭時又講一次開場白
        dropPlayed: [...dropPlayed],           // 播過掉落動畫的，讀檔回來別再播一次
        objPositions: { ...objPositions },     // 玩家把東西拖到哪裡去了
        pickOrder: [...pickOrder],             // 疊放順序，少了它讀檔回來東西會互相埋住
        // 下面兩個純粹給後台清單顯示用，遊戲本身讀不到也不影響
        clueTotal: CASE.clues.length,
        sceneName: CASE.scenes[state.scene]?.name || '',
    };
}

let saveTimer = null;
function saveProgress() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        window.DETECTIVE_SESSION?.saveProgress?.(snapshotState());
    }, SAVE_DELAY);
}

// 離場之前要把還在等的那一次存檔先寫掉，不然最後 1.2 秒內做的事
// 會跟著頁面重新整理一起消失。回傳「有沒有存成功」讓 gate 決定要不要放行。
//
// force = true 是「登出並儲存」用的：不管有沒有待寫的東西都真的寫一次，
// 這樣回報的成敗是問過伺服器的結果，而不是靠「剛好沒東西要寫」推論出來的。
window.DETECTIVE_FLUSH = async (force = false) => {
    if (!saveTimer && !force) return true;
    clearTimeout(saveTimer);
    saveTimer = null;
    const save = window.DETECTIVE_SESSION?.saveProgress;
    if (!save) return false;
    return (await save(snapshotState())) !== false;
};

// 讀檔：把存檔倒回 state，成功回傳 true。
//
// 存檔是學生端寫上去的，安全規則管得住「能改哪些欄位」但管不住「裡面裝什麼」，
// 所以這裡一律當成不可信的資料在處理：認不得的 id 一個個丟掉、
// 格式不對就整份放棄從頭開始。寧可讓學生重玩，也不能卡在白畫面。
function restoreProgress(p) {
    if (!p || p.v !== SAVE_VERSION) return false;
    if (!p.scene || !CASE.scenes[p.scene]) return false;   // 場景不存在的話 renderScene 會炸
    try {
        const ids = v => (Array.isArray(v) ? v : []).filter(x => typeof x === 'string');
        const keep = (v, ok) => ids(v).filter(ok);

        state.scene = p.scene;
        state.solved = p.solved === true;
        state.clues = keep(p.clues, id => !!clueById(id));
        state.items = keep(p.items, id => !!itemById(id));
        state.examined = new Set(ids(p.examined));         // 熱點 id 只當旗標用，多認不得的也無害
        state.stored = new Set(keep(p.stored, id => !!OBJ_INDEX[id]));
        state.storedOrder = keep(p.storedOrder, id => state.stored.has(id));
        state.combined = new Set(keep(p.combined, id => !!OBJ_INDEX[id]));

        // 下面三個是 state 以外的：進過的場景、播過的掉落動畫、物件被拖到哪。
        // 少了它們畫面還是對的，只是會重講開場白、重播動畫、東西跳回原位。
        for (const id of ids(p.visited)) if (CASE.scenes[id]) visitedScenes.add(id);
        for (const id of keep(p.dropPlayed, id => !!OBJ_INDEX[id])) dropPlayed.add(id);
        pickOrder.length = 0;
        pickOrder.push(...keep(p.pickOrder, id => !!OBJ_INDEX[id]));
        for (const [id, pos] of Object.entries(p.objPositions || {})) {
            if (OBJ_INDEX[id] && Number.isFinite(pos?.x) && Number.isFinite(pos?.y)) {
                objPositions[id] = { x: pos.x, y: pos.y };
            }
        }
        return true;
    } catch (err) {
        console.warn('[detective] 存檔讀不懂，改成從頭開始', err);
        return false;
    }
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
    saveProgress();
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
    dragLayer.removeChildren();      // 上一次拖曳留在這層的節點也要清掉，否則會變成孤兒殘留在畫面上
    hotLayer.removeChildren();
    labelLayer.removeChildren();
    // 玩家搬動過的物件要疊在上層，最後拿起的那個排最上面。
    // ★ 少了這段排序，重畫就會退回案件資料的宣告順序 —— 把「宣告在前面的東西」
    //   放到「宣告在後面的東西」上面之後，只要畫面重繪一次，前者就被埋住、
    //   再也點不到也拖不動（放手當下是好的，過一會兒突然壞掉，很難查）。
    //   pickOrder 裡沒有的是 -1，會排在最前面（＝最底層）並保持宣告順序。
    const drawList = (CASE.scenes[state.scene].objects || [])
        .filter(o => !state.stored.has(o.id)      // 收進物品欄的不畫
                  && !state.combined.has(o.id)    // 已經組合掉的不畫
                  && !isHidden(o))                // 還沒被翻出來的不畫
        .sort((a, b) => pickOrder.indexOf(a.id) - pickOrder.indexOf(b.id));
    for (const o of drawList) objLayer.addChild(makeObject(o));
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
const pickOrder = [];                          // 玩家拿起過的物件 id，越後面＝疊得越上層（見 renderInteractives）
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
    c.label = label;                           // 拖曳時名牌要跟著物件一起搬到 dragLayer
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
        // 剛拿起來的排到最上層，之後重畫也維持這個疊法
        const k = pickOrder.indexOf(o.id);
        if (k >= 0) pickOrder.splice(k, 1);
        pickOrder.push(o.id);
        drag = { o, node: c };
        const g = root.toLocal(e.global);
        dragOff = { x: g.x - c.x, y: g.y - c.y };
        dragFrom = { x: c.x, y: c.y };
        dragDist = 0;
        // 拖曳中搬到最上層：蓋過道具欄橫幅和對話框，才看得到自己拖到哪裡了
        dragLayer.addChild(c);
        dragLayer.addChild(c.label);
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

    // ★ 物件自己的 pointerup 會先跑，冒泡到 stage（這裡）之前就可能已經
    //   onHotspot → award → renderInteractives()，把圖層清空、另外造了一顆新的。
    //   這時手上這顆已經是沒有 parent 的孤兒，再 addChild 回去，
    //   畫面上就會同時出現新舊兩顆一模一樣的東西。removeChildren() 會把
    //   parent 設成 null，正好可以拿來判斷「我這顆是不是已經被換掉了」。
    if (!node.parent) return;

    node.cursor = 'grab';
    node.art.scale.set(1);
    node.art.alpha = 1;
    // 放手就搬回原本的圖層（沒有重畫的那幾條路留在 dragLayer 的話，
    // 節點會蓋在道具欄橫幅和對話框上面）
    objLayer.addChild(node);
    labelLayer.addChild(node.label);
    if (dragDist < DRAG_SLOP) return;                  // 只是點一下，位置不動

    const cx = node.x + o.w / 2, cy = node.y + o.h / 2;

    // 1) 拖到另一半上面 → 組裝（轉輪拖到底座，或反過來把底座拖到轉輪上）
    // ★ 兩個方向都要能組。以前只認 o.dropTarget，等於只有「零件拖到本體」算數；
    //   會沒事純粹是因為零件剛好宣告在後面、永遠疊在上層抓得到。自從疊放順序
    //   改成跟著玩家的拿取順序走（見 renderInteractives），那個巧合就不成立了 ——
    //   把底座拖到轉輪上，底座會蓋住轉輪，而這個方向又不組裝，玩家就卡在原地。
    const mate = partnerOf(o.id);
    if (mate && !state.stored.has(mate.id) && !state.combined.has(mate.id)) {
        const tp = objPositions[mate.id] || { x: mate.x, y: mate.y };
        // 另一半還沒被翻出來時不能組合，否則會對著一塊空地「裝上去」
        const hit = !isHidden(mate) &&
                    node.x < tp.x + mate.w && tp.x < node.x + o.w &&
                    node.y < tp.y + mate.h && tp.y < node.y + o.h;
        if (hit) {
            // 帶著 dropSay / dropGivesItem 的是「零件」那一半，組好之後它消失；
            // 另一半留在場上換成組好的樣子（跟 combineInTray 同一套判斷）
            const part = o.dropTarget ? o : mate;
            state.combined.add(part.id);
            // 留在場上的如果是玩家剛拖的這一個，位置要記下來，
            // 否則重畫時它會跳回資料裡的初始座標
            if (part.id !== o.id) objPositions[o.id] = { x: node.x, y: node.y };

            let msg = part.dropSay || '';
            if (part.dropGivesItem && !hasItem(part.dropGivesItem)) {
                state.items.push(part.dropGivesItem);
                const it = itemById(part.dropGivesItem);
                // 組好的東西還擺在場景裡（storeAs），這時候物品欄不會多一格 ——
                // 別報「取得道具」，改成告訴玩家要收起來得自己拖下去
                msg += stillOnStage(part.dropGivesItem)
                    ? `\n（${it.name}就擺在原地。想收進物品欄的話，把它拖到下面那排格子裡。）`
                    : `\n🎒 取得道具：${it.icon} ${it.name}`;
            }
            say(msg);
            refreshHud();
            renderInteractives();
            saveProgress();
            return;
        }
        // 沒對準就往下走 —— 組合零件也可以單獨收進物品欄，
        // 兩個半邊都收進去之後在包包裡點一下就能組起來（見 combineInTray）
    }

    // 2) 拖到下方 → 收進物品欄
    if (cy > TRAY_Y && cx > 30 && cx < 930) {
        // storeAs：這個物件對應到某個道具（裝好的解密盤 → 道具 dial）。
        //   已經拿到那個道具時只從場景移除、不另外佔一格，免得同一樣東西出現兩次；
        //   還沒組好就當成普通零件收，之後在物品欄裡組裝。
        if (o.storeAs && hasItem(o.storeAs)) {
            const it = itemById(o.storeAs);
            state.stored.add(o.id);
            delete objPositions[o.id];
            say(`🎒 ${o.name}收起來了。要用的時候點道具欄裡的 ${it.icon} ${it.name}。`);
            refreshHud();
            renderInteractives();
            saveProgress();
            return;
        }
        state.stored.add(o.id);
        state.storedOrder.push(o.id);
        delete objPositions[o.id];
        // 另一半也在包包裡的話，直接把「點一下就能組」講出來，免得玩家以為卡住了
        const partner = partnerOf(o.id);
        say(partner && state.stored.has(partner.id)
            ? `🎒 ${o.name}收進物品欄了。${partner.name}也在裡面 —— 點其中一個就能把它們裝起來。`
            : `🎒 ${o.name}收進物品欄了。點下方的圖示隨時查看。`);
        refreshHud();
        renderInteractives();
        saveProgress();
        return;
    }

    // 3) 一般放下：別藏到對話框或物品欄後面
    const maxY = (dlgOpen ? 446 : TRAY_TOP - 6) - o.h;
    if (node.y > maxY) { node.y = Math.max(60, maxY); node.placeLabel(); }
    objPositions[o.id] = { x: node.x, y: node.y };
    saveProgress();
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
    // ★ reopen: true 的謎題解開之後還是打得開（推理板要能隨時回去看比對結果，
    //   破案之後也一樣）——面板會保留玩家填過的 ✓／✗。
    if (h.puzzle && (!state.examined.has(h.id) || h.reopen)) {
        say(state.examined.has(h.id) ? (txt(h.after) || lookOf(h)) : lookOf(h));
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
    saveProgress();

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
    // 目標場景的圖通常在背景早就載完了，這個 Promise 會立刻 resolve；
    // 萬一還沒好（網路慢、剛開場就衝去下一個場景），就停在全黑等它，
    // 而不是切過去看到一個沒有背景的空場景。
    let ready = false;
    ensureSceneLoaded(CASE, id).then(() => { ready = true; });

    let t = 0, switched = false;
    const tick = ticker => {
        t += ticker.deltaMS;
        if (t < 200) {
            fader.alpha = t / 200;
        } else if (!switched) {
            if (!ready) { t = 200; return; }       // 全黑不動，等圖到齊
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
            // 重看時再按一次「檢查推理」不該重新宣布一次破案（也會再觸發一次
            // 「線索蒐集完成」的提示），只把已調查過的說法講一遍就好
            if (state.examined.has(h.id)) { say(txt(h.after) || lookOf(h)); return; }
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
        // 面板放寬到 760：最長的那行說明單行要 676px，寬度不夠就會折行往下擠到按鈕上。
        // 說明能排成一行，省下來的高度就全部還給卡片（卡片是直式的，高度才是瓶頸）。
        const box = panelBase(panel, { x: 100, y: 16, w: 760, h: 568, title: cfg.title || '🔍 放大看' });
        const CAP_WRAP = box.w - 60;

        // ★ 由下往上排版，各佔一條、互不重疊：
        //   標題 → 頁碼 → 卡片 → 說明 → 按鈕
        //   說明先量過「所有頁裡最高的那一段」再定高度 —— 逐頁改高度的話，
        //   翻頁時上面的卡片會跟著上下跳。
        const BTN_H = 40, GAP = 14;
        const btnY = box.y + box.h - 54;
        const probe = mkText('', 16, COL.ink, { weight: '700', align: 'center', wrap: CAP_WRAP });
        let capH = 26;
        for (const c of captions) { probe.text = c || ''; capH = Math.max(capH, probe.height); }
        probe.destroy();
        const capY = btnY - GAP - capH;

        const counter = mkText('', 14, COL.muted);
        counter.anchor.set(0.5, 0);
        counter.position.set(box.cx, box.y + 62);
        panel.addChild(counter);

        // 卡片區：襯底 ＋ 圖。襯底往外多 10，所以起點要留在頁碼下面 24 的地方
        const AREA_Y = box.y + 96;
        const AREA_H = capY - GAP - AREA_Y;
        panel.addChild(
            new Graphics().roundRect(box.cx - 190, AREA_Y - 10, 380, AREA_H + 20, 14)
                .fill({ color: 0x3f5147 }).stroke({ width: 3, color: 0x2d3a33 })
        );
        const holder = new Container();
        panel.addChild(holder);

        const caption = mkText('', 16, COL.ink, { weight: '700', align: 'center', wrap: CAP_WRAP });
        caption.anchor.set(0.5, 0);
        caption.position.set(box.cx, capY);
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
            x: box.cx - 80, y: btnY, w: 160, h: BTN_H,
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
        saveProgress();
        showEnding();
    } else {
        closePanel();
        say(`❌ 不對喔 —— ${s.wrong}`);
    }
}

// 結局：左邊擺失竊的本尊（ending.img），右邊講故事。
// 沒給 ending.img 就退回原本的滿版單欄，版面不會垮。
function showEnding() {
    openPanel(panel => {
        // 面板吃滿畫面（960×600 留 32 的邊）—— 左邊那尊本尊要夠大，右邊的故事才不會被壓成小字
        const box = panelBase(panel, { x: 90, y: 32, w: 780, h: 536, title: '🎉 案件偵破！' });
        const btnY = box.y + box.h - 62;
        const top = box.y + 62;
        const end = CASE.ending || {};

        // ---- 左欄：本尊 ----
        // 玩家找了一整場都只看到空底座，最後這一眼才是報酬 —— 高度給滿到按鈕上方
        let textX = box.x + 38, textW = box.w - 76;
        if (hasTexture(end.img)) {
            const tex = Assets.get(end.img);
            const capH = end.caption ? 40 : 0;
            const maxIH = btnY - 16 - capH - top;
            const COL_W = 210;
            const s = Math.min(COL_W / tex.width, maxIH / tex.height);
            const iw = tex.width * s, ih = tex.height * s;
            const ix = box.x + 40 + (COL_W - iw) / 2;
            drawProps([{ t: 'img', src: end.img, x: ix, y: top, w: iw, h: ih }], panel);
            if (end.caption) {
                const cap = mkText(end.caption, 13, COL.muted, { align: 'center', wrap: COL_W, lineHeight: 19 });
                cap.anchor.set(0.5, 0);
                cap.position.set(box.x + 40 + COL_W / 2, top + ih + 12);
                panel.addChild(cap);
            }
            textX = box.x + 40 + COL_W + 28;
            textW = box.x + box.w - 38 - textX;
        }

        // ---- 右欄：破案的故事（字級自動縮到按鈕上方，長文也壓不到按鈕）----
        const maxH = btnY - top - 14;
        const body = mkText(CASE.solution, 15, COL.ink, { wrap: textW, lineHeight: 25 });
        for (const [size, lh] of [[15, 25], [14, 23], [13, 21], [12, 19], [11, 17]]) {
            body.style.fontSize = size;
            body.style.lineHeight = lh;
            if (body.height <= maxH) break;
        }
        body.position.set(textX, top);
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

// ---- 開場 ----
// 有讀得回來的存檔就接續上次（跳過案件簡報，直接回到現場），
// 沒有或壞掉就當新遊戲，照原本的流程走。
const sess = window.DETECTIVE_SESSION;
const resumed = restoreProgress(sess?.progress);
const firstScene = resumed ? state.scene : CASE.startScene;

// 上面已經照存檔預載過一次，這裡通常立刻 resolve。但存檔如果被判定壞掉、
// 退回起始場景，預載的就不是這一個了 —— 所以還是要等一次，理由跟
// transitionTo() 裡那段一樣：寧可多等，也不要畫出一個沒有背景的空場景。
await ensureSceneLoaded(CASE, firstScene);

renderScene(firstScene);
refreshHud();

if (resumed) {
    // 蓋掉 renderScene 剛講的 introBack，改成講「接續上次」，
    // 老師一眼就能確認讀檔有生效、而且讀到的是正確那一組
    say(`📁 接續上次的進度${sess?.label ? `（${sess.label}）` : ''}\n`
        + `目前線索 ${state.clues.length}/${CASE.clues.length}，繼續調查吧！`);
} else {
    showBrief();
}

// 存檔讀不到時（斷線、碼被刪或過期）遊戲照樣能玩，但這次不會被記錄。
// 一定要講出來，否則學生玩了一整堂課才發現沒存到。
if (sess?.saveBlocked) {
    setTimeout(() => say('⚠️ 連不上進度伺服器 —— 這次玩的內容不會被記錄下來，請先告訴老師。'), 5000);
}
