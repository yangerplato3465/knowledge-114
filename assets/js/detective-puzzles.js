import { Container, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { COL, mkText, mkButton } from './detective-ui.js';

// ============================================================
// 偵探事件簿 · 三個學習謎題
// 每個謎題都是 (ctx, panel, box, cfg, onSolve) => cleanup?
//   ctx  : { app, root, say }
//   panel: 要把東西加進去的容器（已經有白底和標題了）
//   box  : { x, y, w, h, cx } 面板可用範圍
//   cfg  : 案件資料檔裡的 puzzle 設定
//   onSolve: 解開時呼叫（引擎會關面板、給線索）
// 回傳值若是函式，關面板時會被呼叫（用來移除事件監聽）。
// ============================================================

// ------------------------------------------------------------
// 1) 凱撒密碼：文字字元位移
// ------------------------------------------------------------
function caesar(ctx, panel, box, cfg, onSolve) {
    const cipher = cfg.cipher.toUpperCase();
    const answer = cfg.answer.toUpperCase();
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let shift = 0;

    // 往回轉 n 格
    const decode = n => cipher.replace(/[A-Z]/g, ch =>
        String.fromCharCode((ch.charCodeAt(0) - 65 - n + 26) % 26 + 65));

    const tip = mkText('轉動轉盤，把每個字母「往回移」，直到出現看得懂的英文。', 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 62);
    panel.addChild(tip);

    // 密文
    panel.addChild(
        new Graphics().roundRect(box.x + 60, box.y + 92, box.w - 120, 54, 14)
            .fill({ color: COL.panel2 }).stroke({ width: 2, color: COL.border })
    );
    const cipherText = mkText(cipher.split('').join(' '), 27, COL.muted, { weight: '700' });
    cipherText.anchor.set(0.5);
    cipherText.position.set(box.cx, box.y + 119);
    panel.addChild(cipherText);

    // 轉盤控制
    const shiftText = mkText('', 20, COL.ink, { weight: '700' });
    shiftText.anchor.set(0.5);
    shiftText.position.set(box.cx, box.y + 180);
    panel.addChild(shiftText);
    panel.addChild(mkButton({
        label: '◀', x: box.cx - 150, y: box.y + 160, w: 54, h: 40,
        color: COL.border, textColor: COL.ink, onClick: () => setShift(shift - 1),
    }));
    panel.addChild(mkButton({
        label: '▶', x: box.cx + 96, y: box.y + 160, w: 54, h: 40,
        color: COL.border, textColor: COL.ink, onClick: () => setShift(shift + 1),
    }));

    // 解出來的明文
    const plainText = mkText('', 27, COL.ink, { weight: '700' });
    plainText.anchor.set(0.5);
    plainText.position.set(box.cx, box.y + 232);
    panel.addChild(plainText);

    // 字母對照表（上：原本的字母 下：轉動後對到誰）
    const stripY = box.y + 282;
    panel.addChild(mkText('密文', 13, COL.muted)).position.set(box.x + 26, stripY - 2);
    panel.addChild(mkText('明文', 13, COL.muted)).position.set(box.x + 26, stripY + 30);
    const lower = [];
    for (let i = 0; i < 26; i++) {
        const x = box.x + 74 + i * 23;
        const up = mkText(ALPHA[i], 16, COL.muted);
        up.anchor.set(0.5);
        up.position.set(x, stripY + 6);
        const dn = mkText(ALPHA[i], 16, COL.ink, { weight: '700' });
        dn.anchor.set(0.5);
        dn.position.set(x, stripY + 38);
        panel.addChild(up, dn);
        lower.push(dn);
    }

    const hint = mkText(cfg.hint || '', 14, COL.muted, { wrap: box.w - 120, align: 'center' });
    hint.anchor.set(0.5, 0);
    hint.position.set(box.cx, box.y + 348);
    panel.addChild(hint);

    const okBtn = mkButton({
        label: `✅ 就是這個！ ${cfg.translate || ''}`, x: box.cx - 130, y: box.y + box.h - 66, w: 260, h: 46,
        size: 17, onClick: () => onSolve(),
    });
    okBtn.visible = false;
    panel.addChild(okBtn);

    function setShift(n) {
        shift = (n + 26) % 26;
        const plain = decode(shift);
        shiftText.text = `往回移 ${shift} 格`;
        plainText.text = plain.split('').join(' ');
        for (let i = 0; i < 26; i++) lower[i].text = ALPHA[(i - shift + 26) % 26];

        const solved = plain === answer;
        plainText.style.fill = solved ? COL.ok : COL.ink;
        okBtn.visible = solved;
    }
    setShift(0);
}

// ------------------------------------------------------------
// 2) 紅藍濾鏡：光學疊色觀察
//    藍色印的字要用「紅色濾鏡」才看得到（紅色的干擾線會消失），
//    紅色印的字則要用「藍色濾鏡」。把濾鏡拖到卡片上找找看。
// ------------------------------------------------------------
function filter(ctx, panel, box, cfg, onSolve) {
    const card = { x: box.x + 46, y: box.y + 84, w: 420, h: 268 };
    const zoneA = { x: card.x, y: card.y, w: card.w, h: card.h / 2 };              // 藍字（用紅濾鏡看）
    const zoneB = { x: card.x, y: card.y + card.h / 2, w: card.w, h: card.h / 2 }; // 紅字（用藍濾鏡看）
    const read = { red: false, blue: false };

    const tip = mkText('把濾鏡拖到卡片上，看看哪些線條會消失。', 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 58);
    panel.addChild(tip);

    // ---- 卡片本體（沒有濾鏡時就是一團亂線）----
    panel.addChild(
        new Graphics().roundRect(card.x, card.y, card.w, card.h, 10)
            .fill({ color: 0xfdf8ee }).stroke({ width: 3, color: COL.border })
    );
    const msgA = mkText(cfg.throughRed, 46, COL.blue, { weight: '700' });
    msgA.anchor.set(0.5);
    msgA.position.set(card.x + card.w / 2, zoneA.y + zoneA.h / 2);
    const msgB = mkText(cfg.throughBlue, 46, COL.red, { weight: '700' });
    msgB.anchor.set(0.5);
    msgB.position.set(card.x + card.w / 2, zoneB.y + zoneB.h / 2);
    panel.addChild(msgA, msgB);

    // 干擾線：藍字上面蓋紅線、紅字上面蓋藍線
    const noise = (zone, color, seed) => {
        const g = new Graphics();
        let s = seed;
        const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < 46; i++) {
            const x = zone.x + 8 + rnd() * (zone.w - 16);
            const y = zone.y + 8 + rnd() * (zone.h - 16);
            g.moveTo(x, y).lineTo(x + (rnd() - 0.5) * 46, y + (rnd() - 0.5) * 34);
        }
        return g.stroke({ width: 3, color, cap: 'round' });
    };
    panel.addChild(noise(zoneA, COL.red, 7), noise(zoneB, COL.blue, 31));

    // ---- 濾鏡底下看到的樣子（被遮罩裁切）----
    const makeReveal = (zone, tint, msg, msgColor) => {
        const c = new Container();
        c.addChild(new Graphics().rect(zone.x, zone.y, zone.w, zone.h).fill({ color: tint }));
        const t = mkText(msg, 46, msgColor, { weight: '700' });
        t.anchor.set(0.5);
        t.position.set(zone.x + zone.w / 2, zone.y + zone.h / 2);
        c.addChild(t);
        return c;
    };
    const revealA = makeReveal(zoneA, 0xf2b9b9, cfg.throughRed, 0x1b2350);   // 紅濾鏡下：藍字變黑
    const revealB = makeReveal(zoneB, 0xb9c8f2, cfg.throughBlue, 0x3a1414);  // 藍濾鏡下：紅字變黑
    panel.addChild(revealA, revealB);

    // ---- 兩片可以拖的濾鏡 ----
    const FW = 150, FH = 116;
    const mkFilter = (label, color, sx, sy) => {
        const g = new Container();
        g.position.set(sx, sy);
        g.addChild(
            new Graphics().roundRect(0, 0, FW, FH, 10)
                .fill({ color, alpha: 0.42 }).stroke({ width: 4, color })
        );
        const t = mkText(label, 14, 0x3f3730, { weight: '700' });
        t.anchor.set(0.5);
        t.position.set(FW / 2, FH - 14);
        g.addChild(t);
        g.eventMode = 'static';
        g.cursor = 'grab';
        return g;
    };
    const redF = mkFilter('紅色濾鏡', COL.red, box.x + 500, box.y + 90);
    const blueF = mkFilter('藍色濾鏡', COL.blue, box.x + 500, box.y + 228);
    const redMask = new Graphics().rect(0, 0, FW, FH).fill({ color: 0xffffff });
    const blueMask = new Graphics().rect(0, 0, FW, FH).fill({ color: 0xffffff });
    panel.addChild(redMask, blueMask, redF, blueF);
    revealA.mask = redMask;
    revealB.mask = blueMask;

    const okBtn = mkButton({
        label: '✅ 兩段訊息都看到了', x: box.cx - 130, y: box.y + box.h - 58, w: 260, h: 42,
        size: 16, onClick: () => onSolve(),
    });
    okBtn.visible = false;
    panel.addChild(okBtn);

    const inZone = (f, z) => {
        const cx = f.x + FW / 2, cy = f.y + FH / 2;
        return cx > z.x && cx < z.x + z.w && cy > z.y && cy < z.y + z.h;
    };
    function sync() {
        redMask.position.set(redF.x, redF.y);
        blueMask.position.set(blueF.x, blueF.y);
        if (inZone(redF, zoneA)) read.red = true;
        if (inZone(blueF, zoneB)) read.blue = true;
        okBtn.visible = read.red && read.blue;
    }
    sync();

    // 拖曳
    let drag = null, off = { x: 0, y: 0 };
    const onDown = f => e => {
        drag = f;
        f.cursor = 'grabbing';
        panel.addChild(f);                       // 拉到最上層
        const p = ctx.root.toLocal(e.global);
        off = { x: p.x - f.x, y: p.y - f.y };
    };
    const onMove = e => {
        if (!drag) return;
        const p = ctx.root.toLocal(e.global);
        drag.position.set(p.x - off.x, p.y - off.y);
        sync();
    };
    const onUp = () => { if (drag) drag.cursor = 'grab'; drag = null; };

    redF.on('pointerdown', onDown(redF));
    blueF.on('pointerdown', onDown(blueF));
    ctx.app.stage.on('globalpointermove', onMove);
    ctx.app.stage.on('pointerup', onUp);
    ctx.app.stage.on('pointerupoutside', onUp);

    return () => {
        ctx.app.stage.off('globalpointermove', onMove);
        ctx.app.stage.off('pointerup', onUp);
        ctx.app.stage.off('pointerupoutside', onUp);
    };
}

// ------------------------------------------------------------
// 3) 邏輯矩陣：證詞與物證交叉比對
//    每格點一下換成 ⭕，再點一下換成 ❌，再點一下清空。
// ------------------------------------------------------------
function logic(ctx, panel, box, cfg, onSolve) {
    const rows = cfg.rows, cols = cfg.cols;
    const marks = rows.map(() => cols.map(() => 0));   // 0 空白 / 1 ⭕ / 2 ❌
    const MARK = ['', '⭕', '❌'];

    cfg.hints.forEach((h, i) => {
        const t = mkText(`${'①②③④⑤'[i]} ${h}`, 14, COL.ink, { wrap: box.w - 92, lineHeight: 21 });
        t.position.set(box.x + 46, box.y + 56 + i * 44);
        panel.addChild(t);
    });

    const gx = box.x + 46, gy = box.y + 196, labelW = 136, cw = 148, ch = 52;

    cols.forEach((c, j) => {
        const t = mkText(c, 16, COL.ink, { weight: '700' });
        t.anchor.set(0.5);
        t.position.set(gx + labelW + j * cw + cw / 2, gy + 16);
        panel.addChild(t);
    });

    const cellTexts = [];
    rows.forEach((r, i) => {
        const y = gy + 36 + i * ch;
        const rt = mkText(r, 16, COL.ink, { weight: '700' });
        rt.anchor.set(0, 0.5);
        rt.position.set(gx + 6, y + ch / 2);
        panel.addChild(rt);
        cellTexts.push([]);

        cols.forEach((c, j) => {
            const x = gx + labelW + j * cw;
            const cell = new Container();
            const bg = new Graphics().roundRect(x + 4, y + 4, cw - 10, ch - 10, 10)
                .fill({ color: COL.panel2 }).stroke({ width: 2, color: COL.border });
            const mk = mkText('', 24, COL.ink);
            mk.anchor.set(0.5);
            mk.position.set(x + cw / 2, y + ch / 2);
            cell.addChild(bg, mk);
            cell.eventMode = 'static';
            cell.cursor = 'pointer';
            cell.on('pointertap', () => {
                marks[i][j] = (marks[i][j] + 1) % 3;
                mk.text = MARK[marks[i][j]];
                result.text = '';
            });
            panel.addChild(cell);
            cellTexts[i].push(mk);
        });
    });

    const result = mkText('', 15, COL.red, { weight: '700' });
    result.anchor.set(0.5);
    result.position.set(box.cx, box.y + box.h - 74);
    panel.addChild(result);

    panel.addChild(mkButton({
        label: '🔍 檢查推理', x: box.cx - 90, y: box.y + box.h - 56, w: 180, h: 42,
        onClick: () => {
            const ok = rows.every((r, i) => {
                const circles = cols.filter((c, j) => marks[i][j] === 1);
                return circles.length === 1 && circles[0] === cfg.solution[r];
            });
            if (ok) onSolve();
            else result.text = '還不對喔！每個人都只能有一個 ⭕，再對照一次線索。';
        },
    }));
}

export const PUZZLES = { caesar, filter, logic };
