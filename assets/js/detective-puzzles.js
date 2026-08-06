import { Assets, Circle, Container, Graphics, Sprite } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { COL, mkText, mkButton, drawProps, hasTexture } from './detective-ui.js';

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
// 提示分兩段（★ 這是解謎遊戲，答案不能一打開面板就攤在那裡）
//   cfg.hint     —— 常駐顯示，只負責「推一把」：指出該注意什麼、該去哪裡看，
//                   不講計算過程、不報數字、不列出對照表
//   cfg.hintMore —— 真正把做法講白的那段，玩家按 💡 才換上去
// 沒寫 hintMore 就不會有按鈕（等於維持舊行為）。
// 真的卡死還有第三層：關掉面板點對話框左邊的喜拿，那條提示鏈才會直接指路。
// ------------------------------------------------------------
function hintBlock(layer, cfg, opt) {
    const t = mkText(cfg.hint || '', opt.size || 13, COL.muted, {
        wrap: opt.wrap, align: opt.align || 'center', lineHeight: opt.lineHeight || 21,
    });
    t.anchor.set(opt.ax != null ? opt.ax : 0.5, 0);
    t.position.set(opt.x, opt.y);
    layer.addChild(t);

    let btn = null;
    if (cfg.hintMore) {
        btn = mkButton({
            label: '💡 再給我一點提示', x: opt.btnX, y: opt.btnY, w: 176, h: 32, size: 13,
            color: COL.border, textColor: COL.ink,
            onClick: () => { t.text = cfg.hintMore; btn.visible = false; },
        });
        layer.addChild(btn);
    }
    return {
        text: t,
        // 解開之後把整塊收掉；按鈕一旦用過就不再回來
        setVisible(v) {
            t.visible = v;
            if (btn) btn.visible = v && t.text !== cfg.hintMore;
        },
    };
}

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

    // 一行就好 —— 右邊的信紙圖從 box.y+86 就開始了，這行再高就會撞上去
    const tip = mkText('轉動內圈（拖曳或按 ◀ ▶）。盤上綠圈裡的字，就是那個字母轉出來的結果。', 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 56);
    panel.addChild(tip);

    // ---- 左邊：雙層解密盤 ----
    const CX = box.x + 170, CY = box.y + 262, R_OUT = 116, R_IN = 84;
    const dial = new Container();
    dial.position.set(CX, CY);
    panel.addChild(dial);

    // 有正式美術（roulette 切成的外圈＋內轉盤）就用圖，缺圖退回向量畫的替代盤。
    // ★ 圖裡的轉軸不在畫面正中央（貼紙和落地陰影佔掉了邊），
    //   所以 pivot 要用資料裡量好的輪軸座標（cfg.dialPivot，相對整張圖的比例）。
    // RING：兩圈字母各自的半徑，還有寫「轉出來的字母」的綠圈半徑。
    // 正式美術和向量替代盤的排版不一樣，所以各自設定一次。
    const innerLetters = [];
    let inner, hitR = R_OUT, RING;
    if (hasTexture(cfg.dialImg) && hasTexture(cfg.dialInnerImg)) {
        const pv = cfg.dialPivot || { x: 0.5, y: 0.5 };
        const mkSprite = src => {
            const sp = new Sprite(Assets.get(src));
            sp.pivot.set(sp.texture.width * pv.x, sp.texture.height * pv.y);
            return sp;
        };
        const disc = mkSprite(cfg.dialInnerImg);   // 會轉的內轉盤
        const ring = mkSprite(cfg.dialImg);        // 固定的外圈底座
        hitR = 124;
        const sc = hitR / ((cfg.dialOuterR || 0.48) * ring.texture.width);
        disc.scale.set(sc);
        ring.scale.set(sc);
        dial.addChild(disc, ring);                 // 外圈疊上面，蓋住內轉盤邊緣的鋸齒
        inner = disc;
        // 從 roulette 原圖量的：外圈字母在 0.667R、內圈字母在 0.449R（R＝圓盤外緣）。
        // 綠圈放在字母圈外面那道有肉球的淺色邊上，不會壓到字。
        RING = { out: hitR * 0.667, in: hitR * 0.449, label: hitR * 0.855 };
    } else {
        dial.addChild(new Graphics().circle(0, 0, R_OUT + 8).fill({ color: COL.border }));
        dial.addChild(new Graphics().circle(0, 0, R_OUT).fill({ color: COL.panel2 }));
        for (let i = 0; i < 26; i++) {
            const a = i * STEP - Math.PI / 2;
            const t = mkText(ALPHA[i], 14, COL.muted, { weight: '700' });
            t.anchor.set(0.5);
            t.position.set(Math.cos(a) * (R_OUT - 15), Math.sin(a) * (R_OUT - 15));
            dial.addChild(t);
        }

        inner = new Container();
        dial.addChild(inner);
        inner.addChild(
            new Graphics().circle(0, 0, R_IN)
                .fill({ color: COL.gold, alpha: 0.2 }).stroke({ width: 3, color: COL.gold })
        );
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

        // 頂端的對位標記（正式美術的頂端已經有怪盜狗貼紙當指標，不用另外畫）
        dial.addChild(
            new Graphics().poly([0, -R_OUT - 14, -9, -R_OUT - 28, 9, -R_OUT - 28]).fill({ color: COL.red })
        );
        RING = { out: R_OUT - 15, in: R_IN - 15, label: R_OUT + 20 };
    }

    // ---- 盤面對照高亮：只標紙條上真的用到的那幾個字母 ----
    // 這盤的兩圈字母都是「A 在正上方、順時針排」，所以**同一條半徑上**的外圈字母
    // （密文）和內圈字母（明文）就是一組對照 —— 用一條放射狀的金色高亮把兩者串起來，
    // 再把轉出來的字母寫在盤面外緣的綠圈裡。這樣不用看右邊那欄，
    // 也直接看得到「紙條上的 J，現在變成了 G」。
    const markLabels = [];
    const marked = new Set();
    for (const ch of cipher) {
        const k = ch.charCodeAt(0) - 65;
        if (k < 0 || k > 25 || marked.has(k)) continue;
        marked.add(k);
        const a = k * STEP - Math.PI / 2, half = STEP * 0.44;
        const r0 = RING.in - 13, r1 = RING.out + 14;

        const wedge = new Graphics();
        wedge.moveTo(Math.cos(a - half) * r0, Math.sin(a - half) * r0);
        wedge.arc(0, 0, r0, a - half, a + half);
        wedge.lineTo(Math.cos(a + half) * r1, Math.sin(a + half) * r1);
        wedge.arc(0, 0, r1, a + half, a - half, true);
        wedge.closePath();
        wedge.fill({ color: COL.gold, alpha: 0.32 }).stroke({ width: 2, color: COL.gold, alpha: 0.85 });
        dial.addChild(wedge);

        const lx = Math.cos(a) * RING.label, ly = Math.sin(a) * RING.label;
        dial.addChild(
            new Graphics().circle(lx, ly, 11)
                .fill({ color: 0xfffdf9, alpha: 0.94 }).stroke({ width: 2, color: COL.ok })
        );
        const lt = mkText('', 15, COL.ok, { weight: '700' });
        lt.anchor.set(0.5);
        lt.position.set(lx, ly);
        dial.addChild(lt);
        markLabels.push({ k, t: lt });
    }

    dial.eventMode = 'static';
    dial.cursor = 'grab';
    dial.hitArea = new Circle(0, 0, hitR);

    // 按鈕排在盤面下緣底下 —— 替代盤的綠圈在盤外，比盤本身還低，所以要一起算進來
    const btnY = CY + Math.max(hitR, RING.label + 12);
    panel.addChild(mkButton({
        label: '◀', x: CX - 116, y: btnY, w: 50, h: 36,
        color: COL.border, textColor: COL.ink, onClick: () => setShift(shift - 1),
    }));
    panel.addChild(mkButton({
        label: '▶', x: CX + 66, y: btnY, w: 50, h: 36,
        color: COL.border, textColor: COL.ink, onClick: () => setShift(shift + 1),
    }));
    const shiftText = mkText('', 17, COL.ink, { weight: '700' });
    shiftText.anchor.set(0.5);
    shiftText.position.set(CX, btnY + 18);
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

    const plainText = mkText('', 30, COL.ink, { weight: '700' });
    plainText.anchor.set(0.5);

    if (hasTexture(cfg.noteImg)) {
        // 正式美術：整張怪盜的信（密文印在信紙上），下面接明文卡
        const tex = Assets.get(cfg.noteImg);
        const NH = Math.round(RW * tex.height / tex.width);
        drawProps([{ t: 'img', src: cfg.noteImg, x: RX, y: box.y + 86, w: RW, h: NH }], panel);
        card(box.y + 94 + NH, 58, '轉出來的明文');
        plainText.style.fontSize = 26;
        plainText.position.set(RX + RW / 2, box.y + 94 + NH + 34);
    } else {
        card(box.y + 86, 92, '紙條上的密文');
        const cipherText = mkText(cipher.split('').join(' '), 30, COL.muted, { weight: '700' });
        cipherText.anchor.set(0.5);
        cipherText.position.set(RX + RW / 2, box.y + 142);
        panel.addChild(cipherText);

        card(box.y + 194, 92, '轉出來的明文');
        plainText.position.set(RX + RW / 2, box.y + 250);
    }
    panel.addChild(plainText);

    const noteY = hasTexture(cfg.noteImg) ? box.y + 374 : box.y + 300;
    const note = mkText(cfg.note || '', 14, COL.ink, { weight: '700', wrap: RW });
    note.position.set(RX, noteY);
    panel.addChild(note);

    // 提示文字排在右欄的信紙下面，💡 按鈕放左邊轉盤底下那塊空地
    hintBlock(panel, cfg, {
        x: RX, y: noteY + 26, ax: 0, align: 'left', wrap: RW,
        size: hasTexture(cfg.noteImg) ? 12 : 13,
        lineHeight: hasTexture(cfg.noteImg) ? 17 : 20,
        btnX: CX - 88, btnY: btnY + 50,
    });

    // ★ 轉到正確位移時「什麼都不會發生」—— 對錯一律等玩家自己按下這顆才揭曉。
    //   （原本一轉對就把明文變綠、把確認鈕跳出來，等於替玩家宣布答對了）
    const result = mkText('', 14, COL.red, { weight: '700', align: 'center', wrap: RW });
    result.anchor.set(0.5);
    result.position.set(RX + RW / 2, box.y + 470);
    panel.addChild(result);

    panel.addChild(mkButton({
        label: cfg.okLabel || '✅ 就是這個！', x: RX + 40, y: box.y + box.h - 66, w: 250, h: 46,
        size: 17,
        onClick: () => {
            if (decode(shift) === answer) { onSolve(); return; }
            result.text = cfg.wrongText || '這樣讀起來還不成一個字……再轉轉看。';
        },
    }));

    function setShift(n) {
        shift = (n + 26) % 26;
        const plain = decode(shift);
        shiftText.text = `往回推 ${shift} 格`;
        plainText.text = plain.split('').join(' ');
        inner.rotation = shift * STEP;
        for (const t of innerLetters) t.rotation = -inner.rotation;   // 字保持正的比較好讀
        // 綠圈裡是那個密文字母現在對到的明文（＝內圈轉過來停在同一條半徑上的字）
        for (const m of markLabels) m.t.text = ALPHA[(m.k - shift + 26) % 26];
        result.text = '';                          // 轉過了就把上一次的判定收掉
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

    // 鍵盤最後一排收在 box.y+396，提示接在下面，💡 按鈕貼著面板下緣
    hintBlock(panel, cfg, {
        x: box.cx, y: box.y + 404, wrap: box.w - 120,
        btnX: box.cx - 88, btnY: box.y + box.h - 42,
    });

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
    const FW = cfg.lensW || 150, FH = cfg.lensH || 130;

    // 分三層：畫框 → 可拖的透鏡 → 按鈕。
    // 按鈕一定要在最上層，否則透鏡被拖到按鈕上面時會把點擊整個吃掉。
    const artLayer = new Container(), lensLayer = new Container(), uiLayer = new Container();
    panel.addChild(artLayer, lensLayer, uiLayer);

    // 畫框尺寸由資料指定，方便對齊正式畫作的比例
    const PW = cfg.paintW || 200, PH = cfg.paintH || 220, GAP = cfg.paintGap || 40;
    const startX = cfg.paintX != null ? cfg.paintX : box.x + 70;
    const paintings = cfg.paintings.map((p, i) => ({
        cfg: p,
        x: startX + i * (PW + GAP),
        y: box.y + (cfg.paintY || 108),
        w: PW,
        h: PH,
        read: false,
    }));

    // ★ 只說「透鏡可以拖」——「紅＋藍＝紫」是這關要玩家自己發現的那一步，
    //   別在標題底下先講掉（真的卡住，按 💡 或問喜拿才會講）
    const tip = mkText('兩片透鏡都可以拖。拿去照照看這兩幅畫吧。', 15, COL.muted);
    tip.anchor.set(0.5, 0);
    tip.position.set(box.cx, box.y + 56);
    artLayer.addChild(tip);

    // ---- 畫框本體：有正式畫作就貼圖，沒有就退回一堆亂線 ----
    const rnd = seed => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
    for (const p of paintings) {
        artLayer.addChild(
            new Graphics().roundRect(p.x - 7, p.y - 7, p.w + 14, p.h + 14, 8).fill({ color: 0x8a5c33 })
        );
        artLayer.addChild(
            new Graphics().roundRect(p.x, p.y, p.w, p.h, 3).fill({ color: 0xf7f1e4 })
        );
        if (hasTexture(p.cfg.img)) {
            drawProps([{ t: 'img', src: p.cfg.img, x: p.x, y: p.y, w: p.w, h: p.h }], artLayer);
        } else {
            const r = rnd(p.x);
            for (const color of [COL.red, COL.blue]) {
                const g = new Graphics();
                for (let i = 0; i < 16; i++) {
                    g.moveTo(p.x + 8 + r() * (p.w - 16), p.y + 8 + r() * (p.h - 16))
                        .lineTo(p.x + 8 + r() * (p.w - 16), p.y + 8 + r() * (p.h - 16));
                }
                artLayer.addChild(g.stroke({ width: 2, color, cap: 'round' }));
            }
        }
        const nm = mkText(p.cfg.name, 13, COL.muted);
        nm.anchor.set(0.5);
        nm.position.set(p.x + p.w / 2, p.y - 20);
        artLayer.addChild(nm);
    }

    // ---- 每幅畫在各種透鏡底下的樣子（用遮罩裁切）----
    // 有對應的濾鏡圖就直接換圖；沒有圖才退回色塊 ＋ 符號。
    const masks = { red: [], blue: [], purple: [] };
    const IMG_KEY = { red: 'imgRed', blue: 'imgBlue', purple: 'imgPurple' };
    const TINT = { red: 0xf0b7b7, blue: 0xb7c4f0, purple: 0xd8bcee };

    const addView = (p, key, build) => {
        const c = new Container();
        const src = p.cfg[IMG_KEY[key]];
        const isImg = hasTexture(src);
        if (isImg) drawProps([{ t: 'img', src, x: p.x, y: p.y, w: p.w, h: p.h }], c);
        else c.addChild(new Graphics().roundRect(p.x, p.y, p.w, p.h, 3).fill({ color: TINT[key] }));
        if (build) build(c, isImg);
        const m = new Graphics().rect(0, 0, FW, FH).fill({ color: 0xffffff });
        m.visible = false;
        artLayer.addChild(m, c);
        c.mask = m;
        masks[key].push(m);
        return c;
    };

    for (const p of paintings) {
        // 單色透鏡：沒有正式圖時只看得到一團色塊和看不懂的符號
        for (const key of ['red', 'blue']) {
            addView(p, key, (c, isImg) => {
                if (isImg) return;
                const q = mkText('？', 54, 0x00000030, { weight: '700' });
                q.anchor.set(0.5);
                q.position.set(p.x + p.w / 2, p.y + p.h / 2);
                c.addChild(q);
            });
        }

        // 紫光透鏡：真正的內容現形
        const view = addView(p, 'purple', (c, isImg) => {
            if (isImg) return;
            const sym = new Container();
            const icon = mkText(p.cfg.icon, 46, 0xffffff);
            icon.anchor.set(0.5);
            icon.position.set(0, -26);
            const label = mkText(p.cfg.reveal, 24, 0x2c1a3f, { weight: '700' });
            label.anchor.set(0.5);
            label.position.set(0, 22);
            sym.addChild(icon, label);
            sym.position.set(p.x + p.w / 2, p.y + p.h / 2);
            c.addChild(sym);
            p.flip = sym;                       // 沒有圖時翻的是符號
        });
        if (!p.flip) {
            // 有圖時翻的是整張畫：樞紐移到畫的中心，翻轉才會繞著中心轉
            // （沒有圖的符號原點本來就在中心，不能再動 pivot）
            p.flip = view;
            view.pivot.set(p.x + p.w / 2, p.y + p.h / 2);
            view.position.set(p.x + p.w / 2, p.y + p.h / 2);
        }
        if (p.cfg.mirrored) p.flip.scale.x = -1;
    }

    // ---- 說明文字 ----
    const capY = paintings[0].y + PH + 16;
    const captions = paintings.map(p => {
        const t = mkText('', 14, COL.ok, { weight: '700', wrap: p.w + 30, align: 'center' });
        t.anchor.set(0.5, 0);
        t.position.set(p.x + p.w / 2, capY);
        artLayer.addChild(t);
        return t;
    });

    // status 只放「當下發生了什麼」的即時回饋，提示另外一塊（才不會被沖掉）
    const status = mkText('', 14, COL.muted, { wrap: box.w - 120, align: 'center' });
    status.anchor.set(0.5, 0);
    status.position.set(box.cx, capY + 42);
    artLayer.addChild(status);

    const hintB = hintBlock(uiLayer, cfg, {
        x: box.cx, y: capY + 76, wrap: box.w - 200, size: 13, lineHeight: 20,
        btnX: box.x + 40, btnY: box.y + box.h - 54,
    });

    // 鏡像的畫要翻正才讀得懂（只有標了 mirrored 的畫才會有這顆按鈕）
    const flipIdx = paintings.findIndex(p => p.cfg.mirrored);
    let flipBtn = null;
    if (flipIdx >= 0) {
        // 擺在面板右下角 —— 原本掛在畫底下（capY+74），現在那一帶讓給提示文字了
        flipBtn = mkButton({
            label: '🔄 把畫面翻正', x: box.x + box.w - 190, y: box.y + box.h - 54, w: 140, h: 34,
            size: 14, color: COL.border, textColor: COL.ink,
            onClick: () => {
                const p = paintings[flipIdx];
                p.flip.scale.x *= -1;
                if (p.flip.scale.x === 1) {
                    p.read = true;
                    captions[flipIdx].text = p.cfg.caption;
                    check();
                }
            },
        });
        flipBtn.visible = false;
        uiLayer.addChild(flipBtn);
    }

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

    const dockX = cfg.dockX != null ? cfg.dockX : box.x + box.w - FW - 110;
    let redL = mkLens('red', '紅光透鏡', COL.red, dockX, box.y + 110);
    let blueL = mkLens('blue', '藍光透鏡', COL.blue, dockX, box.y + 130 + FH + 30);
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
                    if (flipBtn) flipBtn.visible = true;
                    if (!p.read && p.flip.scale.x === -1) {
                        status.text = '這幅畫是反過來的……有辦法把它翻正嗎？';
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
            hintB.setVisible(false);               // 讀完了就把提示收掉，讓位給確認鈕
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
// 玩家填過的 ✓／✗ 記在這裡（用 cfg 當 key），關掉面板再打開不會白填一次
const deduceMarks = new WeakMap();

// 面板底圖換成羊皮紙（report_paper.png）之後，白底的證詞欄和格子都太跳，
// 改成壓在紙上的黃銅名牌色。缺圖退回白卡片時這組顏色一樣看得清楚。
const PAPER = {
    plate: 0xe6d0ab, plateEdge: 0x9d7d55,   // 左邊的證詞名牌
    cell: 0xf3e4c6, cellEdge: 0xa98a5f,     // 右邊可點的格子
    note: 0x6b5a48,                          // 紙上的小字（COL.muted 在紙上偏淡）
};

// ★ 版面是照 report_paper.png 排的（案件資料把 box 設成 700×574）：
//   紙上那條紅色分隔線落在 box.y+86，下面那張撕紙條落在 box.y+506～569，
//   所以標題壓在線上面、按鈕正好坐在撕紙條上。換底圖時這幾個數字要一起對。
function deduce(ctx, panel, box, cfg, onSolve) {
    const sus = cfg.suspects, ev = cfg.evidence;
    let marks = deduceMarks.get(cfg);                  // 0 空白 / 1 ✓ / 2 ✗
    if (!marks) {
        marks = sus.map(() => ev.map(() => 0));
        deduceMarks.set(cfg, marks);
    }
    const MARK = ['', '✓', '✗'];

    const lead = mkText(cfg.lead || '', 14, COL.ink, { weight: '700', align: 'center', wrap: box.w - 60 });
    lead.anchor.set(0.5, 0);
    lead.position.set(box.cx, box.y + 92);
    panel.addChild(lead);

    // 版面：左邊只掛名牌（證詞不再抄一份過來，見下方），省下來的寬度全給格子；
    // 左右各留 33 —— 再寬就壓到紙的撕邊上了
    const gx = box.x + 33, labelW = 154, cw = 120, rowH = 66;
    const colX = j => gx + labelW + j * cw;
    const rowY = i => box.y + 164 + i * rowH;

    ev.forEach((e, j) => {
        const t = mkText(e, 13, COL.ink, { weight: '700', align: 'center', lineHeight: 18 });
        t.anchor.set(0.5, 0.5);
        t.position.set(colX(j) + cw / 2, box.y + 140);
        panel.addChild(t);
    });

    const cellMarks = [];
    sus.forEach((s, i) => {
        const y = rowY(i);
        panel.addChild(
            new Graphics().roundRect(gx, y, labelW - 12, rowH - 8, 10)
                .fill({ color: PAPER.plate }).stroke({ width: 2, color: PAPER.plateEdge })
        );
        // ★ 名牌上只寫名字。證詞在推理室的黑板上（點黑板可以一張一張放大讀），
        //   在矩陣旁邊再抄一份，等於把要比對的線索直接攤在答案格旁邊。
        const nm = mkText(s.name, 17, COL.ink, { weight: '700' });
        nm.anchor.set(0.5);
        nm.position.set(gx + (labelW - 12) / 2, y + (rowH - 8) / 2);
        panel.addChild(nm);

        cellMarks.push([]);
        ev.forEach((e, j) => {
            const x = colX(j);
            const cell = new Container();
            const bg = new Graphics().roundRect(x + 5, y + 5, cw - 12, rowH - 20, 9)
                .fill({ color: PAPER.cell }).stroke({ width: 2, color: PAPER.cellEdge });
            const mk = mkText(MARK[marks[i][j]], 26, COL.ink, { weight: '700' });
            mk.anchor.set(0.5);
            mk.position.set(x + cw / 2 - 1, y + (rowH - 8) / 2);
            if (marks[i][j]) mk.style.fill = marks[i][j] === 1 ? COL.ok : COL.red;
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

    // 底部三層依序排開：提示 → 檢查結果 → 按鈕，彼此不重疊
    hintBlock(panel, cfg, {
        x: box.cx, y: box.y + 428, wrap: box.w - 90, size: 12, lineHeight: 19,
        btnX: box.cx - 88, btnY: box.y + 452,
    }).text.style.fill = PAPER.note;

    const result = mkText('', 14, COL.red, { weight: '700', align: 'center', wrap: box.w - 90 });
    result.anchor.set(0.5);
    result.position.set(box.cx, box.y + 494);
    panel.addChild(result);

    // 按鈕坐在紙下緣那條撕紙條上
    panel.addChild(mkButton({
        label: '🔍 檢查推理', x: box.cx - 100, y: box.y + 512, w: 200, h: 42,
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
