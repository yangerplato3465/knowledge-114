import { Container, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { drawProps, mkButton, mkText } from './ui.js';

// ============================================================
// 偵探事件簿 · 空間記憶還原（雙圖找不同 ＋ 時間戳篩選）
//
// 兩張圖並排：左邊是 AI 記憶畫面，右邊是感測器紀錄。
// 玩家先把兩邊不一樣的地方全部點出來，每點到一處就露出那一處的感測器時間戳；
// 全部找齊之後，再判斷「哪幾處跟案子有關」送出。
//
// ★ 難點刻意分成兩段，兩段練的能力不一樣：
//   第一段是觀察（找得出來嗎），第二段是篩選（判斷哪些算數）。
//   只有第二段才是這一案的教學目標 —— 案子發生在 14:00，
//   所以早上清潔、開館前調整、下午導覽留下的異常通通不算。
//
// ★ 回饋不可以洩漏「錯幾個」（見 docs 第 3 節）。
//   說出「你有 2 個判斷錯了」的當下，最佳解法就從推理變成一個一個試。
//   所以判定錯誤時一律只說「有地方對不上」，程式裡也不去算錯幾個。
//   「已找到 X / 6 處」不算洩漏 —— 那是進度，不是答案，
//   而且不給的話玩家不知道什麼時候該停手。
//
// 資料格式（寫在案件檔的 puzzle 裡）：
//   left / right : drawProps 的 props 陣列，座標以各自畫框的左上角為原點
//   diffs        : [{ id, name, desc, time, real, hit:[x,y,w,h], why }]
//                  hit 用右邊那張圖的區域座標；real=true 代表跟案子有關
//   digits       : { <diff id>: '數字' } —— 判定正確後這幾處會露出數字
//   rule         : 一句話講怎麼把數字排成答案
// ============================================================

const HUD = {
    bg: 0x0d1b2a, surface: 0x152a3d, surface2: 0x1b354b, border: 0x2a4a66,
    cyan: 0x4fd8e8, cyanDim: 0x2c8fa0, ink: 0xdce9f2, muted: 0x7791a6,
    amber: 0xf2a65a, mint: 0x6fd9a6, rose: 0xe4676b,
};

export function spotdiff(ctx, panel, box, cfg, done) {
    const diffs = cfg.diffs || [];
    const realIds = diffs.filter(d => d.real).map(d => d.id);

    // 狀態放進 ctx.flags 才會跟著存檔走（面板關掉、重新整理、隔天續玩都還在）
    const st = ctx.flags.spot || (ctx.flags.spot = { found: [], marked: [], solved: false });

    let layer = null;

    // ---- 底 ----
    panel.addChild(
        new Graphics().roundRect(box.x, box.y, box.w, box.h, 22)
            .fill({ color: HUD.bg }).stroke({ width: 3, color: HUD.border })
    );
    const title = mkText('🔍 空間記憶還原', 22, HUD.cyan, { weight: '700' });
    title.position.set(box.x + 26, box.y + 18);
    panel.addChild(title);

    // ---- 兩張圖 ----
    const IMG_W = 424, IMG_H = 236, IMG_Y = box.y + 76;
    const LX = box.x + 24, RX = box.x + box.w - 24 - IMG_W;

    const framePanel = (x, label, sub, color) => {
        panel.addChild(
            new Graphics().roundRect(x, IMG_Y - 26, IMG_W, IMG_H + 26, 12)
                .fill({ color: HUD.surface }).stroke({ width: 1, color: HUD.border })
        );
        const t = mkText(label, 13, color, { weight: '700' });
        t.position.set(x + 12, IMG_Y - 22);
        const s = mkText(sub, 11, HUD.muted);
        s.anchor.set(1, 0);
        s.position.set(x + IMG_W - 12, IMG_Y - 20);
        panel.addChild(t, s);
    };
    framePanel(LX, 'AI 記憶畫面', `${cfg.caseTime || '14:00'} · 已被竄改`, HUD.cyan);
    framePanel(RX, '感測器紀錄', `${cfg.caseTime || '14:00'} · 未被動過`, HUD.amber);

    // 兩張圖各自畫在自己的容器裡，座標就能用「畫框內的相對位置」寫，好對照
    const drawInto = (x, props) => {
        const c = new Container();
        c.position.set(x, IMG_Y);
        drawProps(props, c);
        const m = new Graphics().rect(x, IMG_Y, IMG_W, IMG_H).fill({ color: 0xffffff });
        c.mask = m;
        panel.addChild(m, c);
        return c;
    };
    drawInto(LX, cfg.left || []);
    drawInto(RX, cfg.right || []);

    // ---- 可點的差異區（只在右邊那張圖上）----
    const hitLayer = new Container();
    panel.addChild(hitLayer);
    diffs.forEach(d => {
        const [hx, hy, hw, hh] = d.hit;
        const g = new Graphics().rect(RX + hx, IMG_Y + hy, hw, hh).fill({ color: 0xffffff, alpha: 0.001 });
        g.eventMode = 'static';
        g.cursor = 'pointer';
        g.on('pointertap', () => find(d));
        hitLayer.addChild(g);
    });
    // 點到空白處也要有回應，不然玩家會以為是程式壞了
    const blank = new Graphics().rect(RX, IMG_Y, IMG_W, IMG_H).fill({ color: 0xffffff, alpha: 0.001 });
    blank.eventMode = 'static';
    blank.on('pointertap', () => { msg = '這裡兩邊看起來是一樣的。'; redraw(); });
    panel.addChildAt(blank, panel.children.indexOf(hitLayer));

    let msg = '把右邊跟左邊不一樣的地方全部點出來。';

    // ============================================================
    // 下半：找到的差異清單
    // ============================================================
    function redraw() {
        if (layer) layer.destroy({ children: true });
        layer = new Container();
        panel.addChild(layer);

        // 找到的地方畫一圈亮框（兩張圖同一個位置都畫，方便對照）
        for (const d of diffs) {
            if (!st.found.includes(d.id)) continue;
            const [hx, hy, hw, hh] = d.hit;
            const on = st.marked.includes(d.id);
            for (const bx of [LX, RX]) {
                layer.addChild(
                    new Graphics().roundRect(bx + hx, IMG_Y + hy, hw, hh, 6)
                        .stroke({ width: 2, color: on ? HUD.amber : HUD.cyanDim })
                );
            }
        }

        // ---- 清單：一處一張小卡，卡上是時間戳與「跟案子有關」的開關 ----
        const CW = 285, CH = 52, GAP = 12, C_Y = box.y + 348;
        const label = mkText(
            `已找到 ${st.found.length} / ${diffs.length} 處差異` +
            (st.found.length === diffs.length ? '　—　接下來判斷哪幾處跟案子有關' : ''),
            13, st.found.length === diffs.length ? HUD.cyan : HUD.muted);
        label.position.set(box.x + 24, box.y + 324);
        layer.addChild(label);

        diffs.forEach((d, i) => {
            if (!st.found.includes(d.id)) return;
            const col = i % 3, row = (i / 3) | 0;
            const x = box.x + 24 + col * (CW + GAP), y = C_Y + row * (CH + 10);
            const on = st.marked.includes(d.id);
            const card = new Container();
            card.addChild(
                new Graphics().roundRect(x, y, CW, CH, 10)
                    .fill({ color: on ? HUD.surface2 : HUD.surface })
                    .stroke({ width: on ? 2 : 1, color: on ? HUD.amber : HUD.border })
            );
            const n = mkText(`${on ? '☑' : '☐'} ${d.name}`, 13, on ? HUD.ink : HUD.muted, { weight: '700' });
            n.position.set(x + 10, y + 7);
            const ds = mkText(d.desc, 11, HUD.muted, { wrap: CW - 90 });
            ds.position.set(x + 10, y + 28);
            // 時間戳靠右對齊、等寬感 —— 這是玩家唯一要拿來比對的數字
            const tm = mkText(d.time, 14, HUD.cyan, { weight: '700' });
            tm.anchor.set(1, 0);
            tm.position.set(x + CW - 10, y + 26);
            card.addChild(n, ds, tm);
            if (!st.solved) {
                card.eventMode = 'static';
                card.cursor = 'pointer';
                card.on('pointertap', () => {
                    const k = st.marked.indexOf(d.id);
                    k < 0 ? st.marked.push(d.id) : st.marked.splice(k, 1);
                    msg = '';
                    redraw();
                    ctx.save?.();
                });
            }
            // 判定正確後，跟案子有關的那幾處露出數字
            if (st.solved && cfg.digits?.[d.id]) {
                const dg = mkText(cfg.digits[d.id], 22, HUD.mint, { weight: '700' });
                dg.anchor.set(1, 0);
                dg.position.set(x + CW - 10, y + 4);
                card.addChild(dg);
            }
            layer.addChild(card);
        });

        // ---- 底部：提示與送出 ----
        const hint = mkText(msg, 13, HUD.ink, { wrap: box.w - 240, lineHeight: 20 });
        hint.position.set(box.x + 24, box.y + 486);
        layer.addChild(hint);

        if (!st.solved) {
            const ready = st.found.length === diffs.length;
            const btn = mkButton({
                label: '送出判定', x: box.x + box.w - 190, y: box.y + 492, w: 166, h: 44,
                color: ready ? HUD.cyan : HUD.border, textColor: ready ? 0x08121c : HUD.muted,
                onClick: submit,
            });
            btn.setLocked(!ready);
            layer.addChild(btn);
        }
    }

    function find(d) {
        if (st.found.includes(d.id)) { msg = `${d.name}：${d.desc}（感測器時間 ${d.time}）`; redraw(); return; }
        st.found.push(d.id);
        ctx.save?.();
        msg = `找到了！${d.name}——${d.desc}。感測器記錄的時間是 ${d.time}。`;
        if (st.found.length === diffs.length) {
            msg += `\n六處都找齊了。案子發生在 ${cfg.caseTime || '14:00'}，哪幾處才跟案子有關？點卡片打勾。`;
        }
        redraw();
    }

    function submit() {
        if (st.found.length !== diffs.length) return;
        const ok = st.marked.length === realIds.length && realIds.every(id => st.marked.includes(id));
        if (!ok) {
            // ★ 不講錯幾個、也不講錯在哪 —— 只把該用的判準再說一次
            msg = '有地方跟感測器紀錄對不上。再看一次時間：案子發生在 '
                + (cfg.caseTime || '14:00') + '，不是那個時候留下的痕跡，就跟這件案子無關。';
            redraw();
            return;
        }
        st.solved = true;
        msg = cfg.rule || '';
        redraw();
        done();
    }

    redraw();
    return null;
}
