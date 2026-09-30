// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { chooseFreshSeed, freshSeed, RECENT_LIMIT } from './fresh-seed';
import { createDeck, stagePool, type Stage } from './puzzles';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it('每一星級與關次都有經驗解的實際題目，不把重玩代碼當成題數', () => {
  const counts = { 3: [56, 38, 56, 38, 56], 4: [58, 50, 58, 76, 47], 5: [27, 27, 21, 27, 16] };
  for (const difficulty of [3, 4, 5] as const) for (let stage = 1; stage <= 5; stage++) {
    const pool = stagePool(difficulty, stage as Stage);
    expect(new Set(pool.map(puzzle => puzzle.id)).size).toBe(counts[difficulty][stage - 1]);
  }
});

it.each([2, 3, 4, 5] as const)('%i 星連開 50 局各關避開最近六題，同一代碼仍固定重播', difficulty => {
  let state = 41;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  let recent: string[][] = Array.from({ length: 5 }, () => []);
  for (let run = 0; run < 50; run++) {
    const seed = chooseFreshSeed(difficulty, recent, random);
    const deck = createDeck(seed, difficulty);
    deck.forEach((puzzle, index) => expect(recent[index]).not.toContain(puzzle.id));
    expect(createDeck(seed, difficulty)).toEqual(deck);
    recent = deck.map((puzzle, index) => [...recent[index], puzzle.id].slice(-RECENT_LIMIT));
  }
});

it('近期題目跨重新載入保留，儲存損毀或停用仍可遊玩', () => {
  freshSeed(3);
  const saved = JSON.parse(localStorage.getItem('magic-workshop-recent-v1-3')!);
  const next = createDeck(freshSeed(3), 3);
  next.forEach((puzzle, index) => expect(saved[index]).not.toContain(puzzle.id));
  localStorage.setItem('magic-workshop-recent-v1-4', 'broken');
  expect(() => freshSeed(4)).not.toThrow();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable'); });
  expect(() => freshSeed(5)).not.toThrow();
});
