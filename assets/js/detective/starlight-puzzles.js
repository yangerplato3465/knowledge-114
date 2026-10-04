import { Container, Graphics } from '../../vendor/pixi.esm.min.js';
import { COL, mkText, mkButton } from './ui.js';
import { correctSequence, correctMatches, correctLight, correctPostalLock } from './starlight-rules.js';

const pale = 0xf1dfb9;
const dark = 0x30233e;
const lampAngles = ['主路', '夜花側', '岔路'];

function textAt(layer, value, x, y, size = 15, width = 0, color = COL.ink) {
    const t = mkText(value, size, color, { wrap: width || undefined, lineHeight: 22 });
    t.position.set(x, y);
    layer.addChild(t);
    return t;
}

function rectangle(layer, x, y, w, h, fill, stroke = COL.border) {
    const g = new Graphics().roundRect(x, y, w, h, 11).fill({ color: fill }).stroke({ width: 2, color: stroke });
    layer.addChild(g);
    return g;
}

function accessPanel(cfg, render, cleanup) {
    const host = document.getElementById('gameContainer');
    const details = document.createElement('details');
    details.className = 'detective-access';
    const summary = document.createElement('summary');
    summary.textContent = '⌨ 鍵盤與螢幕閱讀器操作';
    details.append(summary);
    const body = document.createElement('div');
    details.append(body);
    host?.append(details);
    function draw() {
        body.replaceChildren();
        const title = document.createElement('h2');
        title.textContent = cfg.title;
        const prompt = document.createElement('p');
        prompt.textContent = cfg.prompt;
        body.append(title, prompt);
        render(body);
    }
    draw();
    cleanup.push(() => details.remove());
    return draw;
}

function domButton(parent, label, action, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', action);
    parent.append(button);
    return button;
}

export function starlight(ctx, panel, box, cfg, onSolve) {
    const cleanups = [];
    const puzzleKey = cfg.title;
    const saved = ctx.flags.starlight && typeof ctx.flags.starlight === 'object' ? ctx.flags.starlight : {};
    ctx.flags.starlight = saved;
    const store = value => { saved[puzzleKey] = value; ctx.save(); };
    const work = new Container();
    panel.addChild(work);
    textAt(work, cfg.prompt, box.x + 48, box.y + 81, 17, box.w - 96, COL.ink);
    let helpLevel = 0;
    let drawAccess = () => {};
    const feedback = message => {
        ctx.say(message);
        const live = document.getElementById('detectiveStatus');
        if (live) live.textContent = message;
    };
    const redraw = () => { work.removeChildren().forEach(child => child.destroy()); textAt(work, cfg.prompt, box.x + 48, box.y + 81, 17, box.w - 96, COL.ink); drawWork(); drawAccess(); };
    const hint = () => { helpLevel = Math.min(helpLevel + 1, 2); feedback(helpLevel === 1 ? cfg.hint1 : cfg.hint2); };
    let drawWork;
    let renderAccess;

    if (cfg.kind === 'sequence') {
        const allowed = new Set(cfg.cards.map(card => card.id));
        const restored = Array.isArray(saved[puzzleKey]) ? saved[puzzleKey].filter(id => allowed.has(id)) : [];
        let selected = [...new Set(restored)].slice(0, cfg.cards.length);
        const choose = id => { if (!selected.includes(id)) { selected = [...selected, id]; store(selected); redraw(); } };
        const remove = id => { selected = selected.filter(value => value !== id); store(selected); redraw(); };
        const reset = () => { selected = []; store(selected); redraw(); feedback('已把事件卡放回桌面，可重新排序。'); };
        const check = () => {
            if (selected.length !== cfg.cards.length) { feedback('還有事件卡沒放上去。可以先查看每張卡的時間或證據。'); return; }
            if (!correctSequence(selected, cfg.answer)) { feedback('這條順序和現有紀錄對不上。先看看哪個結果必須發生在另一件事之後，再調整卡片。'); return; }
            if (cfg.title.startsWith('事件順序')) ctx.flags.starlightSeal = true;
            onSolve();
        };
        drawWork = () => {
            textAt(work, '待整理的卡', box.x + 60, box.y + 112, 17, 0, dark);
            textAt(work, '你排出的先後', box.x + 350, box.y + 112, 17, 0, dark);
            cfg.cards.forEach((card, i) => {
                const y = box.y + 143 + i * 54;
                const available = !selected.includes(card.id);
                rectangle(work, box.x + 50, y, 270, 51, available ? pale : 0xbfac9a);
                textAt(work, card.label, box.x + 60, y + 3, 16, 250, COL.ink);
                textAt(work, card.detail, box.x + 60, y + 28, 13, 250, COL.muted);
                const left = new Container(); left.hitArea = { contains: (x, yy) => x >= box.x + 50 && x <= box.x + 320 && yy >= y && yy <= y + 51 };
                left.eventMode = available ? 'static' : 'none'; left.cursor = 'pointer';
                left.on('pointertap', () => choose(card.id)); work.addChild(left);
                const placedId = selected[i];
                rectangle(work, box.x + 340, y, 270, 51, placedId ? 0xd5ece1 : 0xe8d6b4, placedId ? COL.mint : COL.border);
                textAt(work, `${i + 1}. ${placedId ? cfg.cards.find(c => c.id === placedId).label : '點左側卡片放入'}`, box.x + 350, y + 8, 15, 250);
                if (placedId) {
                    const right = new Container(); right.hitArea = { contains: (x, yy) => x >= box.x + 340 && x <= box.x + 610 && yy >= y && yy <= y + 51 };
                    right.eventMode = 'static'; right.cursor = 'pointer'; right.on('pointertap', () => remove(placedId)); work.addChild(right);
                }
            });
            work.addChild(mkButton({ label: '重新排列', x: box.x + 188, y: box.y + box.h - 58, w: 130, h: 35, color: COL.border, onClick: reset }));
            work.addChild(mkButton({ label: '檢查順序', x: box.x + 357, y: box.y + box.h - 58, w: 130, h: 35, onClick: check }));
        };
        renderAccess = body => {
            const list = document.createElement('ol');
            for (const id of selected) { const li = document.createElement('li'); li.textContent = cfg.cards.find(c => c.id === id).label; domButton(li, '移除', () => remove(id)); list.append(li); }
            body.append(list);
            for (const card of cfg.cards) domButton(body, `加入：${card.label}。${card.detail}`, () => choose(card.id), selected.includes(card.id));
            domButton(body, '重新排列', reset);
            domButton(body, '檢查順序', check);
        };
    } else if (cfg.kind === 'match') {
        const valid = new Set(cfg.choices);
        const previous = saved[puzzleKey] && typeof saved[puzzleKey] === 'object' && !Array.isArray(saved[puzzleKey]) ? saved[puzzleKey] : {};
        let selected = Object.fromEntries(cfg.rows.map(row => [row.id, valid.has(previous[row.id]) ? previous[row.id] : '']));
        const choose = (id, value) => { selected = { ...selected, [id]: value }; store(selected); redraw(); };
        const check = () => {
            if (Object.values(selected).some(value => !value)) { feedback('每張痕跡卡都要配到一盞星燈。'); return; }
            if (new Set(Object.values(selected)).size !== cfg.rows.length) { feedback('三張痕跡卡分別來自三盞燈，請再比較。'); return; }
            if (!correctMatches(selected, cfg.rows)) { feedback('有痕跡和現場觀察對不上。回小徑查看卡榫、纖維與灰塵，再調整配對。'); return; }
            onSolve();
        };
        drawWork = () => {
            cfg.rows.forEach((row, index) => {
                const y = box.y + 143 + index * 88;
                rectangle(work, box.x + 48, y, box.w - 96, 78, pale);
                textAt(work, row.label, box.x + 62, y + 6, 16, box.w - 124);
                cfg.choices.forEach((choice, i) => work.addChild(mkButton({ label: choice, x: box.x + 58 + i * 188, y: y + 39, w: 165, h: 34, size: 15, color: selected[row.id] === choice ? COL.mint : COL.border, onClick: () => choose(row.id, choice) })));
            });
            work.addChild(mkButton({ label: '檢查配對', x: box.cx - 70, y: box.y + box.h - 58, w: 140, h: 35, onClick: check }));
        };
        renderAccess = body => {
            for (const row of cfg.rows) {
                const label = document.createElement('label'); label.textContent = row.label + '：';
                const select = document.createElement('select');
                for (const value of ['', ...cfg.choices]) { const option = document.createElement('option'); option.value = value; option.textContent = value || '請選擇'; select.append(option); }
                select.value = selected[row.id]; select.addEventListener('change', () => choose(row.id, select.value)); label.append(select); body.append(label);
            }
            domButton(body, '檢查配對', check);
        };
    } else if (cfg.kind === 'light') {
        let angles = Array.isArray(saved[puzzleKey]) && saved[puzzleKey].length === 2 ? saved[puzzleKey].map(n => Number.isInteger(n) && n >= 0 && n <= 2 ? n : 0) : [0, 0];
        const turn = index => { angles = angles.map((angle, i) => i === index ? (angle + 1) % 3 : angle); store(angles); redraw(); };
        const check = () => {
            if (!correctLight(angles)) { feedback('現在的光斑和昨夜的低光痕還未重合。比較夜花、主路舊標記和岔路邊緣。'); return; }
            onSolve();
        };
        drawWork = () => {
            rectangle(work, box.x + 30, box.y + 131, box.w - 60, 192, 0x1b2a45, 0x9aa9ad);
            const map = new Graphics();
            map.moveTo(box.x + 79, box.y + 283).lineTo(box.x + 572, box.y + 184).stroke({ width: 19, color: 0x6b5a50 });
            map.moveTo(box.x + 335, box.y + 232).lineTo(box.x + 595, box.y + 294).stroke({ width: 15, color: 0x7b6959 });
            map.circle(box.x + 578, box.y + 287, 13).fill({ color: 0xc2a7c7 });
            work.addChild(map);
            textAt(work, '主路舊標記', box.x + 54, box.y + 153, 16, 0, 0xffe6a5);
            textAt(work, '夜花與岔路', box.x + 500, box.y + 260, 16, 0, 0xf9d4f9);
            angles.forEach((angle, i) => {
                const lx = box.x + 230 + i * 154, ly = box.y + 230;
                const g = new Graphics();
                const end = angle === 0 ? { x: lx - 110, y: ly - 31 } : angle === 1 ? { x: lx + 150, y: ly + 54 } : { x: lx + 80, y: ly - 88 };
                g.moveTo(lx, ly).lineTo(end.x, end.y).stroke({ width: 14, color: angle === 1 ? 0xddd698 : 0xf8d873, alpha: 0.68, cap: 'round' });
                g.circle(lx, ly, 12).fill({ color: 0xffd77a });
                work.addChild(g);
            });
            work.addChild(mkButton({ label: `第二盞：${lampAngles[angles[0]]}`, icon: '↻', iconSide: 'right', x: box.x + 65, y: box.y + 352, w: 262, h: 40, onClick: () => turn(0) }));
            work.addChild(mkButton({ label: `第三盞：${lampAngles[angles[1]]}`, icon: '↻', iconSide: 'right', x: box.x + 352, y: box.y + 352, w: 262, h: 40, onClick: () => turn(1) }));
            work.addChild(mkButton({ label: '比較昨夜光痕', x: box.cx - 91, y: box.y + box.h - 58, w: 182, h: 35, onClick: check }));
        };
        renderAccess = body => {
            domButton(body, `轉動第二盞；目前${lampAngles[angles[0]]}`, () => turn(0));
            domButton(body, `轉動第三盞；目前${lampAngles[angles[1]]}`, () => turn(1));
            domButton(body, '比較昨夜光痕', check);
        };
    } else if (cfg.kind === 'postalLock') {
        const allowed = new Set(cfg.symbols.map(symbol => symbol.id));
        let selected = Array.isArray(saved[puzzleKey]) && saved[puzzleKey].length === 3
            ? saved[puzzleKey].map(id => allowed.has(id) ? id : '') : ['', '', ''];
        const turn = index => {
            const current = cfg.symbols.findIndex(symbol => symbol.id === selected[index]);
            selected = selected.map((id, i) => i === index ? cfg.symbols[(current + 1) % cfg.symbols.length].id : id);
            store(selected);
            redraw();
        };
        const check = () => {
            if (selected.some(id => !id)) { feedback('三個圖形環都要轉到一個地標。'); return; }
            if (!correctPostalLock(selected, cfg.answer)) {
                feedback('郵袋沒有打開。沿著奧利走入舊路的方向，再比較星形路標、橋拱拓片與停用郵戳。');
                return;
            }
            onSolve();
        };
        drawWork = () => {
            rectangle(work, box.x + 48, box.y + 136, box.w - 96, 179, 0x473527, 0xcaa66d);
            textAt(work, '封緘郵袋上的三個轉環', box.x + 76, box.y + 151, 17, 0, 0xffe3a9);
            const labels = ['岔口起點', '途中地標', '舊郵箱'];
            selected.forEach((id, index) => {
                const x = box.x + 70 + index * 197;
                textAt(work, labels[index], x + 30, box.y + 190, 16, 150, 0xffe3a9);
                const name = cfg.symbols.find(symbol => symbol.id === id)?.label || '？';
                work.addChild(mkButton({ label: name, icon: '↻', iconSide: 'right', x, y: box.y + 226,
                    w: 166, h: 60, size: 21, color: 0xe8d6b4, onClick: () => turn(index) }));
                if (index < 2) textAt(work, '→', x + 174, box.y + 237, 22, 0, 0xffe3a9);
            });
            textAt(work, '拓片辨地形，印記辨終點；夜花不在郵路上。', box.x + 57, box.y + 331, 16, box.w - 114);
            work.addChild(mkButton({ label: '試開郵袋', x: box.cx - 87, y: box.y + box.h - 58, w: 174, h: 35, onClick: check }));
        };
        renderAccess = body => {
            ['岔口起點', '途中地標', '舊郵箱'].forEach((label, index) => {
                const current = cfg.symbols.find(symbol => symbol.id === selected[index])?.label || '未選';
                domButton(body, `旋轉${label}圖形環，目前${current}`, () => turn(index));
            });
            domButton(body, '試開郵袋', check);
        };
    } else throw new Error(`未知的星燈謎題：${cfg.kind}`);

    drawAccess = accessPanel(cfg, body => { renderAccess(body); domButton(body, '分層提示', hint); domButton(body, '稍後再解，返回場景', ctx.closePanel); }, cleanups);
    redraw();
    panel.addChild(mkButton({ label: '諾爾的提示', x: box.x + 36, y: box.y + box.h - 58, w: 130, h: 35, color: COL.border, onClick: hint }));
    return () => cleanups.forEach(cleanup => cleanup());
}
