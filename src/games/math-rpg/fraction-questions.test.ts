import { expect, test } from 'vitest';
import { createFractionDeck, FRACTION_KINDS, FRACTION_UNIT } from './fraction-questions';
import { createQuestionDeck, battlePaceFor } from './question-deck';

function rational(text: string): [bigint, bigint] {
  const match = text.match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
  if (!match) return [BigInt(text), 1n];
  const [, whole = '0', n, d] = match;
  return [BigInt(whole) * BigInt(d) + BigInt(n), BigInt(d)];
}
const same = ([a, b]: [bigint, bigint], [c, d]: [bigint, bigint]) => a * d === c * b;
function commonDivisor(a: number, b: number) {
  return Array.from({ length: Math.min(a, b) }, (_, i) => i + 1).filter(i => a % i === 0 && b % i === 0).at(-1)!;
}

test('批次驗算除法、通分、簡單觀察與擴約分，答案唯一且格式正確', () => {
  const covered = new Set<string>(), comparisons = new Set<string>();
  for (const seed of [0, 1, 114, 2026, 0xffffffff]) {
    const deck = createFractionDeck(seed), recent: string[] = [];
    for (let i = 0; i < 1400; i++) {
      const { q, a, correct, kind, hint } = deck();
      expect(recent).not.toContain(q); recent.push(q); if (recent.length > 120) recent.shift();
      expect(new Set(a).size).toBe(a.length); expect(hint).not.toBe(''); covered.add(kind);
      if (kind === 'division' || kind === 'mixed') {
        expect(a).toHaveLength(4);
        const numbers = q.match(/\d+/g)!.map(Number);
        const [total, divisor] = q.includes('÷') ? numbers : [numbers[2], numbers[0]];
        const target: [bigint, bigint] = [BigInt(total), BigInt(divisor)];
        expect(a.map((v, i) => same(rational(v), target) ? i : -1).filter(i => i >= 0)).toEqual([correct]);
        for (let x = 0; x < a.length; x++) for (let y = x + 1; y < a.length; y++) expect(same(rational(a[x]), rational(a[y]))).toBe(false);
        const match = a[correct].match(/(?:(\d+)又)?(\d+)\/(\d+)/)!;
        expect(commonDivisor(Number(match[2]), Number(match[3]))).toBe(1);
        if (kind === 'mixed') {
          expect(Number(match[1])).toBe(Math.floor(total / divisor));
          expect(Number(match[2])).toBeLessThan(Number(match[3]));
        } else {
          expect(a[correct]).not.toContain('又');
          covered.add(total < divisor ? 'proper' : 'improper');
        }
        covered.add(q.includes('相當於') ? 'story' : 'equation');
      } else if (kind === 'expand' || kind === 'reduce') {
        expect(a).toHaveLength(4);
        const [from, to] = [...q.matchAll(/(?:(\d+)又)?(\d+|□)\/(\d+|□)/g)];
        expect(from[1]).toBe(to[1]); covered.add(from[1] ? 'whole-kept' : 'no-whole');
        covered.add(to[2] === '□' ? 'numerator-blank' : 'denominator-blank');
        const target = rational(from[0]);
        expect(a.map((v, i) => same(target, rational(to[0].replace('□', v))) ? i : -1).filter(i => i >= 0)).toEqual([correct]);
        const filled = to[0].replace('□', a[correct]).match(/(\d+)\/(\d+)/)!;
        const scale = kind === 'expand' ? Number(filled[2]) / Number(from[3]) : Number(from[3]) / Number(filled[2]);
        expect(Number.isInteger(scale) && scale >= 2 && scale <= 6).toBe(true);
        expect(a.every(v => Number(v) > 0 && Number(v) <= 100)).toBe(true);
      } else {
        expect(a).toEqual(['＞', '＜', '＝']);
        const [left, right] = q.match(/\d+\/\d+/g)!;
        const [n, d] = rational(left), [m, e] = rational(right);
        const relation = n * e > m * d ? '＞' : n * e < m * d ? '＜' : '＝';
        expect(a[correct]).toBe(relation); comparisons.add(relation);
        expect(n > 0n && n < d && m > 0n && m < e).toBe(true);
        if (kind === 'observe-unit') expect(n === 1n && m === 1n).toBe(true);
        else if (kind === 'observe-gap') expect(d - n === 1n && e - m === 1n).toBe(true);
        else {
          const g1 = commonDivisor(Number(n), Number(d)), g2 = commonDivisor(Number(m), Number(e));
          expect(g1).toBeGreaterThan(1);
          const d1 = Number(d) / g1, d2 = Number(e) / g2;
          expect(d1 * d2 / commonDivisor(d1, d2)).toBeLessThanOrEqual(60);
          expect(d <= 100n && e <= 100n).toBe(true);
        }
      }
    }
  }
  expect(comparisons.size).toBe(3);
  for (const kind of [...FRACTION_KINDS, 'proper', 'improper', 'story', 'equation', 'whole-kept', 'no-whole', 'numerator-blank', 'denominator-blank']) expect(covered.has(kind)).toBe(true);
});

test('單元入口種子可重現，每輪七類題型且使用中間戰鬥節奏', () => {
  const a = createFractionDeck(123), b = createQuestionDeck('五上', FRACTION_UNIT, 123);
  expect(battlePaceFor('五上', FRACTION_UNIT)).toBe('moderate');
  expect(createFractionDeck(124)()).not.toEqual(createFractionDeck(123)());
  for (let block = 0; block < 20; block++) {
    const kinds = new Set();
    for (let i = 0; i < 7; i++) { const q = a(); kinds.add(q.kind); expect(q).toEqual(b()); }
    expect(kinds.size).toBe(7);
  }
});
