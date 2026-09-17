import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BattleSession, type BattleClock, type BattleSnapshot } from './session';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const answer = (game: BattleSession, result: 'correct' | 'wrong' = 'correct') => game.answer(result, game.getSnapshot().questionId);

it('作答立即鎖定，答題倒數取消，命中與下一題依時間線通知', () => {
  const updates: BattleSnapshot[] = [];
  const game = new BattleSession({ random: () => 1, onChange: snapshot => updates.push(snapshot) });
  const id = game.getSnapshot().questionId;
  expect(answer(game)).toBe(true);
  expect(answer(game, 'wrong')).toBe(false);
  vi.advanceTimersByTime(399);
  expect(updates.map(s => s.cue)).toEqual([null]);
  vi.advanceTimersByTime(1);
  expect(updates.at(-1)?.cue).toBe('impact');
  vi.advanceTimersByTime(1200);
  expect(game.getSnapshot().phase).toBe('question');
  expect(game.answer('wrong', id)).toBe(false);
  expect(vi.getTimerCount()).toBe(1);
  game.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

it('到期僅扣血一次，下一题重新計時', () => {
  const game = new BattleSession();
  vi.advanceTimersByTime(30000);
  expect(game.getSnapshot().state.playerHP).toBe(110);
  expect(answer(game)).toBe(false);
  vi.advanceTimersByTime(3000);
  expect(game.getSnapshot().phase).toBe('question');
  vi.advanceTimersByTime(30000);
  expect(game.getSnapshot().state.playerHP).toBe(100);
  game.dispose();
});

it('重玩使排程與題目 token 失效；離場後不能重啟', () => {
  const update = vi.fn();
  const game = new BattleSession({ onChange: update });
  const id = game.getSnapshot().questionId;
  answer(game);
  game.reset();
  expect(game.answer('wrong', id)).toBe(false);
  vi.advanceTimersByTime(3000);
  expect(game.getSnapshot().state.enemyHP).toBe(75);
  expect(update).toHaveBeenCalledTimes(2);
  game.dispose(); game.dispose();
  vi.advanceTimersByTime(60000);
  expect(update).toHaveBeenCalledTimes(2);
  expect(game.reset()).toBe(false);
  expect(answer(game)).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it('即使已取消的回呼仍被外部時計送達，也不能污染新局', () => {
  let now = 0;
  const callbacks: (() => void)[] = [];
  const clock: BattleClock = { now: () => now, set: callback => callbacks.push(callback), clear: () => {} };
  const game = new BattleSession({ clock, random: () => 1 });
  now = 30001;
  answer(game); // deadline 已過，即使計時器未觸發也視為超時
  expect(game.getSnapshot().state.playerHP).toBe(110);
  const stale = [...callbacks];
  game.reset();
  stale.forEach(callback => callback());
  expect(game.getSnapshot().phase).toBe('question');
  expect(game.getSnapshot().state.playerHP).toBe(120);
  game.dispose();
});

it('完整六關：選卡只接受當次選項，勝利後不再計時', () => {
  const game = new BattleSession({ random: () => 0 });
  let upgrades = 0;
  for (let turn = 0; turn < 50 && game.getSnapshot().phase !== 'victory'; turn++) {
    expect(answer(game)).toBe(true);
    vi.advanceTimersByTime(1650);
    if (game.getSnapshot().phase === 'upgrade') {
      expect(vi.getTimerCount()).toBe(0);
      expect(game.chooseUpgrade('不存在')).toBe(false);
      const offer = game.getSnapshot().offers[0];
      expect(game.chooseUpgrade(offer)).toBe(true);
      expect(game.chooseUpgrade(offer)).toBe(false);
      upgrades++;
    }
  }
  expect(upgrades).toBe(5);
  expect(game.getSnapshot().phase).toBe('victory');
  expect(answer(game)).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  game.dispose();
});

it('敗北後停止排程，重玩恢復初始戰鬥', () => {
  const game = new BattleSession();
  for (let i = 0; i < 12; i++) { answer(game, 'wrong'); vi.advanceTimersByTime(3000); }
  expect(game.getSnapshot().phase).toBe('defeat');
  expect(vi.getTimerCount()).toBe(0);
  game.reset();
  expect(game.getSnapshot().state.playerHP).toBe(120);
  expect(vi.getTimerCount()).toBe(1);
  game.dispose();
});

it('快照與通知參數不能修改內部戰鬥；通知內重玩不殘留事件', () => {
  let game: BattleSession;
  game = new BattleSession({ random: () => 1, onChange: snapshot => {
    snapshot.state.playerStatus.bleed = 99;
    if (snapshot.cue === 'impact') game.reset();
  } });
  game.getSnapshot().state.enemyHP = 0;
  answer(game);
  vi.advanceTimersByTime(2000);
  expect(game.getSnapshot().state.enemyHP).toBe(75);
  expect(game.getSnapshot().state.playerStatus.bleed).toBe(0);
  expect(vi.getTimerCount()).toBe(1);
  game.dispose();
});

it('觀察者拋錯時停止排程，避免背景繼續扣血', () => {
  const game = new BattleSession({ onChange: () => { throw new Error('renderer failed'); } });
  expect(() => answer(game)).toThrow('renderer failed');
  expect(game.getSnapshot().phase).toBe('disposed');
  expect(vi.getTimerCount()).toBe(0);
});
