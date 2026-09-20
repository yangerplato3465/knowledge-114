import { expect, test } from 'vitest';
import { createDecimalDeck, DECIMAL_KINDS, DECIMAL_UNIT } from './decimal-questions';
import { createQuestionDeck } from './question-deck';

// 與產生器獨立的十進位字串 / BigInt 驗算，避免浮點近似掩蓋錯誤。
const scaled = (text: string) => { const [a, b = ''] = text.split('.'); return BigInt(a) * 100000n + BigInt(b.padEnd(5, '0')); };
const place = (q: string) => ['個位', '十分位', '百分位', '千分位'].findIndex(p => q.includes(p));
const rounding = (value: bigint, p: number) => {
  const step = 10n ** BigInt(5 - p), remainder = value % step;
  return value - remainder + (remainder * 2n >= step ? step : 0n);
};

test('多種種子連續出題：驗算全部題型、唯一正解、範圍、精度與近期不重複', () => {
  const seen = new Set<string>();
  let fifthDecimals = false, boundaryRounding = false, unequalPlaces = false;
  for (const seed of [0, 1, 7, 2026, 0xffffffff]) {
    const deck = createDecimalDeck(seed), recent: string[] = [];
    for (let i = 0; i < 1200; i++) {
      const question = deck(); seen.add(question.kind);
      expect(recent).not.toContain(question.q);
      recent.push(question.q); if (recent.length > 120) recent.shift();
      expect(question.a).toHaveLength(4);
      expect(new Set(question.a).size).toBe(4);
      expect(question.correct).toBeGreaterThanOrEqual(0); expect(question.correct).toBeLessThan(4);
      expect(question.hint.length).toBeGreaterThan(0);
      if (question.kind === 'add' || question.kind === 'subtract') {
        const numbers = question.q.match(/\d+(?:\.\d+)?/g)!;
        const [left, right] = numbers.map(scaled);
        expect(left < 10000000n && right < 10000000n).toBe(true);
        fifthDecimals ||= numbers.some(n => n.split('.')[1]?.length === 5);
        unequalPlaces ||= numbers[0].split('.')[1]?.length !== numbers[1].split('.')[1]?.length;
        expect(scaled(question.a[question.correct])).toBe(question.kind === 'add' ? left + right : left - right);
      } else if (question.kind === 'round' || question.kind === 'round-source') {
        const p = place(question.q), value = scaled(question.q.match(/\d+(?:\.\d+)?/)![0]);
        if (question.kind === 'round') {
          const result = scaled(question.a[question.correct]);
          expect(result).toBe(rounding(value, p));
          expect(question.a.every(a => (a.split('.')[1]?.length ?? 0) === p)).toBe(true);
          boundaryRounding ||= result % 100000n === 0n && value % 100000n !== 0n;
        } else {
          expect(question.a.map((a, index) => rounding(scaled(a), p) === value ? index : -1).filter(i => i >= 0)).toEqual([question.correct]);
        }
      } else {
        const parts = [...question.q.matchAll(/[甲乙丙]：(\d+(?:\.\d+)?)(?: 個 (\d+(?:\.\d+)?) 合起來)?/g)];
        expect(parts).toHaveLength(3);
        const values = parts.map(p => p[2] ? BigInt(p[1]) * scaled(p[2]) : scaled(p[1]));
        expect(new Set(values).size).toBe(3);
        expect(values.every(v => v >= 0n && v < 10000000n)).toBe(true);
        const valid = question.a.map((a, index) => {
          const ordered = a.split(/[＜＞]/).map(label => values[['甲', '乙', '丙'].indexOf(label)]);
          return ordered.every((v, i) => i === 0 || (question.q.includes('小到大') ? ordered[i - 1] < v : ordered[i - 1] > v)) ? index : -1;
        }).filter(i => i >= 0);
        expect(valid).toEqual([question.correct]);
      }
      if (!question.kind.includes('order')) {
        expect(new Set(question.a.map(scaled)).size).toBe(4);
        for (const answer of question.a) {
          expect(answer).toMatch(/^\d+(?:\.\d{1,5})?$/);
          expect(scaled(answer) >= 0n && scaled(answer) <= 10000000n).toBe(true);
        }
      }
    }
  }
  expect(seen.size).toBe(DECIMAL_KINDS.length);
  expect(fifthDecimals && boundaryRounding && unequalPlaces).toBe(true);
});

test('每六題混合六種題型，種子可重現且遊戲入口使用相同題庫', () => {
  const first = createDecimalDeck(123), second = createQuestionDeck('五上', DECIMAL_UNIT, 123);
  const other = createDecimalDeck(124);
  expect(other()).not.toEqual(createDecimalDeck(123)());
  for (let block = 0; block < 20; block++) {
    const kinds = new Set();
    for (let i = 0; i < 6; i++) { const q = first(); expect(q).toEqual(second()); kinds.add(q.kind); }
    expect(kinds.size).toBe(6);
  }
});
