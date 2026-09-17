import { expect, it } from 'vitest';
import { BattleMotion } from './motion';
import { initialBattle } from './model';
import type { BattleSnapshot } from './session';
const frame = (patch: Partial<BattleSnapshot> = {}): BattleSnapshot => ({ state: { ...initialBattle(), combo: 1 }, phase: 'resolving', questionId: 1, cue: null, deadline: null, offers: [], hit: { damage: 25, blocked: false, critical: false }, ...patch });

it('暫停凍結分鏡時計，恢復延續剩餘演出', () => {
  let now = 0; const motion = new BattleMotion(() => now);
  motion.update(frame()); now = 130; motion.setPaused(true);
  expect(motion.attackProgress('hero')).toBe(.25);
  now = 10000; expect(motion.attackProgress('hero')).toBe(.25);
  motion.setPaused(false); now = 10130;
  expect(motion.attackProgress('hero')).toBe(.5);
  motion.setReducedMotion(true); expect(motion.attackProgress('hero')).toBe(1);
});

it('攻擊按絕對時間採樣，重複事件不重播，結束回到原點', () => {
  let now = 0; const motion = new BattleMotion(() => now);
  motion.update(frame()); now = 260;
  expect(motion.pose('hero').x).toBeCloseTo(1);
  motion.update(frame()); expect(motion.pose('hero').x).toBeCloseTo(1);
  now = 520; expect(motion.pose('hero').x).toBeCloseTo(0);
  now = 2000; expect(motion.pose('hero').rotation).toBe(0);
});
it('錯答由敵人攻擊；命中只讓防守者受傷，護盾不播受傷', () => {
  let now = 0; const motion = new BattleMotion(() => now);
  const wrong = frame({ state: initialBattle() });
  motion.update(wrong); now = 100;
  expect(motion.pose('enemy').x).toBeLessThan(0);
  motion.update({ ...wrong, cue: 'impact' }); now = 180;
  expect(motion.pose('hero').tint).toBe(0xffb3a7);
  motion.update(frame({ questionId: 2, cue: 'impact', hit: { damage: 0, blocked: true, critical: false } }));
  expect(motion.pose('enemy').tint).toBe(0xffffff);
});
it('倒地只從倒地事件開始，跨終點持續；新題與重玩清空', () => {
  let now = 0; const motion = new BattleMotion(() => now);
  const killed = frame({ state: { ...initialBattle(), combo: 1, enemyHP: 0 }, cue: 'impact' });
  motion.update(killed); expect(motion.pose('enemy').alpha).toBe(1);
  now = 300; motion.update({ ...killed, cue: 'enemy-defeated' });
  now = 650; expect(motion.pose('enemy').alpha).toBeCloseTo(.65);
  now = 1000; expect(motion.pose('enemy').alpha).toBeCloseTo(.3);
  motion.update({ ...killed, phase: 'upgrade', cue: 'upgrade' });
  expect(motion.pose('enemy').alpha).toBeCloseTo(.3);
  motion.update(frame({ questionId: 2, phase: 'question' }));
  expect(motion.pose('enemy')).toEqual({ x: 0, y: 0, rotation: 0, alpha: 1, tint: 0xffffff });
});
it('減少動態效果不移動或染色，但保留倒地狀態，恢復偏好不重播', () => {
  let now = 0; const motion = new BattleMotion(() => now);
  motion.update(frame()); now = 100; motion.setReducedMotion(true);
  expect(motion.pose('hero').x).toBe(0);
  motion.update(frame({ cue: 'player-defeated' }));
  expect(motion.pose('hero').alpha).toBe(.3);
  expect(motion.pose('hero').rotation).toBe(0);
  motion.setReducedMotion(false); expect(motion.pose('hero').rotation).toBe(0);
  motion.reset(); expect(motion.pose('hero').alpha).toBe(1);
});
it('背景長時間停頓後直接落在完成姿勢，不重播過期動畫', () => {
  let now = 0; const motion = new BattleMotion(() => now);
  motion.update(frame({ cue: 'player-defeated' })); now = 60000;
  expect(motion.pose('hero').alpha).toBeCloseTo(.3);
  expect(motion.pose('hero').rotation).toBeCloseTo(-.3);
});
