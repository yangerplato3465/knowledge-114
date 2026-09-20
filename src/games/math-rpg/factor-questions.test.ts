import { expect, test } from 'vitest';
import { createFactorDeck, FACTOR_KINDS, FACTOR_UNIT } from './factor-questions';
import { createQuestionDeck } from './question-deck';

test('七種題型各批次驗算：唯一正解、範圍、難度限制與近期不重複', () => {
  const kinds = new Set<string>(), quickDivisors = new Set<number>(), lengths = new Set<number>(), positions = new Set<number>();
  for (const seed of [0, 1, 114, 2026, 0xffffffff]) {
    const deck = createFactorDeck(seed), recent: string[] = [];
    for (let i = 0; i < 1400; i++) {
      const question = deck(), options = question.a.map(Number);
      const [a, b] = question.q.match(/\d+/g)!.map(Number);
      const kind = question.kind; kinds.add(kind); positions.add(question.correct);
      expect(options).toHaveLength(4); expect(new Set(options).size).toBe(4);
      expect(options.every(n => Number.isInteger(n) && n > 0)).toBe(true);
      expect(question.hint).not.toBe('');
      expect(a).toBeGreaterThanOrEqual(1); expect(a).toBeLessThanOrEqual(100);
      if (b !== undefined) expect(b <= 100 && b >= 1).toBe(true);
      const key = kind === 'divisibility' ? `${question.q}|${[...question.a].sort().join(',')}` : question.q;
      expect(recent).not.toContain(key); recent.push(key); if (recent.length > 120) recent.shift();
      let valid: (n: number) => boolean;
      if (kind === 'factor') valid = n => a % n === 0;
      else if (kind === 'common-factor') valid = n => a % n === 0 && b % n === 0;
      else if (kind === 'gcd') {
        // 從所有因數中取最大，獨立於產生器的輾轉相除法。
        const factors = Array.from({ length: Math.min(a, b) }, (_, n) => n + 1).filter(n => a % n === 0 && b % n === 0);
        valid = n => n === Math.max(...factors);
      } else if (kind === 'multiple' || kind === 'divisibility') valid = n => n % a === 0;
      else if (kind === 'common-multiple') valid = n => n % a === 0 && n % b === 0;
      else {
        // 逐個整數尋找最小正公倍數，不共用產生器的公式。
        const least = Array.from({ length: 100 }, (_, n) => n + 1).find(n => n % a === 0 && n % b === 0);
        expect(least).toBeDefined(); valid = n => n === least;
      }
      expect(options.map((n, index) => valid(n) ? index : -1).filter(index => index >= 0)).toEqual([question.correct]);
      if (kind === 'common-multiple' || kind === 'lcm') {
        expect(Math.max(a, b)).toBeGreaterThan(9);
        expect(a % b).not.toBe(0); expect(b % a).not.toBe(0);
        expect(options.some(n => (n % a === 0) !== (n % b === 0))).toBe(true);
      }
      if (kind === 'common-factor') expect(options.some(n => (a % n === 0) !== (b % n === 0))).toBe(true);
      if (kind === 'divisibility') {
        quickDivisors.add(a); lengths.add(question.a[0].length);
        expect([2, 5, 10]).toContain(a);
        expect(options.every(n => n >= 100 && n <= 99999)).toBe(true);
        expect(new Set(question.a.map(s => s.length)).size).toBe(1);
      } else expect(options.every(n => n <= 100)).toBe(true);
    }
  }
  expect(kinds.size).toBe(7); expect(quickDivisors.size).toBe(3); expect(lengths.size).toBe(3); expect(positions.size).toBe(4);
});

test('每輪涵蓋七種題型，獨立種子可重現並由合併單元入口取題', () => {
  const first = createFactorDeck(123), second = createQuestionDeck('五上', FACTOR_UNIT, 123);
  expect(createFactorDeck(124)()).not.toEqual(createFactorDeck(123)());
  for (let block = 0; block < 20; block++) {
    const kinds = new Set();
    for (let i = 0; i < 7; i++) { const q = first(); kinds.add(q.kind); expect(q).toEqual(second()); }
    expect(kinds.size).toBe(FACTOR_KINDS.length);
  }
});
