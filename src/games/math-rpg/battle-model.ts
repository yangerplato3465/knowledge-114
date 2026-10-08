import type { Question } from './questions';

/** Playtest values, not character abilities or final classroom balance. */
export const BATTLE_RULES = { heroHp: 6, damage: 1, pushback: .42, resolveMs: 1250 } as const;
export const STAGES = [
  { name: '第一關', enemy: '小石怪', hp: 3, chargeMs: 24000 },
  { name: '第二關', enemy: '小雲怪', hp: 4, chargeMs: 23000 },
  { name: '第三關', enemy: '小晶怪', hp: 5, chargeMs: 22000 },
  { name: '第四關', enemy: '小影怪', hp: 6, chargeMs: 21000 },
  { name: '第五關・魔王關', enemy: '赫恩・奪輝王', hp: 10, chargeMs: 20000 },
] as const;
export type BattlePhase = 'ready' | 'playing' | 'resolving' | 'review' | 'cleared' | 'defeated';
export type BattleEvent = 'correct' | 'wrong' | 'timeout' | null;
export interface BattleQuestion extends Question { hint?: string }
export interface BattleState {
  stage: number; heroHp: number; enemyHp: number; charge: number;
  phase: BattlePhase; event: BattleEvent; question: BattleQuestion; turn: number;
  elapsed: number; paused: boolean; explanation: string;
}
export function createBattle(next: () => BattleQuestion, stage = 0) {
  if (!Number.isInteger(stage) || stage < 0 || stage >= STAGES.length) throw new Error('無效關卡');
  const state: BattleState = { stage, heroHp: BATTLE_RULES.heroHp, enemyHp: STAGES[stage].hp,
    charge: 0, phase: 'ready', event: null, question: next(), turn: 1, elapsed: 0, paused: false, explanation: '' };
  function newQuestion() {
    state.question = next(); state.turn++; state.phase = 'playing'; state.event = null; state.elapsed = 0; state.explanation = '';
  }
  function resolve(event: Exclude<BattleEvent, null>) {
    state.event = event; state.phase = 'resolving'; state.elapsed = 0;
    if (event === 'correct') {
      state.enemyHp = Math.max(0, state.enemyHp - BATTLE_RULES.damage);
      state.charge = Math.max(0, state.charge - BATTLE_RULES.pushback);
      state.explanation = '答對，出劍！敵人蓄力已壓回。';
    } else {
      state.heroHp = Math.max(0, state.heroHp - BATTLE_RULES.damage); state.charge = 0;
      state.explanation = `${event === 'wrong' ? '這次答案需要調整。' : '敵人蓄力滿，受到攻擊。'} 正解：${state.question.a[state.question.correct]}。${state.question.hint ?? ''}`;
    }
  }
  return {
    state,
    start() { if (state.phase === 'ready') state.phase = 'playing'; },
    pause(paused: boolean) { state.paused = paused; },
    answer(turn: number, index: number) {
      if (state.phase !== 'playing' || state.paused || turn !== state.turn || !Number.isInteger(index) || index < 0 || index >= state.question.a.length) return false;
      resolve(index === state.question.correct ? 'correct' : 'wrong'); return true;
    },
    tick(ms: number) {
      if (state.paused || !Number.isFinite(ms) || ms <= 0) return;
      if (state.phase === 'playing') {
        state.charge = Math.min(1, state.charge + ms / STAGES[state.stage].chargeMs);
        if (state.charge >= 1) resolve('timeout');
      } else if (state.phase === 'resolving') {
        state.elapsed += ms;
        if (state.elapsed >= BATTLE_RULES.resolveMs) {
          if (state.enemyHp === 0) state.phase = 'cleared';
          else if (state.heroHp === 0) state.phase = 'defeated';
          else if (state.event === 'correct') newQuestion();
          else state.phase = 'review';
        }
      }
    },
    continue() { if (state.phase === 'review') newQuestion(); },
    nextStage() {
      if (state.phase !== 'cleared' || state.stage === 4) return false;
      state.stage++; state.enemyHp = STAGES[state.stage].hp; state.heroHp = Math.min(BATTLE_RULES.heroHp,state.heroHp+1);
      state.charge = 0; newQuestion(); state.phase = 'ready'; return true;
    },
    retry() {
      if (state.phase !== 'defeated' && state.phase !== 'cleared') return;
      state.heroHp = BATTLE_RULES.heroHp; state.enemyHp = STAGES[state.stage].hp; state.charge = 0;
      newQuestion(); state.phase = 'ready'; state.paused = false;
    },
  };
}
export type Battle = ReturnType<typeof createBattle>;
