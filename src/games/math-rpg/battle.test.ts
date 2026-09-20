import { describe, expect, test } from 'vitest';
import { BALANCE, BATTLE_PACING, battleReducer as step, createBattle, enemyFor, attackDamage, counterDamage, CARDS, type Battle } from './battle';
const answer = (s: Battle, correct = true) => step(step(step(s, { type: 'answer', correct }), { type: 'tick', seconds: 3 }), { type: 'continue' });
describe('戰鬥模型', () => {
  test('快節奏適用五關兩種怪物，顯示週期與實際受擊時間一致，傷害不變', () => {
    for (let stage = 0; stage < 5; stage++) for (const variant of [0, 1]) {
      const route = Array(5).fill(variant);
      const standard = { ...createBattle(1, route), stage, enemyHp: BALANCE.enemyHp[stage] };
      const quick = { ...createBattle(1, route, 'quick'), stage, enemyHp: BALANCE.enemyHp[stage] };
      const enemy = enemyFor(quick);
      expect(enemy.interval).toBe(BATTLE_PACING.quick[stage] * (variant ? BALANCE.heavyMultiplier : 1));
      expect(enemy.interval).toBeLessThan(enemyFor(standard).interval);
      expect(enemy.hp).toBe(enemyFor(standard).hp);
      expect(attackDamage(quick)).toBe(attackDamage(standard));
      const before = step(quick, { type: 'tick', seconds: enemy.interval - .1 });
      expect(before.hp).toBe(200);
      const hit = step(before, { type: 'tick', seconds: .1 });
      expect(hit.hp).toBe(200 - attackDamage(quick));
      expect(hit.charge).toBeCloseTo(0);
      expect(step(standard, { type: 'tick', seconds: enemy.interval }).hp).toBe(200);
    }
  });

  test('快節奏在過關、再戰保持，暫停與回饋仍凍結；新標準局恢復原週期', () => {
    let state = createBattle(1, [0, 0, 0, 0, 0], 'quick');
    const paused = step(state, { type: 'pause' });
    expect(step(paused, { type: 'tick', seconds: 100 })).toBe(paused);
    const feedback = step(state, { type: 'answer', correct: true });
    const waiting = step(feedback, { type: 'tick', seconds: 100 });
    expect(waiting.hp).toBe(state.hp); expect(waiting.charge).toBe(feedback.charge);
    while (state.phase === 'battle') state = answer(state);
    state = step(state, { type: 'card', card: 'tempo' });
    expect(state.pace).toBe('quick'); expect(enemyFor(state).interval).toBe(BATTLE_PACING.quick[1]);
    state = step(state, { type: 'tick', seconds: 10000 });
    state = step(state, { type: 'retry' });
    expect(state.pace).toBe('quick'); expect(state.phase).toBe('battle'); expect(state.charge).toBe(0);
    expect(enemyFor(state).interval).toBe(BATTLE_PACING.quick[1]);
    expect(enemyFor(createBattle(1, [0, 0, 0, 0, 0])).interval).toBe(BALANCE.intervals[0]);
  });
  test('所有路線配對平均輸出相近，護甲同樣作用於重擊', () => {
    for (let stage = 0; stage < 5; stage++) {
      const fast = enemyFor({ stage, route: [0, 0, 0, 0, 0] });
      const heavy = enemyFor({ stage, route: [1, 1, 1, 1, 1] });
      expect(fast.damage / fast.interval).toBeCloseTo(heavy.damage / heavy.interval);
      expect(fast.hp).toBe(heavy.hp);
    }
  });
  test('單次大步進與小步進一致，死亡後不再累計時間', () => {
    const initial = createBattle(114);
    const large = step(initial, { type: 'tick', seconds: 100 });
    let small = initial;
    for (let i = 0; i < 1000; i++) small = step(small, { type: 'tick', seconds: .1 });
    expect(small.hp).toBe(large.hp); expect(small.charge).toBeCloseTo(large.charge);
    const lost = step(initial, { type: 'tick', seconds: 10000 });
    expect(lost.hp).toBe(0); expect(lost.phase).toBe('lost');
    expect(step(lost, { type: 'tick', seconds: 100 })).toBe(lost);
  });
  test('答對壓回蓄力；錯答反擊預告後才結算，回饋不能連答', () => {
    const initial = { ...createBattle(1, [0, 0, 0, 0, 0]), charge: 14 };
    const right = step(initial, { type: 'answer', correct: true });
    expect(right.charge).toBe(6); expect(right.enemyHp).toBe(300);
    const wrong = step(initial, { type: 'answer', correct: false });
    expect(wrong.hp).toBe(initial.hp); expect(wrong.charge).toBe(14);
    expect(step(wrong, { type: 'answer', correct: true })).toBe(wrong);
    expect(step(wrong, { type: 'continue' })).toBe(wrong);
    const waited = step(wrong, { type: 'tick', seconds: 60 });
    expect(waited.charge).toBe(wrong.charge); expect(waited.hp).toBe(wrong.hp);
    const next = step(waited, { type: 'continue' });
    expect(next.hp).toBe(initial.hp - BALANCE.counterDamage[0]);
    expect(next.charge).toBe(0);
    const nearHit = step({ ...initial, charge: 27 }, { type: 'answer', correct: false });
    expect(nearHit.charge).toBe(27); // 閱讀預告期間凍結，反擊結算後才歸零。
    const resolved = step(step(nearHit, { type: 'tick', seconds: 3 }), { type: 'continue' });
    const beforeFull = step(resolved, { type: 'tick', seconds: 27 });
    expect(beforeFull.hp).toBe(resolved.hp);
    const full = step(beforeFull, { type: 'tick', seconds: 1 });
    expect(full.hp).toBe(resolved.hp - attackDamage(resolved));
    expect(full.charge).toBe(0);
  });
  test('暫停凍結時間與所有遊戲操作，重試保留成長且不重發卡', () => {
    const initial = createBattle(1);
    const paused = step(initial, { type: 'pause' });
    for (const event of [{ type: 'tick', seconds: 500 }, { type: 'answer', correct: true }, { type: 'card', card: 'attack' }, { type: 'retry' }] as const) expect(step(paused, event)).toBe(paused);
    let s = initial;
    while (s.phase === 'battle') s = answer(s);
    const waiting = step(s, { type: 'tick', seconds: 100 });
    expect(waiting.hp).toBe(s.hp); expect(waiting.battleSeconds).toBe(s.battleSeconds);
    s = step(s, { type: 'card', card: 'guard' });
    s = step(s, { type: 'tick', seconds: 9999 });
    const retry = step(s, { type: 'retry' });
    expect(retry.stage).toBe(1); expect(retry.cards).toEqual(['guard']); expect(retry.guard).toBe(1);
    expect(retry.hp).toBe(BALANCE.heroHp); expect(retry.enemyHp).toBe(BALANCE.enemyHp[1]); expect(retry.retries).toBe(1);
    expect(step(retry, { type: 'card', card: 'attack' })).toBe(retry);
  });
  test('32 條敵人路線 × 81 種成長序列都可完成五關且只有四次成長', () => {
    for (let mask = 0; mask < 32; mask++) for (let choices = 0; choices < 81; choices++) {
      let s = createBattle(mask, Array.from({ length: 5 }, (_, i) => mask >> i & 1));
      let n = choices;
      while (s.phase !== 'won') {
        if (s.phase === 'growth') { s = step(s, { type: 'card', card: CARDS[n % 3] }); n = Math.floor(n / 3); }
        else s = answer(s);
      }
      expect(s.cards).toHaveLength(4); expect(s.stage).toBe(4); expect(s.enemyHp).toBe(0);
      expect(s.answered).toBeGreaterThanOrEqual(24); expect(s.answered).toBeLessThanOrEqual(28);
    }
  });
  test('錯答反擊可以導致失敗，不能透過無耗時亂答永遠生存', () => {
    let s = createBattle(1);
    for (let i = 0; i < 40 && s.phase !== 'lost'; i++) s = answer(s, false);
    expect(s.phase).toBe('lost'); expect(s.answered).toBe(12); // 12+13+…+23=210，前 11 次合計 187。
  });
  test('反擊與蓄力攻擊共用遞增傷害，閱讀／暫停／答對不增加或清除次數', () => {
    let s = createBattle(1, [0, 0, 0, 0, 0]);
    s = step(s, { type: 'tick', seconds: 28 });
    expect(s.lastHitDamage).toBe(10); expect(s.stageHits).toBe(1);
    const preview = step(s, { type: 'answer', correct: false });
    expect(preview.stageHits).toBe(1); expect(counterDamage(preview)).toBe(12);
    const paused = step(preview, { type: 'pause' });
    expect(step(paused, { type: 'tick', seconds: 99 })).toBe(paused);
    s = step(step(preview, { type: 'tick', seconds: 3 }), { type: 'continue' });
    expect(s.lastHitDamage).toBe(12); expect(s.stageHits).toBe(2); expect(s.charge).toBe(0);
    expect(attackDamage(s)).toBe(13); expect(counterDamage(s)).toBe(13);
    s = answer(s);
    expect(s.stageHits).toBe(2);
    s = step(s, { type: 'tick', seconds: 56 });
    expect(s.lastHitDamage).toBe(14); expect(s.stageHits).toBe(4);
    while (s.phase === 'battle') s = answer(s);
    s = step(s, { type: 'card', card: 'guard' });
    expect(s.stageHits).toBe(0); expect(s.lastHitDamage).toBe(0);
    s = step(s, { type: 'tick', seconds: 9999 });
    const retry = step(s, { type: 'retry' });
    expect(retry.stageHits).toBe(0); expect(retry.lastHitDamage).toBe(0);
    expect(retry.strikes).toBe(s.strikes);
  });
  test('前三次選攻擊後，最後改防守不會多出一整題魔王血量', () => {
    const beforeLast = BALANCE.attack + BALANCE.attackGrowth * 3;
    expect(Math.ceil(BALANCE.enemyHp[4] / beforeLast)).toBe(Math.ceil(BALANCE.enemyHp[4] / (beforeLast + BALANCE.attackGrowth)));
  });
  test('兩種敵人都逐關提高第一擊與反擊傷害，且蓄力更快', () => {
    for (const variant of [0, 1]) {
      let previous = createBattle(1, Array(5).fill(variant));
      expect(attackDamage(previous)).toBeGreaterThanOrEqual(10);
      for (let stage = 1; stage < 5; stage++) {
        const next = { ...previous, stage };
        expect(attackDamage(next) - attackDamage(previous)).toBeGreaterThanOrEqual(2);
        expect(counterDamage(next) - counterDamage(previous)).toBeGreaterThanOrEqual(2);
        expect(enemyFor(next).interval).toBeLessThan(enemyFor(previous).interval);
        expect(enemyFor(next).hp).toBeGreaterThan(enemyFor(previous).hp);
        const defended = { ...next, guard: stage };
        const countered = answer(defended, false);
        expect(countered.hp).toBe(defended.hp - counterDamage(defended));
        previous = next;
      }
    }
  });
  test('勇者固定 200 HP；怪物至少兩倍血量，治療與再戰不可提高上限', () => {
    expect(BALANCE.heroHp).toBe(200);
    for (const hp of BALANCE.enemyHp) expect(hp).toBeGreaterThanOrEqual(400);
    for (const card of CARDS) {
      let s = createBattle(114);
      expect(s.hp).toBe(200);
      while (s.phase === 'battle') s = answer(s);
      s = step(s, { type: 'card', card });
      expect(s.hp).toBe(200);
      s = step(s, { type: 'tick', seconds: 9999 });
      expect(step(s, { type: 'retry' }).hp).toBe(200);
    }
  });
});
