import { Container, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { FONT, mkText } from './ui.js';

// ============================================================
// 偵探事件簿 · 全息審訊室
//
// 為什麼獨立成一個檔案，而不是塞進 detective-puzzles.js：
// 那四種謎題（caesar / safe / lens / deduce）都是「解開就結束」的一次性面板，
// 這個不是 —— 它有自己的一份狀態（每個嫌疑人的防線、問過的關鍵字、洗清與否），
// 而且會被反覆打開關閉。混在一起會讓那個檔案的兩種生命週期糾纏在一起。
//
// 掛進系統的方式：detective-puzzles.js 的 PUZZLES 加一行 interrogate，
// 案件資料就能用 puzzle: { type: 'interrogate', … }。
//
// ★ 設計上的三條硬規則（來自企劃書 v1.1，改的時候不要拆掉）：
//
//   1. 防線只有三段（鎮定／動搖／崩潰），不顯示任何數值、也不顯示「還差多少」。
//      給百分比等於發給學生一台試錯儀表板：輪流拿每個證物試每個人，
//      看數字有沒有掉就好，全程不用推理。這和第一款推理板踩過的坑是同一個。
//
//   2. 沒有露出破綻，證物就是鎖著的、點不下去。追問對了才會亮。
//      這樣「該問什麼」比「該丟哪個證物」重要，亂丟證物在機制上不成立。
//
//   3. 「已釐清 / 尚未釐清」必須常駐顯示在嫌疑人卡片上。
//      洗清無辜者是拿最好結局的必要條件，隱形的條件對小孩不公平 ——
//      他們不會知道有這回事，只會拿到一個莫名其妙的結局。
// ============================================================

// 審訊室自己的色票。案件的視覺是科技藍 HUD，跟引擎那套暖色白卡片不同調，
// 所以這裡蓋一層自己的底，不去動共用的 COL（那是所有案件一起用的）。
const HUD = {
    bg: 0x0d1b2a,
    surface: 0x152a3d,
    surface2: 0x1b354b,
    border: 0x2a4a66,
    cyan: 0x4fd8e8,
    cyanDim: 0x2c8fa0,
    ink: 0xdce9f2,
    muted: 0x7791a6,
    amber: 0xf2a65a,
    rose: 0xe4676b,
    mint: 0x6fd9a6,
};

// 防線的三段。刻意只有三格、而且每格都有名字 ——
// 名字比長條圖更難拿來做二分搜尋。
const STAGES = [
    { label: '鎮定', color: HUD.mint },
    { label: '動搖', color: HUD.amber },
    { label: '崩潰', color: HUD.rose },
];

// ---- 文字測量 ----
// Pixi 的 Text 不能在一段文字中間換顏色，可是證詞需要「整段文字裡有幾個字是可點的」。
// 所以自己排版：用 canvas 2d 的 measureText 量出每個字的寬度，再逐字斷行，
// 最後把同一行、同一種樣式的連續字合成一個 Text 物件。
// 中文沒有空格，逐字量是唯一能算準的方式（wordWrapWidth 幫不上忙，它斷不出可點區塊）。
const meter = document.createElement('canvas').getContext('2d');
function measure(str, size, weight = '400') {
    meter.font = `${weight} ${size}px ${FONT}`;
    return meter.measureText(str).width;
}

// 把 [{ s, k? }] 這種「一段一段、有些帶關鍵字 id」的證詞，排成一行一行的可繪製片段。
// 回傳 [[{ s, k, x, w }, …], …]，外層是行、內層是該行上的片段。
function layoutRuns(runs, maxW, size) {
    const lines = [];
    let line = [], x = 0;
    const push = () => { if (line.length) lines.push(line); line = []; x = 0; };

    for (const run of runs) {
        let buf = '', bufX = x;
        const flush = () => {
            if (!buf) return;
            line.push({ s: buf, k: run.k, x: bufX, w: x - bufX });
            buf = '';
        };
        for (const ch of run.s) {
            if (ch === '\n') { flush(); push(); bufX = 0; continue; }
            const w = measure(ch, size, run.k ? '700' : '400');
            if (x + w > maxW) { flush(); push(); bufX = 0; }
            buf += ch;
            x += w;
        }
        flush();
    }
    push();
    return lines;
}

// ============================================================
// 主體
// ctx   = { app, root, say, api }
// box   = panelBase 回傳的可用範圍
// cfg   = 案件資料裡的 puzzle 設定（evidence / suspects）
// done  = 破案條件達成時呼叫（引擎會關面板並發線索）
// ============================================================
export function interrogate(ctx, panel, box, cfg, done) {
    const suspects = cfg.suspects || [];
    const evidence = cfg.evidence || [];

    // ---- 這一場審訊的狀態 ----
    // 存檔要接上的時候，把這個物件塞進 snapshotState() 就好（見 CLAUDE.md 的存檔那條）。
    const st = cfg.state || (cfg.state = {
        defense: {},        // 每個嫌疑人的防線段數 0/1/2
        cleared: {},        // 洗清了沒
        unlocked: {},       // 每個嫌疑人已經解鎖哪些證物（露出破綻才會亮）
        asked: {},          // 問過哪些關鍵字，問過的就不再閃
        misjudge: 0,
    });
    for (const s of suspects) {
        st.defense[s.id] ??= 0;
        st.cleared[s.id] ??= false;
        st.unlocked[s.id] ??= [];
        st.asked[s.id] ??= [];
    }

    let cur = suspects[0];
    let bodyLayer = null;          // 右半邊會整塊重畫，左邊卡片不動

    // ---- 底：把 panelBase 畫的白卡片蓋成科技藍 ----
    // 案件資料把 title 設成空字串，所以底下沒有被蓋掉的標題文字。
    panel.addChild(
        new Graphics().roundRect(box.x, box.y, box.w, box.h, 22)
            .fill({ color: HUD.bg }).stroke({ width: 3, color: HUD.border })
    );

    const title = mkText('🔦 全息審訊室', 22, HUD.cyan, { weight: '700' });
    title.position.set(box.x + 26, box.y + 18);
    panel.addChild(title);

    const sub = mkText('讀完證詞，點畫線的字追問', 13, HUD.muted);
    sub.position.set(box.x + 26, box.y + 48);
    panel.addChild(sub);

    // ============================================================
    // 左欄：嫌疑人卡片（常駐顯示已釐清與否）
    // ============================================================
    const CARD_X = box.x + 24, CARD_W = 176, CARD_H = 96, CARD_GAP = 12, CARD_Y0 = box.y + 80;
    const cards = [];

    suspects.forEach((s, i) => {
        const y = CARD_Y0 + i * (CARD_H + CARD_GAP);
        const card = new Container();
        const bg = new Graphics();
        card.addChild(bg);

        const name = mkText(s.name, 17, HUD.ink, { weight: '700' });
        name.position.set(CARD_X + 14, y + 12);
        const role = mkText(s.role, 12, HUD.muted);
        role.position.set(CARD_X + 14, y + 36);
        const mark = mkText('', 12, HUD.muted, { weight: '700' });
        mark.position.set(CARD_X + 14, y + 62);
        card.addChild(name, role, mark);

        const paint = () => {
            const on = cur?.id === s.id;
            bg.clear().roundRect(CARD_X, y, CARD_W, CARD_H, 12)
                .fill({ color: on ? HUD.surface2 : HUD.surface })
                .stroke({ width: on ? 3 : 1, color: on ? HUD.cyan : HUD.border });
            const clear = st.cleared[s.id];
            mark.text = clear ? '✔ 已釐清' : '？ 尚未釐清';
            mark.style.fill = clear ? HUD.mint : HUD.muted;
        };

        card.eventMode = 'static';
        card.cursor = 'pointer';
        card.on('pointertap', () => { cur = s; cards.forEach(c => c.paint()); drawBody(); });
        card.paint = paint;
        paint();
        panel.addChild(card);
        cards.push(card);
    });

    // 洗清進度：小孩要看得到還剩幾個人沒問完
    const progress = mkText('', 12, HUD.muted);
    progress.position.set(CARD_X + 2, CARD_Y0 + suspects.length * (CARD_H + CARD_GAP) + 4);
    panel.addChild(progress);
    const syncProgress = () => {
        const n = suspects.filter(s => !s.culprit && st.cleared[s.id]).length;
        const total = suspects.filter(s => !s.culprit).length;
        progress.text = `已釐清 ${n} / ${total} 人`;
        progress.style.fill = n === total ? HUD.mint : HUD.muted;
    };

    // ============================================================
    // 右欄：證詞、防線、證物傳輸鏈
    // ============================================================
    const R_X = box.x + 216, R_W = box.w - 216 - 24;      // 216 = 左欄 24+176+16

    function drawBody() {
        if (bodyLayer) bodyLayer.destroy({ children: true });
        bodyLayer = new Container();
        panel.addChild(bodyLayer);
        const s = cur;
        const stage = st.defense[s.id];

        // ---- 抬頭：名字、職稱 ----
        const nm = mkText(s.name, 21, HUD.ink, { weight: '700' });
        nm.position.set(R_X, box.y + 76);
        const rl = mkText(s.role, 13, HUD.muted);
        rl.position.set(R_X, box.y + 104);
        bodyLayer.addChild(nm, rl);

        // ---- 心理防線：三格，沒有數字 ----
        const SEG_W = 58, SEG_H = 13, SEG_GAP = 8;
        const segTotal = STAGES.length * SEG_W + (STAGES.length - 1) * SEG_GAP;
        const segX = R_X + R_W - segTotal;
        const dLab = mkText('心理防線', 12, HUD.muted);
        dLab.position.set(segX, box.y + 72);
        bodyLayer.addChild(dLab);
        STAGES.forEach((sg, i) => {
            const on = i <= stage;
            bodyLayer.addChild(
                new Graphics()
                    .roundRect(segX + i * (SEG_W + SEG_GAP), box.y + 94, SEG_W, SEG_H, 6)
                    .fill({ color: on ? sg.color : HUD.surface2 })
                    .stroke({ width: 1, color: on ? sg.color : HUD.border })
            );
        });
        const dNow = mkText(STAGES[stage].label, 13, STAGES[stage].color, { weight: '700' });
        dNow.anchor.set(1, 0);
        dNow.position.set(R_X + R_W, box.y + 112);
        bodyLayer.addChild(dNow);

        // ---- 證詞面板：上半是證詞（關鍵字可點），下半是嫌疑人的回應 ----
        //
        // ★ 兩塊都必須各自夾住高度，不能讓它們自由長高。
        //   實測踩到過：梅森最後那段自白有四行，回應區一路長到 y=423，
        //   而證物傳輸鏈從 416 開始 —— 字直接壓在證物晶片上。
        //   字級自動縮是為了好讀，遮罩才是「絕對不會溢出」的保證，兩個都要。
        const T_Y = box.y + 140, T_H = 264, PAD = 20;
        const SPLIT = T_Y + 130;                       // 證詞與回應的分界
        bodyLayer.addChild(
            new Graphics().roundRect(R_X, T_Y, R_W, T_H, 12)
                .fill({ color: HUD.surface }).stroke({ width: 1, color: HUD.border })
        );
        bodyLayer.addChild(
            new Graphics().rect(R_X + PAD, SPLIT, R_W - PAD * 2, 1).fill({ color: HUD.border })
        );

        // 證詞：先用 16px 排，行數塞不下就降一級再排一次
        const runs = typeof s.lines === 'function' ? s.lines(st) : s.lines;
        const TEXT_H = SPLIT - 8 - (T_Y + PAD);
        let SIZE = 16, LH = 30, lines = layoutRuns(runs, R_W - PAD * 2, SIZE);
        for (const [sz, lh] of [[16, 30], [15, 28], [14, 26], [13, 24]]) {
            SIZE = sz; LH = lh;
            lines = layoutRuns(runs, R_W - PAD * 2, sz);
            if (lines.length * lh <= TEXT_H) break;
        }
        lines.forEach((ln, li) => {
            const y = T_Y + PAD + li * LH;
            for (const seg of ln) {
                const isKey = !!seg.k;
                const asked = isKey && st.asked[s.id].includes(seg.k);
                const t = mkText(seg.s, SIZE, isKey ? (asked ? HUD.cyanDim : HUD.cyan) : HUD.ink,
                    { weight: isKey ? '700' : '400' });
                t.position.set(R_X + PAD + seg.x, y);
                bodyLayer.addChild(t);
                if (!isKey) continue;
                // 可點的字畫底線，而且底線就是「這裡可以點」的唯一提示
                bodyLayer.addChild(
                    new Graphics().rect(R_X + PAD + seg.x, y + SIZE + 6, seg.w, 2)
                        .fill({ color: asked ? HUD.cyanDim : HUD.cyan })
                );
                const hit = new Graphics()
                    .rect(R_X + PAD + seg.x, y - 2, seg.w, SIZE + 12)
                    .fill({ color: 0xffffff, alpha: 0.001 });
                hit.eventMode = 'static';
                hit.cursor = 'pointer';
                hit.on('pointertap', () => ask(seg.k));
                bodyLayer.addChild(hit);
            }
        });

        // ---- 回應區：追問或出示之後嫌疑人講的話 ----
        // 高度是固定的，字級往下縮到塞得進去為止；再加一層遮罩當保險，
        // 就算以後有人寫了一段超長台詞，也只會被切掉，不會壓到下面的證物。
        const R_TOP = SPLIT + 12, R_BOT = T_Y + T_H - 12, R_AVAIL = R_BOT - R_TOP;
        const reply = mkText(s._reply || '（點證詞裡畫線的字，追問下去）', 14,
            s._reply ? HUD.ink : HUD.muted, { wrap: R_W - PAD * 2, lineHeight: 21 });
        for (const [sz, lh] of [[14, 21], [13, 20], [12, 18], [11, 17]]) {
            reply.style.fontSize = sz;
            reply.style.lineHeight = lh;
            if (reply.height <= R_AVAIL) break;
        }
        reply.position.set(R_X + PAD, R_TOP);
        const clip = new Graphics().rect(R_X + PAD, R_TOP, R_W - PAD * 2, R_AVAIL).fill({ color: 0xffffff });
        reply.mask = clip;
        bodyLayer.addChild(clip, reply);

        // ---- 證物傳輸鏈 ----
        const E_Y = box.y + 412;
        const eLab = mkText('證物傳輸鏈　※ 沒露出破綻的證物是鎖著的', 12, HUD.muted);
        eLab.position.set(R_X, E_Y);
        bodyLayer.addChild(eLab);

        const CH_W = 212, CH_H = 60, CH_GAP = 12;
        evidence.forEach((ev, i) => {
            const x = R_X + i * (CH_W + CH_GAP);
            const open = st.unlocked[s.id].includes(ev.id);
            const chip = new Container();
            chip.addChild(
                new Graphics().roundRect(x, E_Y + 22, CH_W, CH_H, 10)
                    .fill({ color: open ? HUD.surface2 : HUD.surface })
                    .stroke({ width: open ? 2 : 1, color: open ? HUD.cyan : HUD.border })
            );
            const n = mkText(`${open ? '' : '🔒 '}${ev.name}`, 14, open ? HUD.ink : HUD.muted,
                { weight: '700' });
            n.position.set(x + 12, E_Y + 32);
            const d = mkText(ev.desc, 11, HUD.muted, { wrap: CH_W - 24 });
            d.position.set(x + 12, E_Y + 54);
            chip.addChild(n, d);
            if (open) {
                chip.eventMode = 'static';
                chip.cursor = 'pointer';
                chip.on('pointertap', () => show(ev.id));
            }
            bodyLayer.addChild(chip);
        });

        // ---- 底部：狀態列 ----
        const foot = mkText(
            st.cleared[s.id] && !s.culprit
                ? '✔ 這個人已經釐清了，他的秘密跟案子無關。'
                : '把每個人都問清楚，才拿得到最好的結局。',
            13, st.cleared[s.id] && !s.culprit ? HUD.mint : HUD.muted);
        foot.position.set(R_X, box.y + 516);
        bodyLayer.addChild(foot);

        syncProgress();
        cards.forEach(c => c.paint());
    }

    // ---- 追問 ----
    function ask(keyId) {
        const s = cur;
        const k = s.keys?.[keyId];
        if (!k) return;
        if (!st.asked[s.id].includes(keyId)) st.asked[s.id].push(keyId);
        s._reply = k.reply;
        // 追問對了才解鎖證物 —— 這是「該問什麼」比「該丟什麼」重要的關鍵
        if (k.unlock && !st.unlocked[s.id].includes(k.unlock)) st.unlocked[s.id].push(k.unlock);
        if (k.advance) st.defense[s.id] = Math.min(STAGES.length - 1, st.defense[s.id] + 1);
        if (k.clear) st.cleared[s.id] = true;
        drawBody();
        checkDone();
    }

    // ---- 出示證物 ----
    function show(evId) {
        const s = cur;
        const rule = s.show?.[evId];
        if (!rule) { s._reply = s.showElse || '「這個……跟我沒有關係吧。」'; drawBody(); return; }
        s._reply = rule.reply;
        if (rule.advance) st.defense[s.id] = Math.min(STAGES.length - 1, st.defense[s.id] + 1);
        if (rule.clear) st.cleared[s.id] = true;
        if (rule.unlock && !st.unlocked[s.id].includes(rule.unlock)) st.unlocked[s.id].push(rule.unlock);
        drawBody();
        checkDone();
    }

    // 真兇崩潰＝這一關結束。洗清幾個人不影響能不能破案，只影響結局，
    // 所以這裡不擋 —— 擋了就變成隱形的卡關條件。
    function checkDone() {
        const culprit = suspects.find(s => s.culprit);
        if (culprit && st.defense[culprit.id] >= STAGES.length - 1) {
            const n = suspects.filter(s => !s.culprit && st.cleared[s.id]).length;
            ctx.say?.(`🔓 ${culprit.name}的心理防線崩潰了！（無辜者已釐清 ${n} 人）`);
            done();
        }
    }

    drawBody();
    return null;      // 沒有計時器要收
}
