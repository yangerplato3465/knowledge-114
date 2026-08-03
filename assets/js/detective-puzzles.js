import { Circle, Container, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { COL, mkText, mkButton } from './detective-ui.js';

// ============================================================
// 偵探事件簿 · 四個學習謎題
// 每個謎題都是 (ctx, panel, box, cfg, onSolve) => cleanup?
//   ctx  : { app, root, say }
//   panel: 要把東西加進去的容器（已經有白底和標題了）
//   box  : { x, y, w, h, cx } 面板可用範圍
//   cfg  : 案件資料檔裡的 puzzle 設定
//   onSolve: 解開時呼叫（引擎會關面板、給線索）
// 回傳值若是函式，關面板時會被呼叫（用來移除事件監聽）。
// ============================================================

// ------------------------------------------------------------
// 1) 凱撒位移密碼：雙層解密盤（外圈密文、內圈明文）
//    轉動內圈把每個字母往回推 N 位。
// ------------------------------------------------------------
function caesar(ctx, panel, box, cfg, onSolve) {
    const cipher = cfg.cipher.toUpperCase();
    const answer = cfg.answer.toUpperCase();
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const STEP = (Math.PI * 2) / 26;
    let shift = 0;

    // 往回轉 n 格
    const decode = n => cipher.replace(/[A-Z]/g, ch =>
        String.fromCharCode((ch.charCodeAt(0) - 65 - n + 26) % 26 + 65));

    const tip = mkText('轉動解密盤的內圈（拖曳或按 ◀ ▶），把紙條上的字母「往回推」。', 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 56);
    panel.addChild(tip);

    // ---- 左邊：雙層解密盤 ----
    const CX = box.x + 170, CY = box.y + 262, R_OUT = 116, R_IN = 84;
    const dial = new Container();
    dial.position.set(CX, CY);
    panel.addChild(dial);

    dial.addChild(new Graphics().circle(0, 0, R_OUT + 8).fill({ color: COL.border }));
    dial.addChild(new Graphics().circle(0, 0, R_OUT).fill({ color: COL.panel2 }));
    for (let i = 0; i < 26; i++) {
        const a = i * STEP - Math.PI / 2;
        const t = mkText(ALPHA[i], 14, COL.muted, { weight: '700' });
        t.anchor.set(0.5);
        t.position.set(Math.cos(a) * (R_OUT - 15), Math.sin(a) * (R_OUT - 15));
        dial.addChild(t);
    }

    const inner = new Container();
    dial.addChild(inner);
    inner.addChild(
        new Graphics().circle(0, 0, R_IN)
            .fill({ color: COL.gold, alpha: 0.2 }).stroke({ width: 3, color: COL.gold })
    );
    const innerLetters = [];
    for (let i = 0; i < 26; i++) {
        const a = i * STEP - Math.PI / 2;
        const t = mkText(ALPHA[i], 15, COL.ink, { weight: '700' });
        t.anchor.set(0.5);
        t.position.set(Math.cos(a) * (R_IN - 15), Math.sin(a) * (R_IN - 15));
        inner.addChild(t);
        innerLetters.push(t);
    }
    dial.addChild(new Graphics().circle(0, 0, 21).fill({ color: COL.bar }));
    const owl = mkText('🦉', 22, 0xffffff);
    owl.anchor.set(0.5);
    dial.addChild(owl);

    // 頂端的對位標記
    dial.addChild(
        new Graphics().poly([0, -R_OUT - 14, -9, -R_OUT - 28, 9, -R_OUT - 28]).fill({ color: COL.red })
    );

    dial.eventMode = 'static';
    dial.cursor = 'grab';
    dial.hitArea = new Circle(0, 0, R_OUT);

    panel.addChild(mkButton({
        label: '◀', x: CX - 116, y: box.y + 386, w: 50, h: 36,
        color: COL.border, textColor: COL.ink, onClick: () => setShift(shift - 1),
    }));
    panel.addChild(mkButton({
        label: '▶', x: CX + 66, y: box.y + 386, w: 50, h: 36,
        color: COL.border, textColor: COL.ink, onClick: () => setShift(shift + 1),
    }));
    const shiftText = mkText('', 17, COL.ink, { weight: '700' });
    shiftText.anchor.set(0.5);
    shiftText.position.set(CX, box.y + 404);
    panel.addChild(shiftText);

    // ---- 右邊：紙條與解出來的字 ----
    const RX = box.x + 320, RW = 330;

    const card = (y, h, label) => {
        panel.addChild(
            new Graphics().roundRect(RX, y, RW, h, 14)
                .fill({ color: COL.panel2 }).stroke({ width: 2, color: COL.border })
        );
        const l = mkText(label, 12, COL.muted);
        l.position.set(RX + 14, y + 8);
        panel.addChild(l);
    };

    card(box.y + 86, 92, '紙條上的密文');
    const cipherText = mkText(cipher.split('').join(' '), 30, COL.muted, { weight: '700' });
    cipherText.anchor.set(0.5);
    cipherText.position.set(RX + RW / 2, box.y + 142);
    panel.addChild(cipherText);

    card(box.y + 194, 92, '轉出來的明文');
    const plainText = mkText('', 30, COL.ink, { weight: '700' });
    plainText.anchor.set(0.5);
    plainText.position.set(RX + RW / 2, box.y + 250);
    panel.addChild(plainText);

    const note = mkText(cfg.note || '', 14, COL.ink, { weight: '700', wrap: RW });
    note.position.set(RX, box.y + 300);
    panel.addChild(note);

    const hint = mkText(cfg.hint || '', 13, COL.muted, { wrap: RW, lineHeight: 20 });
    hint.position.set(RX, box.y + 326);
    panel.addChild(hint);

    const okBtn = mkButton({
        label: cfg.okLabel || '✅ 就是這個！', x: RX + 40, y: box.y + box.h - 66, w: 250, h: 46,
        size: 17, onClick: () => onSolve(),
    });
    okBtn.visible = false;
    panel.addChild(okBtn);

    function setShift(n) {
        shift = (n + 26) % 26;
        const plain = decode(shift);
        shiftText.text = `往回推 ${shift} 格`;
        plainText.text = plain.split('').join(' ');
        inner.rotation = shift * STEP;
        for (const t of innerLetters) t.rotation = -inner.rotation;   // 字保持正的比較好讀

        const solved = plain === answer;
        plainText.style.fill = solved ? COL.ok : COL.ink;
        okBtn.visible = solved;
    }
    setShift(0);

    // ---- 拖曳轉盤 ----
    let dragA0 = null, dragS0 = 0;
    const angleAt = e => {
        const p = ctx.root.toLocal(e.global);
        return Math.atan2(p.y - CY, p.x - CX);
    };
    const onDown = e => { dragA0 = angleAt(e); dragS0 = shift; dial.cursor = 'grabbing'; };
    const onMove = e => {
        if (dragA0 === null) return;
        let d = angleAt(e) - dragA0;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        setShift(dragS0 + Math.round(d / STEP));
    };
    const onUp = () => { dragA0 = null; dial.cursor = 'grab'; };

    dial.on('pointerdown', onDown);
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
// 2) 保險箱：三位數密碼鍵盤
// ------------------------------------------------------------
function safe(ctx, panel, box, cfg, onSolve) {
    const answer = String(cfg.answer);
    let entered = '';
    let done = false;

    const tip = mkText(`輸入 ${answer.length} 位數密碼。`, 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 56);
    panel.addChild(tip);

    // 顯示窗
    panel.addChild(
        new Graphics().roundRect(box.cx - 115, box.y + 86, 230, 62, 12)
            .fill({ color: 0x2f3438 }).stroke({ width: 3, color: COL.border })
    );
    const display = mkText('', 34, 0x9fe8c4, { weight: '700', spacing: 10 });
    display.anchor.set(0.5);
    display.position.set(box.cx + 5, box.y + 117);
    panel.addChild(display);

    const result = mkText('', 14, COL.red, { weight: '700' });
    result.anchor.set(0.5);
    result.position.set(box.cx, box.y + 162);
    panel.addChild(result);

    // 鍵盤
    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', ''];
    const KW = 72, KH = 44, GX = 84, GY = 56;
    const x0 = box.cx - (3 * GX - (GX - KW)) / 2;
    KEYS.forEach((k, i) => {
        if (!k) return;
        panel.addChild(mkButton({
            label: k, x: x0 + (i % 3) * GX, y: box.y + 184 + Math.floor(i / 3) * GY, w: KW, h: KH,
            size: 20,
            color: k === '⌫' ? COL.border : COL.panel2,
            textColor: COL.ink,
            onClick: () => press(k),
        }));
    });

    const hint = mkText(cfg.hint || '', 13, COL.muted, { wrap: box.w - 120, align: 'center', lineHeight: 21 });
    hint.anchor.set(0.5, 0);
    hint.position.set(box.cx, box.y + 412);
    panel.addChild(hint);

    function render() {
        display.text = entered.split('').join(' ') || '– – –';
        display.style.fill = done ? COL.ok : 0x9fe8c4;
    }

    function press(k) {
        if (done) return;
        result.text = '';
        if (k === '⌫') { entered = entered.slice(0, -1); render(); return; }
        if (entered.length >= answer.length) return;
        entered += k;
        render();
        if (entered.length < answer.length) return;

        if (entered === answer) {
            done = true;
            render();
            result.style.fill = COL.ok;
            result.text = '喀噠 —— 開了！';
            setTimeout(onSolve, 700);
        } else {
            result.style.fill = COL.red;
            result.text = '嗶嗶！密碼不對，再想想。';
            entered = '';
            setTimeout(render, 350);
        }
    }
    render();
}

// ------------------------------------------------------------
// 3) 光學疊影：紅光＋藍光 → 紫光透鏡，照出畫裡的隱藏符號
//    單色透鏡只看得到一團色塊，兩片疊在一起才會合成紫光。
// ------------------------------------------------------------
function lens(ctx, panel, box, cfg, onSolve) {
    const FW = 140, FH = 110;

    // 分三層：畫框 → 可拖的透鏡 → 按鈕。
    // 按鈕一定要在最上層，否則透鏡被拖到按鈕上面時會把點擊整個吃掉。
    const artLayer = new Container(), lensLayer = new Container(), uiLayer = new Container();
    panel.addChild(artLayer, lensLayer, uiLayer);

    const paintings = cfg.paintings.map((p, i) => ({
        cfg: p,
        x: box.x + 38 + i * 216,
        y: box.y + 104,
        w: 196,
        h: 150,
        read: false,
    }));

    const tip = mkText('把紅光透鏡和藍光透鏡拖到重疊 → 合成紫光透鏡 → 再拖到畫上。', 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 56);
    artLayer.addChild(tip);

    // ---- 畫框本體：一堆亂線 ----
    const rnd = seed => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
    for (const p of paintings) {
        artLayer.addChild(
            new Graphics().roundRect(p.x, p.y, p.w, p.h, 8)
                .fill({ color: 0xf7f1e4 }).stroke({ width: 4, color: 0x8a5c33 })
        );
        const r = rnd(p.x);
        for (const color of [COL.red, COL.blue]) {
            const g = new Graphics();
            for (let i = 0; i < 16; i++) {
                g.moveTo(p.x + 8 + r() * (p.w - 16), p.y + 8 + r() * (p.h - 16))
                    .lineTo(p.x + 8 + r() * (p.w - 16), p.y + 8 + r() * (p.h - 16));
            }
            artLayer.addChild(g.stroke({ width: 2, color, cap: 'round' }));
        }
        const nm = mkText(p.cfg.name, 13, COL.muted);
        nm.anchor.set(0.5);
        nm.position.set(p.x + p.w / 2, p.y - 12);
        artLayer.addChild(nm);
    }

    // ---- 每幅畫在各種透鏡底下的樣子（用遮罩裁切）----
    const masks = { red: [], blue: [], purple: [] };

    const tinted = (p, color, build) => {
        const c = new Container();
        c.addChild(new Graphics().roundRect(p.x, p.y, p.w, p.h, 8).fill({ color }));
        build(c, p);
        return c;
    };

    for (const p of paintings) {
        // 單色透鏡：只看得到一團色塊和半個看不懂的符號
        for (const key of ['red', 'blue']) {
            const view = tinted(p, key === 'red' ? 0xf0b7b7 : 0xb7c4f0, (c) => {
                const q = mkText('？', 54, 0x00000030, { weight: '700' });
                q.anchor.set(0.5);
                q.position.set(p.x + p.w / 2, p.y + p.h / 2);
                c.addChild(q);
            });
            const m = new Graphics().rect(0, 0, FW, FH).fill({ color: 0xffffff });
            m.visible = false;
            artLayer.addChild(m, view);
            view.mask = m;
            masks[key].push(m);
        }

        // 紫光透鏡：真正的符號現形
        const sym = new Container();
        const icon = mkText(p.cfg.icon, 46, 0xffffff);
        icon.anchor.set(0.5);
        icon.position.set(0, -26);
        const label = mkText(p.cfg.reveal, 24, 0x2c1a3f, { weight: '700' });
        label.anchor.set(0.5);
        label.position.set(0, 22);
        sym.addChild(icon, label);
        sym.position.set(p.x + p.w / 2, p.y + p.h / 2);
        if (p.cfg.mirrored) sym.scale.x = -1;
        p.sym = sym;

        const view = tinted(p, 0xd8bcee, c => c.addChild(sym));
        const m = new Graphics().rect(0, 0, FW, FH).fill({ color: 0xffffff });
        m.visible = false;
        artLayer.addChild(m, view);
        view.mask = m;
        masks.purple.push(m);
    }

    // ---- 說明文字 ----
    const captions = paintings.map(p => {
        const t = mkText('', 14, COL.ok, { weight: '700', wrap: p.w + 20, align: 'center' });
        t.anchor.set(0.5, 0);
        t.position.set(p.x + p.w / 2, p.y + p.h + 10);
        artLayer.addChild(t);
        return t;
    });

    const status = mkText('', 14, COL.muted, { wrap: box.w - 120, align: 'center' });
    status.anchor.set(0.5, 0);
    status.position.set(box.cx, box.y + 344);
    artLayer.addChild(status);

    // 鏡像的畫要翻正才讀得懂
    const flipBtn = mkButton({
        label: '🔄 把符號翻正', x: paintings[0].x + 28, y: box.y + 292, w: 140, h: 34,
        size: 14, color: COL.border, textColor: COL.ink,
        onClick: () => {
            const p = paintings[0];
            p.sym.scale.x *= -1;
            if (p.sym.scale.x === 1) {
                p.read = true;
                captions[0].text = p.cfg.caption;
                check();
            }
        },
    });
    flipBtn.visible = false;
    uiLayer.addChild(flipBtn);

    const okBtn = mkButton({
        label: '✅ 兩個特徵都拿到了', x: box.cx - 130, y: box.y + box.h - 58, w: 260, h: 44,
        size: 16, onClick: () => onSolve(),
    });
    okBtn.visible = false;
    uiLayer.addChild(okBtn);

    // ---- 可以拖的透鏡 ----
    const mkLens = (kind, label, color, x, y) => {
        const g = new Container();
        g.position.set(x, y);
        g.addChild(
            new Graphics().roundRect(0, 0, FW, FH, 10)
                .fill({ color, alpha: 0.42 }).stroke({ width: 4, color })
        );
        const t = mkText(label, 13, 0x3f3730, { weight: '700' });
        t.anchor.set(0.5);
        t.position.set(FW / 2, FH - 13);
        g.addChild(t);
        g.eventMode = 'static';
        g.cursor = 'grab';
        g.kind = kind;
        g.on('pointerdown', onDown(g));
        lensLayer.addChild(g);
        return g;
    };

    let redL = mkLens('red', '紅光透鏡', COL.red, box.x + 512, box.y + 96);
    let blueL = mkLens('blue', '藍光透鏡', COL.blue, box.x + 512, box.y + 232);
    let purpleL = null;

    const center = f => ({ x: f.x + FW / 2, y: f.y + FH / 2 });
    const over = (f, p) => {
        const c = center(f);
        return c.x > p.x && c.x < p.x + p.w && c.y > p.y && c.y < p.y + p.h;
    };

    function sync() {
        // 每片透鏡的遮罩跟著它跑；沒有那片透鏡就把遮罩藏起來
        for (const key of ['red', 'blue', 'purple']) {
            const f = key === 'red' ? redL : key === 'blue' ? blueL : purpleL;
            for (const m of masks[key]) {
                m.visible = !!f;
                if (f) m.position.set(f.x, f.y);
            }
        }

        // 紅＋藍疊在一起 → 合成紫光
        if (redL && blueL) {
            const a = center(redL), b = center(blueL);
            if (Math.hypot(a.x - b.x, a.y - b.y) < 52) {
                const x = (redL.x + blueL.x) / 2, y = (redL.y + blueL.y) / 2;
                lensLayer.removeChild(redL); lensLayer.removeChild(blueL);
                redL = null; blueL = null;
                purpleL = mkLens('purple', '紫光透鏡', 0x8e4fd0, x, y);
                drag = purpleL;                       // 接著讓玩家直接把紫光拖走
                status.text = '🟣 合成了紫光透鏡！拿它去照兩幅畫看看。';
                sync();
                return;
            }
        }

        // 紫光照到畫上 → 符號現形
        if (purpleL) {
            paintings.forEach((p, i) => {
                if (!over(purpleL, p)) return;
                if (p.cfg.mirrored) {
                    flipBtn.visible = true;
                    if (!p.read && p.sym.scale.x === -1) {
                        status.text = '這幅畫的字是反過來的……有辦法把它翻正嗎？';
                    }
                } else if (!p.read) {
                    p.read = true;
                    captions[i].text = p.cfg.caption;
                    check();
                }
            });
        }
    }

    function check() {
        if (paintings.every(p => p.read)) {
            status.text = '兩個特徵都到手了！';
            okBtn.visible = true;
        }
    }

    // ---- 拖曳 ----
    let drag = null, off = { x: 0, y: 0 };
    function onDown(f) {
        return e => {
            drag = f;
            f.cursor = 'grabbing';
            lensLayer.addChild(f);                      // 拉到透鏡層的最上面
            const p = ctx.root.toLocal(e.global);
            off = { x: p.x - f.x, y: p.y - f.y };
        };
    }
    const onMove = e => {
        if (!drag) return;
        const p = ctx.root.toLocal(e.global);
        drag.position.set(p.x - off.x, p.y - off.y);
        sync();
    };
    const onUp = () => { if (drag) drag.cursor = 'grab'; drag = null; };

    ctx.app.stage.on('globalpointermove', onMove);
    ctx.app.stage.on('pointerup', onUp);
    ctx.app.stage.on('pointerupoutside', onUp);
    status.text = cfg.hint || '';
    sync();

    return () => {
        ctx.app.stage.off('globalpointermove', onMove);
        ctx.app.stage.off('pointerup', onUp);
        ctx.app.stage.off('pointerupoutside', onUp);
    };
}

// ------------------------------------------------------------
// 4) 邏輯矩陣：四名嫌疑人 × 四項物證交叉驗證
//    每格點一下換成 ✓，再點一下換成 ✗，再點一下清空。
//    全部填對（而且只有真兇整列都是 ✓）才算解開。
// ------------------------------------------------------------
function deduce(ctx, panel, box, cfg, onSolve) {
    const sus = cfg.suspects, ev = cfg.evidence;
    const marks = sus.map(() => ev.map(() => 0));      // 0 空白 / 1 ✓ / 2 ✗
    const MARK = ['', '✓', '✗'];

    const lead = mkText(cfg.lead || '', 14, COL.ink, { weight: '700', align: 'center', wrap: box.w - 60 });
    lead.anchor.set(0.5, 0);
    lead.position.set(box.cx, box.y + 56);
    panel.addChild(lead);

    const gx = box.x + 24, labelW = 300, cw = 118, rowH = 74;
    const colX = j => gx + labelW + j * cw;
    const rowY = i => box.y + 140 + i * rowH;

    ev.forEach((e, j) => {
        const t = mkText(e, 13, COL.ink, { weight: '700', align: 'center', lineHeight: 18 });
        t.anchor.set(0.5, 0.5);
        t.position.set(colX(j) + cw / 2, box.y + 112);
        panel.addChild(t);
    });

    const cellMarks = [];
    sus.forEach((s, i) => {
        const y = rowY(i);
        panel.addChild(
            new Graphics().roundRect(gx, y, labelW - 12, rowH - 8, 10)
                .fill({ color: COL.panel2 }).stroke({ width: 2, color: COL.border })
        );
        const nm = mkText(s.name, 16, COL.ink, { weight: '700' });
        nm.position.set(gx + 12, y + 7);
        const tm = mkText(s.testimony, 12, COL.muted, { wrap: labelW - 36, lineHeight: 17 });
        tm.position.set(gx + 12, y + 29);
        panel.addChild(nm, tm);

        cellMarks.push([]);
        ev.forEach((e, j) => {
            const x = colX(j);
            const cell = new Container();
            const bg = new Graphics().roundRect(x + 6, y + 6, cw - 14, rowH - 20, 10)
                .fill({ color: COL.panel }).stroke({ width: 2, color: COL.border });
            const mk = mkText('', 26, COL.ink, { weight: '700' });
            mk.anchor.set(0.5);
            mk.position.set(x + cw / 2 - 1, y + (rowH - 8) / 2);
            cell.addChild(bg, mk);
            cell.gridPos = [i, j];
            cell.eventMode = 'static';
            cell.cursor = 'pointer';
            cell.on('pointertap', () => {
                marks[i][j] = (marks[i][j] + 1) % 3;
                mk.text = MARK[marks[i][j]];
                mk.style.fill = marks[i][j] === 1 ? COL.ok : COL.red;
                result.text = '';
            });
            panel.addChild(cell);
            cellMarks[i].push(mk);
        });
    });

    const hint = mkText(cfg.hint || '', 12, COL.muted, { wrap: box.w - 80, align: 'center' });
    hint.anchor.set(0.5, 0);
    hint.position.set(box.cx, box.y + 444);
    panel.addChild(hint);

    const result = mkText('', 14, COL.red, { weight: '700' });
    result.anchor.set(0.5);
    result.position.set(box.cx, box.y + 480);
    panel.addChild(result);

    panel.addChild(mkButton({
        label: '🔍 檢查推理', x: box.cx - 100, y: box.y + box.h - 56, w: 200, h: 42,
        onClick: () => {
            let blank = 0, wrong = 0;
            sus.forEach((s, i) => ev.forEach((e, j) => {
                if (marks[i][j] === 0) blank++;
                else if ((marks[i][j] === 1) !== cfg.truth[i][j]) wrong++;
            }));
            if (blank) { result.text = `還有 ${blank} 格沒填，每一格都要判斷符不符合。`; return; }
            if (wrong) { result.text = `有 ${wrong} 格對不上，再讀一次證詞吧！`; return; }
            onSolve();
        },
    }));
}

export const PUZZLES = { caesar, safe, lens, deduce };
