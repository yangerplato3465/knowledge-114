const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

function loadCase() {
    const file = resolve(__dirname, '../assets/js/detective/cases/starlight.js');
    const window = {};
    runInNewContext(readFileSync(file, 'utf8'), { window, document: { currentScript: { src: pathToFileURL(file).href } }, URL });
    return window.DETECTIVE_CASE;
}

test('四場景十件可見實物串起五題，最後才確認動機', () => {
    const c = loadCase();
    assert.equal(c.title, '星燈小徑燈光偏移事件');
    const puzzles = Object.values(c.scenes).flatMap(scene => scene.hotspots.filter(h => h.puzzle));
    assert.deepEqual(Object.keys(c.scenes), ['trail', 'hut', 'flower', 'bridge']);
    assert.equal(c.scenes.trail.hotspots.find(h => h.id === 'toFlower').goto, 'flower');
    assert.equal(c.scenes.trail.hotspots.find(h => h.id === 'toBridge').goto, 'bridge');
    assert.equal(puzzles.length, 4);
    assert.equal(c.resolutionPuzzle.kind, 'sequence');
    assert.deepEqual(puzzles.map(h => h.needsClue), ['mark', 'time', 'trace', 'light']);
    assert.deepEqual(puzzles.flatMap(h => h.gives), ['time', 'trace', 'light', 'route']);
    const objects = Object.values(c.scenes).flatMap(scene => scene.objects);
    const objectIds = new Set(objects.map(o => o.id));
    assert.equal(objects.length, 10);
    assert.equal(objectIds.size, objects.length);
    const required = new Set();
    for (const h of puzzles) for (const id of [].concat(h.requiresStored || [])) {
        assert.ok(objectIds.has(id), `${h.id} 缺少可收納的 ${id}`);
        required.add(id);
    }
    assert.deepEqual([...required].sort(), [...objectIds].sort(), '每件可拖物都應服務一個現場謎題');
    for (const h of puzzles) {
        assert.deepEqual([...h.requiresUse].sort(), [...h.requiresStored].sort(), `${h.id} 收集後也須實際使用`);
        for (const id of h.requiresUse) {
            assert.ok(c.objectUses[id]?.some(use => use.target === h.id && use.text), `${id} 無法用於 ${h.id}`);
        }
    }
    assert.deepEqual(Object.keys(c.objectUses).sort(), [...objectIds].sort(), '十件實物都要有劇情用途');
    for (const scene of Object.values(c.scenes)) for (const o of scene.objects) {
        assert.ok(o.draggable && o.art?.length, `${o.id} 應有可拖的實物外觀`);
        assert.equal(o.revealStyle, 'physical', `${o.id} 應在場景裡直接看見獨立實物`);
        const source = scene.hotspots.find(h => h.id === o.sourceHotspot);
        assert.ok(source, `${o.id} 缺少場景來源`);
        const image = o.art.find(p => p.t === 'img');
        assert.ok(image && existsSync(new URL(image.src)), `${o.id} 缺少獨立圖片`);
        assert.ok(o.x < source.x + source.w && source.x < o.x + o.w
            && o.y < source.y + source.h && source.y < o.y + o.h,
        `${o.id} 的拖曳位置須落在對應場景物件附近`);
        assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= 960 && o.y + o.h <= 405,
            `${o.id} 不可被對話卷軸蓋住`);
    }
    const noel = c.scenes.hut.hotspots.find(h => h.id === 'noel');
    assert.equal(typeof noel?.look, 'function');
    assert.match(noel.look({ hasClue: () => false, stored: () => false }), /轉向你/);
    const noelArt = c.scenes.hut.props.find(p => p.frame?.w === 512);
    assert.equal(noelArt?.src, c.opening.noel);
    assert.ok(Math.abs(noelArt.h * 426 / 512 - 198) < 1, '諾爾可見身高須和開場一致');
    assert.ok(c.scenes.flower.hotspots.some(h => h.gives?.includes('moth')));
    assert.ok(c.scenes.bridge.hotspots.some(h => h.gives?.includes('bridge')));
    assert.equal(c.accuseMinClues, 8);
    assert.equal(c.resolutionClue, 'chain');
    assert.equal(c.clues.length, 9);
    assert.ok(c.resolutionPuzzle.answer.at(-1) === 'ask');
    for (const clue of c.clues) assert.ok(clue.icon && clue.name && clue.desc);
});

test('排序、痕跡配對、燈光與郵袋圖形鎖只接受完整證據鏈', async () => {
    const { correctSequence, correctMatches, correctLight, correctPostalLock } = await import('../assets/js/detective/starlight-rules.js');
    const c = loadCase();
    const board = c.scenes.hut.hotspots.find(h => h.id === 'dutyBoard').puzzle;
    const trace = c.scenes.hut.hotspots.find(h => h.id === 'traceBoard').puzzle;
    const route = c.scenes.bridge.hotspots.find(h => h.id === 'bridgeBox').puzzle;
    assert.ok(correctSequence(board.answer, board.answer));
    assert.equal(correctSequence(board.answer.slice().reverse(), board.answer), false);
    assert.equal(route.kind, 'postalLock');
    assert.ok(correctPostalLock(route.answer, route.answer));
    assert.equal(correctPostalLock(['star', 'flower', 'hazel'], route.answer), false);
    assert.equal(correctPostalLock(route.answer.slice(0, 2), route.answer), false);
    assert.ok(correctMatches(Object.fromEntries(trace.rows.map(row => [row.id, row.answer])), trace.rows));
    assert.equal(correctMatches({ dust: '第一盞', scratch: '第三盞', fiber: '第二盞' }, trace.rows), false);
    assert.ok(correctLight([1, 1]));
    assert.equal(correctLight([1, 2]), false);
    assert.equal(correctSequence(['moths', 'shade', 'beam', 'mail', 'ask'], c.resolutionPuzzle.answer), true);
});

test('新案件開場需要的角色方位與場景素材都有可載入檔案', () => {
    const c = loadCase();
    assert.equal(c.startScene, 'trail');
    assert.equal(c.opening.oliSide.length, 4);
    const urls = [c.scenes.trail.bg, c.scenes.bridge.bg, c.scenes.hut.bg,
        c.opening.rear, c.opening.oli, c.opening.noel,
        c.opening.miloKeys, c.opening.miloBetween,
        c.opening.miloWalk,
        ...c.opening.oliSide];
    for (const url of urls) assert.ok(existsSync(new URL(url)), `開場缺少素材：${url}`);
});
