import { Container, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { mkButton, mkText } from './ui.js';

// ============================================================
// 偵探事件簿 · 波形解碼盤（三位數頻率）
//
// 玩家用三個數字轉輪把輸出頻率調到正確的赫茲，讓輸出訊號跟備份晶片的
// 原始訊號對上。答案不在這個面板裡 —— 它來自上一關「空間記憶還原」
// 挑出來的三個數字（照時間由早到晚排）。
//
// ★ 為什麼上面那條波形永遠固定、下面那條在對上之前一律畫成雜訊：
//   如果照著目前的數字即時畫出正弦波，439 跟 440 看起來幾乎一樣，
//   玩家只要盯著波形慢慢轉，就能用「愈來愈像」把答案磨出來 ——
//   那就是 docs 第 3 節說的「回饋洩漏距離，推理變成暴力破解」。
//   所以這裡只有兩種狀態：對上，或者還是雜訊。沒有中間值、沒有冷熱提示。
//
// ★ 也因此轉輪不做「靠近就變色」之類的效果。三位數只有一千種組合，
//   任何距離提示都會讓亂試變成最佳解。
//
// 資料格式：
//   answer   : '440'（字串，長度決定幾個轉輪）
//   unit     : 'Hz'
//   sourceLabel / outputLabel : 兩條波形的標題
//   hint     : 常駐提示（只推一把，不報答案）
//   solvedText 由熱點那層負責
// ============================================================

const HUD = {
    bg: 0x0d1b2a, surface: 0x152a3d, surface2: 0x1b354b, border: 0x2a4a66,
    cyan: 0x4fd8e8, cyanDim: 0x2c8fa0, ink: 0xdce9f2, muted: 0x7791a6,
    amber: 0xf2a65a, mint: 0x6fd9a6, rose: 0xe4676b,
};

// 固定形狀的參考波：用兩個頻率疊起來，看起來像儀器上的訊號而不是教科書正弦波
function refWave(g, x, y, w, h, color, alpha = 1) {
    const mid = y + h / 2;
    g.moveTo(x, mid);
    for (let i = 1; i <= w; i++) {
        const t = i / w * Math.PI * 8;
        g.lineTo(x + i, mid - (Math.sin(t) * 0.62 + Math.sin(t * 2.5) * 0.22) * (h / 2));
    }
    g.stroke({ width: 2, color, alpha });
}

// 雜訊：每次畫都不一樣，但「不一樣」本身不帶任何關於答案的資訊
function noiseWave(g, x, y, w, h, color, seed) {
    const mid = y + h / 2;
    let v = seed;
    const rnd = () => (v = (v * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5;
    g.moveTo(x, mid);
    for (let i = 1; i <= w; i += 2) {
        g.lineTo(x + i, mid + rnd() * h * 0.66);
    }
    g.stroke({ width: 2, color, alpha: 0.75 });
}

export function wave(ctx, panel, box, cfg, done) {
    const answer = String(cfg.answer || '440');
    const N = answer.length;
    const unit = cfg.unit || 'Hz';

    const st = ctx.flags.wave || (ctx.flags.wave = { dials: Array(N).fill(0), solved: false });
    if (!Array.isArray(st.dials) || st.dials.length !== N) st.dials = Array(N).fill(0);

    let msg = cfg.hint || '把輸出頻率調到正確的赫茲。';
    let seed = 7;
    let layer = null;

    // ---- 底 ----
    panel.addChild(
        new Graphics().roundRect(box.x, box.y, box.w, box.h, 22)
            .fill({ color: HUD.bg }).stroke({ width: 3, color: HUD.border })
    );
    const title = mkText('📡 波形解碼盤', 22, HUD.cyan, { weight: '700' });
    title.position.set(box.x + 26, box.y + 18);
    panel.addChild(title);
    const sub = mkText('讓輸出訊號跟備份晶片的原始訊號對上，晶片才讀得出來', 13, HUD.muted);
    sub.position.set(box.x + 26, box.y + 48);
    panel.addChild(sub);

    // ---- 兩條波形 ----
    const W_X = box.x + 40, W_W = box.w - 80, W_H = 84;
    const TOP_Y = box.y + 96, BOT_Y = box.y + 210;

    const lane = (y, label, color) => {
        panel.addChild(
            new Graphics().roundRect(W_X, y, W_W, W_H, 10)
                .fill({ color: HUD.surface }).stroke({ width: 1, color: HUD.border })
        );
        const t = mkText(label, 12, color, { weight: '700' });
        t.position.set(W_X + 12, y - 20);
        panel.addChild(t);
    };
    lane(TOP_Y, cfg.sourceLabel || '備份晶片 · 原始訊號', HUD.amber);
    lane(BOT_Y, cfg.outputLabel || '目前輸出', HUD.cyan);

    // 上面那條永遠是同一個形狀 —— 它是玩家要對上的目標，不會因為轉輪而變
    const top = new Graphics();
    refWave(top, W_X + 10, TOP_Y + 8, W_W - 20, W_H - 16, HUD.amber);
    panel.addChild(top);

    // ============================================================
    function redraw() {
        if (layer) layer.destroy({ children: true });
        layer = new Container();
        panel.addChild(layer);

        // ---- 下面那條：對上了畫同樣的波，沒對上就是雜訊 ----
        const g = new Graphics();
        if (st.solved) {
            refWave(g, W_X + 10, BOT_Y + 8, W_W - 20, W_H - 16, HUD.mint);
        } else {
            noiseWave(g, W_X + 10, BOT_Y + 8, W_W - 20, W_H - 16, HUD.cyanDim, seed);
        }
        layer.addChild(g);

        const status = mkText(
            st.solved ? '✔ 訊號對上了' : '✖ 訊號不成形，還是一片雜訊',
            12, st.solved ? HUD.mint : HUD.muted);
        status.anchor.set(1, 0);
        status.position.set(W_X + W_W, BOT_Y - 20);
        layer.addChild(status);

        // ---- 數字轉輪 ----
        const DW = 92, DH = 108, GAP = 20;
        const total = N * DW + (N - 1) * GAP;
        const DX = box.x + (box.w - total) / 2 - 90;   // 往左讓一點，右邊放單位與按鈕
        const DY = box.y + 340;

        for (let i = 0; i < N; i++) {
            const x = DX + i * (DW + GAP);
            layer.addChild(
                new Graphics().roundRect(x, DY, DW, DH, 12)
                    .fill({ color: HUD.surface2 }).stroke({ width: 2, color: HUD.border })
            );
            const d = mkText(String(st.dials[i]), 46, HUD.ink, { weight: '700' });
            d.anchor.set(0.5);
            d.position.set(x + DW / 2, DY + DH / 2);
            layer.addChild(d);

            if (st.solved) continue;
            const step = (k) => {
                st.dials[i] = (st.dials[i] + k + 10) % 10;
                msg = '';
                redraw();
                ctx.save?.();
            };
            layer.addChild(mkButton({
                label: '▲', x: x + DW / 2 - 22, y: DY - 42, w: 44, h: 34,
                size: 15, color: HUD.border, textColor: HUD.ink, onClick: () => step(1),
            }));
            layer.addChild(mkButton({
                label: '▼', x: x + DW / 2 - 22, y: DY + DH + 8, w: 44, h: 34,
                size: 15, color: HUD.border, textColor: HUD.ink, onClick: () => step(-1),
            }));
        }

        const u = mkText(unit, 22, HUD.cyan, { weight: '700' });
        u.position.set(DX + total + 16, DY + DH / 2 - 16);
        layer.addChild(u);

        // ---- 提示與送出 ----
        const hint = mkText(msg, 13, HUD.ink, { wrap: box.w - 300, lineHeight: 20 });
        hint.position.set(box.x + 40, box.y + 500);
        layer.addChild(hint);

        if (!st.solved) {
            layer.addChild(mkButton({
                label: '🔓 送出頻率', x: box.x + box.w - 210, y: box.y + 372, w: 176, h: 46,
                color: HUD.cyan, textColor: 0x08121c, onClick: submit,
            }));
        }
    }

    function submit() {
        if (st.dials.join('') === answer) {
            st.solved = true;
            msg = `頻率鎖定 ${answer} ${unit}。備份晶片的原始記憶讀出來了！`;
            redraw();
            ctx.save?.();
            done();
            return;
        }
        // ★ 不講差多少、不講哪一位錯 —— 只換一組雜訊，看起來有反應就好
        seed = (seed * 31 + 17) & 0x7fffffff;
        msg = '訊號還是雜訊，頻率不對。答案不在這台機器上——想想現場還原時挑出來的那三個數字。';
        redraw();
    }

    redraw();
    return null;
}
