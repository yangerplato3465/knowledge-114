import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { answerDelay, drawQueue, makeChallengeTasks, wordOf, type WordItem } from './model';
import { pools } from './pools';

const legacy = readFileSync('assets/js/word-sort.js', 'utf8');
// 從原始碼取完整函式；不執行其 DOM 啟動碼，也不另抄一份基準演算法。
function originalFunction(name: string, next: string) {
  return legacy.slice(legacy.indexOf(`    function ${name}(`), legacy.indexOf(`    function ${next}(`));
}
function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function reference(pool: readonly WordItem[], seed: number) {
  return JSON.parse(runInNewContext(`
    var ROUND_SIZE = 12;
    ${originalFunction('shuffle', 'drawQueue')}
    ${originalFunction('drawQueue', 'startRound')}
    ${originalFunction('makeChallengeTasks', 'setChallengeProgress')}
    var learnedItems = drawQueue(pool);
    JSON.stringify({ queue: learnedItems, tasks: makeChallengeTasks() });
  `, { pool, Math: Object.assign(Object.create(Math), { random: random(seed) }) }));
}

it('四組題庫全部欄位與原版等價，保留 65 個單字', () => {
  const original = runInNewContext(`${readFileSync('assets/js/word-sort-pools.js', 'utf8')}; JSON.stringify(window.WORD_SORT_POOLS)`, { window: {} });
  expect(pools).toEqual(JSON.parse(original));
  expect(Object.values(pools).map(pool => pool.length)).toEqual([14, 31, 34, 65]);
});

it('四組題庫各 100 個亂數種子，分類及快遞結果逐項比對原版', () => {
  for (const pool of Object.values(pools)) {
    const before = JSON.stringify(pool);
    for (let seed = 1; seed <= 100; seed++) {
      const rng = random(seed);
      const queue = drawQueue(pool, rng);
      const tasks = makeChallengeTasks(queue, rng);
      expect({ queue, tasks }).toEqual(reference(pool, seed));
      expect(queue).toHaveLength(12);
      expect(queue.filter(item => item.suffix === 'ful')).toHaveLength(6);
      expect(new Set(queue.map(wordOf)).size).toBe(12);
      expect(tasks).toHaveLength(3);
      tasks.forEach(task => {
        expect(task.options[task.targetIndex]).toBe(task.target);
        expect(new Set(task.options.map(item => item.stem)).size).toBe(task.options.length);
      });
    }
    expect(JSON.stringify(pool)).toBe(before);
  }
});

it('空題庫與單邊小題庫可處理，不重複補題', () => {
  expect(drawQueue([])).toEqual([]);
  expect(makeChallengeTasks([])).toEqual([]);
  const small = pools['全部混合'].filter(item => item.suffix === 'less').slice(0, 4);
  expect(drawQueue(small)).toHaveLength(4);
  expect(new Set(drawQueue(small)).size).toBe(4);
});

it('正誤揭答與補充說明保留原停留時間', () => {
  const item = pools['全部混合'][0];
  expect(answerDelay(item, item.suffix)).toBe(900);
  expect(answerDelay(item, item.suffix === 'ful' ? 'less' : 'ful')).toBe(2100);
  const note = pools['全部混合'].find(word => word.note)!;
  expect(answerDelay(note, note.suffix)).toBe(2400);
  expect(answerDelay(note, note.suffix === 'ful' ? 'less' : 'ful')).toBe(3600);
});
