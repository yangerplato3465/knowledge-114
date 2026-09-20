import { expect, test } from 'vitest';
import { createGeometryDeck, GEOMETRY_KINDS, circleFraction } from './geometry-questions';
import { battleReducer, createBattle, enemyFor } from './battle';

test('九種模板均衡出題，幾何條件與唯一正解一致', () => {
  const deck = createGeometryDeck(2026), counts = new Map<string, number>();
  for (let i = 0; i < 9000; i++) {
    const q = deck(); counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    expect(q.a).toHaveLength(4); expect(new Set(q.a).size).toBe(4);
    const answer = q.a[q.correct];
    if (q.kind === 'side') {
      const [a, b] = q.q.match(/\d+/g)!.map(Number);
      expect(q.a.filter(v => { const n = parseInt(v); return Math.abs(a - b) < n && n < a + b; })).toEqual([answer]);
    } else {
      const d = q.diagram!;
      expect(d.angles.every(a => a > 0 && a < 360)).toBe(true);
      expect(d.angles.reduce((a, b) => a + b)).toBe(d.type === 'sector' || d.angles.length === 4 ? 360 : 180);
      const angle = d.type === 'sector' ? d.angles.at(-1)! : d.angles.length === 4 ? d.angles[3] : d.angles[0];
      expect(answer).toBe(answer.includes('圓') ? `${circleFraction(angle)} 圓` : `${angle}°`);
      if (d.angles.length === 4) expect(d.angles.every(a => a < 180)).toBe(true);
    }
  }
  expect([...counts.keys()].sort()).toEqual([...GEOMETRY_KINDS].sort());
  expect([...counts.values()].every(n => n === 1000)).toBe(true);
});

test('種子可重現；換題保留蓄力比例，重擊與重試適用難度時間', () => {
  const a = createGeometryDeck(77), b = createGeometryDeck(77);
  for (let i = 0; i < 100; i++) expect(a()).toEqual(b());
  let state = { ...createBattle(1, [1, 1, 1, 1, 1]), charge: 20, questionScale: 1.4 };
  expect(enemyFor(state).damage).toBe(enemyFor({ ...state, questionScale: 1 }).damage);
  state = battleReducer(state, { type: 'answer', correct: true }) as typeof state;
  state = battleReducer(state, { type: 'tick', seconds: 1.2 }) as typeof state;
  const ratio = state.charge / enemyFor(state).interval;
  state = battleReducer(state, { type: 'continue', questionScale: 1 }) as typeof state;
  expect(state.charge / enemyFor(state).interval).toBeCloseTo(ratio);
  expect(state.hp).toBe(200);
  const retry = battleReducer({ ...state, phase: 'lost' }, { type: 'retry', questionScale: 1.4 });
  expect(retry.charge).toBe(0); expect(enemyFor(retry).interval).toBeCloseTo(28 * 1.4 * 1.05);
});
