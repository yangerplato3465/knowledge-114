const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

function loadCase() {
    const file = resolve(__dirname, '../assets/js/detective/cases/starlight.js');
    const window = {};
    runInNewContext(readFileSync(file, 'utf8'), { window, document: { currentScript: { src: pathToFileURL(file).href } }, URL });
    return window.DETECTIVE_CASE;
}

test('左右支路、小物件與八條必要線索串起五題，最後才確認動機', () => {
    const c = loadCase();
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
    assert.equal(objects.length, 4);
    assert.equal(objectIds.size, objects.length);
    for (const h of puzzles) for (const id of [].concat(h.requiresStored || [])) assert.ok(objectIds.has(id), `${h.id} 缺少可收納的 ${id}`);
    assert.ok(c.scenes.flower.hotspots.some(h => h.gives?.includes('moth')));
    assert.ok(c.scenes.bridge.hotspots.some(h => h.gives?.includes('bridge')));
    assert.equal(c.accuseMinClues, 8);
    assert.equal(c.resolutionClue, 'chain');
    assert.equal(c.clues.length, 9);
    assert.ok(c.resolutionPuzzle.answer.at(-1) === 'ask');
    for (const clue of c.clues) assert.ok(clue.icon && clue.name && clue.desc);
});

test('排序、痕跡配對和燈光重現的判定只接受完整證據鏈', async () => {
    const { correctSequence, correctMatches, correctLight } = await import('../assets/js/detective/starlight-rules.js');
    const c = loadCase();
    const board = c.scenes.hut.hotspots.find(h => h.id === 'dutyBoard').puzzle;
    const trace = c.scenes.hut.hotspots.find(h => h.id === 'traceBoard').puzzle;
    const route = c.scenes.bridge.hotspots.find(h => h.id === 'bridgeBox').puzzle;
    assert.ok(correctSequence(board.answer, board.answer));
    assert.equal(correctSequence(board.answer.slice().reverse(), board.answer), false);
    assert.ok(correctSequence(route.answer, route.answer));
    assert.equal(correctSequence(route.answer.slice(0, 3), route.answer), false);
    assert.ok(correctMatches(Object.fromEntries(trace.rows.map(row => [row.id, row.answer])), trace.rows));
    assert.equal(correctMatches({ dust: '第一盞', scratch: '第三盞', fiber: '第二盞' }, trace.rows), false);
    assert.ok(correctLight([1, 1]));
    assert.equal(correctLight([1, 2]), false);
    assert.equal(correctSequence(['moths', 'shade', 'beam', 'mail', 'ask'], c.resolutionPuzzle.answer), true);
});
