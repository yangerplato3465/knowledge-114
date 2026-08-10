import {
    Assets, Container, Graphics, Sprite, Text
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';

// ============================================================
// 偵探事件簿 · 共用介面工具
// 給 detective.js（引擎）和 detective-puzzles.js（謎題）一起用，
// 這樣文字、按鈕、面板的樣式只有一份。
// ============================================================

export const W = 960, H = 600;                 // 設計尺寸（所有座標都以此為準）
export const FONT = "'Noto Sans TC', 'Fredoka', sans-serif";

export const COL = {
    panel: 0xfffdf9,
    panel2: 0xfaf3ea,
    border: 0xe4d9cd,
    ink: 0x4a3f35,
    muted: 0x8a7b6d,
    bar: 0x3f3730,
    gold: 0xf0b429,
    mint: 0x7fbf9a,
    hint: 0xffd166,
    red: 0xe23b3b,
    blue: 0x2f5bd0,
    ok: 0x3f9c62,
};

export function mkText(str, size, color, opt = {}) {
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
            breakWords: true,                  // 中文沒有空格，要靠這個換行
            lineHeight: opt.lineHeight || Math.round(size * 1.6),
            letterSpacing: opt.spacing || 0,
        },
    });
}

export function mkButton({ label, x, y, w, h, color = COL.gold, textColor = COL.bar, size = 16, onClick }) {
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
    c.on('pointertap', () => { if (!c.locked && onClick) onClick(); });
    c.setLabel = s => { t.text = s; };
    c.setLocked = v => {
        c.locked = v;
        c.alpha = v ? 0.45 : 1;
        c.cursor = v ? 'default' : 'pointer';
    };
    return c;
}

// 覆蓋面板的底：白卡片 + 標題，回傳可用的內容範圍
// bg 給了正式美術底圖（例如推理板的羊皮紙）就整張鋪在面板範圍上 ——
// 撕邊、圖釘那些都畫在圖裡，所以不再另外描白卡片的圓角框。缺圖時自動退回白卡片。
// titleY 是標題離面板上緣的距離，底圖上緣有東西（推理板那顆圖釘）時往下讓一點
export function panelBase(panel, { x = 140, y = 64, w = 680, h = 472, title, bg, titleY = 22 }) {
    if (hasTexture(bg)) {
        drawProps([{ t: 'img', src: bg, x, y, w, h }], panel);
    } else {
        panel.addChild(
            new Graphics().roundRect(x, y, w, h, 28)
                .fill({ color: COL.panel }).stroke({ width: 6, color: COL.border })
        );
    }
    const t = mkText(title, 25, COL.ink, { weight: '700' });
    t.anchor.set(0.5, 0);
    t.position.set(x + w / 2, y + titleY);
    panel.addChild(t);
    return { x, y, w, h, cx: x + w / 2 };
}

// ============================================================
// 場景美術：把資料檔裡的 props 畫出來
// 之後換成正式美術素材時，只要把 props 換成 { t:'img', src:'...' } 即可，
// 熱點座標完全不用動。
// ============================================================
export function drawProps(list, layer) {
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
                node = mkText(p.s, p.size, p.c, { weight: p.weight, wrap: p.wrap, spacing: p.spacing });
                node.anchor.set(p.ax ?? 0, p.ay ?? 0);
                node.position.set(p.x, p.y);
                if (p.rot) node.rotation = p.rot;
                break;
            case 'img': {
                // 正式素材用；圖還沒放進來時就跳過，不會壞掉
                const tex = Assets.cache.has(p.src) ? Assets.get(p.src) : null;
                if (!tex) break;
                node = new Sprite(tex);
                node.position.set(p.x, p.y);
                if (p.w) node.width = p.w;
                if (p.h) node.height = p.h;
                if (p.anchor) node.anchor.set(p.anchor);
                if (p.a != null) node.alpha = p.a;
                // tint：把素材壓成場景的色溫。平光的向量素材直接貼進畫好的房間裡
                // 會亮得像貼紙，乘上一個暖色就融進去了
                if (p.tint != null) node.tint = p.tint;
                break;
            }
        }
        if (node) layer.addChild(node);
    }
}

// 把資料檔裡所有 { t:'img' } 的圖先載進來（缺圖不會讓遊戲當掉）
// 掃描範圍：場景背景、props、物件的 art / artDone、謎題畫作的四種濾鏡圖，
// 還有放大檢視面板（zoom.img）用的特寫圖。
const PAINT_KEYS = ['img', 'imgRed', 'imgBlue', 'imgPurple'];

export async function preloadImages(caseData) {
    const srcs = new Set();
    const fromProps = list => {
        for (const p of list || []) if (p.t === 'img' && p.src) srcs.add(p.src);
    };
    const fromPuzzle = puzzle => {
        for (const p of puzzle?.paintings || []) {
            for (const k of PAINT_KEYS) if (p[k]) srcs.add(p[k]);
        }
        // 凱撒盤的正式美術：信紙、外圈底座、內轉盤；bgImg 是謎題面板的底圖
        for (const k of ['bgImg', 'noteImg', 'dialImg', 'dialInnerImg']) {
            if (puzzle?.[k]) srcs.add(puzzle[k]);
        }
    };
    if (caseData.assistantImg) srcs.add(caseData.assistantImg);   // 對話框左邊的助手立繪
    if (caseData.ending?.img) srcs.add(caseData.ending.img);       // 結局面板裡的失竊本尊
    // 放大檢視可以給單張（img）或一疊（imgs）
    const fromZoom = z => {
        if (!z) return;
        if (z.img) srcs.add(z.img);
        for (const s of z.imgs || []) srcs.add(s);
    };
    for (const sc of Object.values(caseData.scenes)) {
        if (sc.bg) srcs.add(sc.bg);
        fromProps(sc.props);
        for (const r of sc.records || []) if (r.img) srcs.add(r.img);   // 黑板上的證詞紀錄表
        for (const o of sc.objects || []) {
            fromProps(o.art);
            fromProps(o.artDone);
            fromPuzzle(o.puzzle);
            fromZoom(o.zoom);
        }
        for (const h of sc.hotspots || []) {
            fromPuzzle(h.puzzle);
            fromZoom(h.zoom);
        }
    }
    for (const src of srcs) {
        try { await Assets.load(src); }
        catch { console.warn('[偵探事件簿] 找不到素材，先用替代圖形：', src); }
    }
}

// 圖載進來了沒？（沒有就讓呼叫端退回向量替代圖形）
export const hasTexture = src => !!src && Assets.cache.has(src);
