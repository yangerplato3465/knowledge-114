import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createBattle, battleReducer } from './battle';
import { enemySheet, heroSheet, ENEMY_ACTIONS, HERO_ACTIONS, EFFECTS, ENEMY_ART, ENEMY_ATTACKS, attackArt, enemyIntent, visualEvents } from './battle-art';

test('all runtime sheets exist, including the approved goblin charge revision', () => {
  const files = [...HERO_ACTIONS.map(heroSheet), ...EFFECTS.map(id => `effects/${id}/${id}-v1`)];
  for (let stage = 0; stage < 5; stage++) for (const route of [0, 1]) files.push(...ENEMY_ACTIONS.map(action => enemySheet(stage, route, action)));
  for (const path of files) expect(existsSync(`assets/images/math-rpg/${path}.webp`), path).toBe(true);
  expect(enemySheet(0, 1, 'charge')).toContain('goblin-charge-v3');
});
test('consecutive correct answers animate separately; ticks and pauses do not replay attacks', () => {
  const first = createBattle(12);
  const hit = battleReducer(first, { type: 'answer', correct: true });
  expect(visualEvents(first, hit)).toEqual([{ kind: 'attack', amount: 100 }]);
  const tick = battleReducer(hit, { type: 'tick', seconds: 1.3 });
  expect(visualEvents(hit, tick)).toEqual([]);
  const next = battleReducer(tick, { type: 'continue' });
  const second = battleReducer(next, { type: 'answer', correct: true });
  expect(visualEvents(next, second)).toEqual([{ kind: 'attack', amount: 100 }]);
  expect(visualEvents(second, battleReducer(second, { type: 'pause' }))).toEqual([]);
});
test('wrong answers only animate damage when the delayed counterattack settles', () => {
  const first = createBattle(12);
  const wrong = battleReducer(first, { type: 'answer', correct: false });
  expect(visualEvents(first, wrong)).toEqual([]);
  const tick = battleReducer(wrong, { type: 'tick', seconds: 2 });
  const next = battleReducer(tick, { type: 'continue' });
  expect(visualEvents(tick, next)).toEqual([{ kind: 'hurt', amount: 12 }]);
  expect(visualEvents(next, { ...next, retries: next.retries + 1, hp: 200 })).toEqual([{ kind: 'restore', amount: 12 }]);
});
test('each monster has its own attack identity and supported effect, even with armour', () => {
  const kinds = new Set<string>();
  for (let stage = 0; stage < 5; stage++) for (const variant of [0, 1]) {
    const state = { ...createBattle(1, [variant, variant, variant, variant, variant]), stage, guard: 5 };
    const profile = attackArt(state);
    expect(profile).toEqual(ENEMY_ATTACKS[ENEMY_ART[stage][variant].id]);
    expect(EFFECTS).toContain(profile.effect); kinds.add(profile.kind);
  }
  expect(kinds.size).toBe(10);
});
test('head-up countdown switches to counter damage, freezes when paused and ends after defeat', () => {
  const state = { ...createBattle(1, [0, 0, 0, 0, 0]), charge: 21, guard: 3 };
  expect(enemyIntent(state)).toMatchObject({ label: '攻擊倒數', seconds: 7, damage: 7 });
  const wrong = { ...battleReducer(state, { type: 'answer', correct: false }), feedbackSeconds: 1.1 };
  expect(enemyIntent(wrong)).toMatchObject({ label: '反擊倒數', seconds: 1, damage: 9 });
  const paused = battleReducer(wrong, { type: 'pause' });
  expect(enemyIntent(battleReducer(paused, { type: 'tick', seconds: 20 }))).toMatchObject({ label: '已暫停', seconds: 1, damage: 9, counter: true });
  expect(enemyIntent({ ...state, enemyHp: 0 })).toMatchObject({ ended: true, label: '已擊敗' });
});
