const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const read = path => readFileSync(path, 'utf8');

test('偵探 gate 保持先讀進度、失敗阻擋寫入、驗證後才載入 engine', () => {
  const gate = read('assets/js/detective/gate.js');
  const load = gate.indexOf('await loadProgress(session.codeId)');
  const blocked = gate.indexOf('saveBlocked = true');
  const engine = gate.indexOf("await import('./engine.js')");
  assert.ok(load > 0 && blocked > load && engine > blocked, 'gate 安全載入順序被改變');
  assert.match(gate, /if \(!codeId \|\| saveBlocked\) return false/);
  assert.match(gate, /location\.reload\(\)/, '切換組別必須完整 reload');
  assert.match(gate, /DETECTIVE_FLUSH/);
});

test('偵探存檔 v2 保留非 state 欄位並限制未知資料', () => {
  const engine = read('assets/js/detective/engine.js');
  assert.match(engine, /const SAVE_VERSION = 2/);
  for (const field of ['visitedScenes', 'dropPlayed', 'objPositions', 'misjudge', 'closed', 'flags']) {
    assert.match(engine, new RegExp(`\\b${field}\\b`), `存檔缺少 ${field}`);
  }
  assert.match(engine, /if \(!p \|\| p\.v !== SAVE_VERSION\) return false/);
});

test('班級世界資料 adapter 維持 owner filter 與過期訂閱隔離', () => {
  const data = read('assets/js/class-rpg-world-data.js');
  assert.match(data, /where\('ownerId', '==', user\.uid\)/);
  assert.match(data, /const token = generation/);
  assert.match(data, /if \(token !== generation\) return/);
  assert.match(data, /stopStudents\?\.\(\)/);
  assert.match(data, /stopClasses\?\.\(\)/);
});

test('現役 Pixi ESM 版本有記錄且沒有 sourcemap 404', () => {
  const vendor = read('assets/vendor/README.md');
  const esm = read('assets/vendor/pixi.esm.min.js');
  assert.match(vendor, /pixi\.esm\.min\.js \| 8\.20\.1/);
  assert.doesNotMatch(esm, /sourceMappingURL/);
});
