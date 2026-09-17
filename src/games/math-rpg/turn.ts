import { bleedDamagePerTick, currentPlayerDamage, rollCrit, SHIELD_EVERY, SHIELD_MAX, strikeDamage, traitOf, type BattleState } from './model';

export type Answer = 'correct' | 'wrong' | 'timeout';
export type TurnCue = 'impact' | 'shield-earned' | 'enrage' | 'status-applied' | 'status-tick' | 'enemy-defeated' | 'player-defeated' | 'upgrade' | 'victory' | 'defeat' | 'next-question';
export interface TurnEvent { at: number; cue: TurnCue; state: BattleState }
export interface TurnPlan { immediate: BattleState; events: TurnEvent[]; damage: number; critical: boolean; blocked: boolean }
const copy = (s: BattleState): BattleState => ({ ...s, playerStatus: { ...s.playerStatus }, upgradeTaken: { ...s.upgradeTaken } });

/** Millisecond offsets from answer submission. No DOM, timers or renderer ownership.
 * Numeric damage is immediate; impact cues tell the renderer when to reveal it.
 * A plan owns one locked turn and must be discarded on restart/navigation.
 */
export function resolveTurn(input: BattleState, answer: Answer, random = Math.random): TurnPlan {
  if (input.playerHP <= 0 || input.enemyHP <= 0) throw new RangeError('戰鬥已結束，不能再次作答');
  const state = copy(input);
  const pending: { at: number; cue: TurnCue; apply?: () => void }[] = [];
  const add = (at: number, cue: TurnCue, apply?: () => void) => pending.push({ at, cue, apply });
  const trait = traitOf(state.enemyIndex);
  let damage = 0, critical = false, blocked = false;
  const tick = (at: number, next: number) => {
    // Capture old bleed BEFORE a delayed special adds new stacks (legacy semantics).
    const dmg = bleedDamagePerTick(state);
    const active = state.playerStatus.bleed > 0 || state.playerStatus.fog > 0;
    const lethal = active && dmg > 0 && state.playerHP - dmg <= 0;
    if (active) add(at, 'status-tick', () => {
      state.playerHP -= dmg;
      state.playerStatus.bleed = Math.max(0, state.playerStatus.bleed - 1);
      state.playerStatus.fog = Math.max(0, state.playerStatus.fog - 1);
    });
    if (lethal) { add(at, 'player-defeated'); add(at + 900, 'defeat'); }
    else add(next, 'next-question');
  };
  if (answer === 'correct') {
    state.combo++;
    if (state.shieldUnlocked && state.combo % SHIELD_EVERY === 0 && state.playerShield < SHIELD_MAX) {
      state.playerShield++; add(240, 'shield-earned');
    }
    critical = rollCrit(state, random);
    damage = strikeDamage(state, critical);
    state.enemyHP -= damage;
    add(400, 'impact');
    if (trait.enrage && !state.enemyEnraged && state.enemyHP > 0 && state.enemyHP / state.enemyMax <= trait.enrage.at) {
      state.enemyEnraged = true; add(820, 'enrage');
    }
    if (state.enemyHP <= 0) {
      add(700, 'enemy-defeated');
      add(state.enemyIndex >= 5 ? 1650 : 1550, state.enemyIndex >= 5 ? 'victory' : 'upgrade');
    } else tick(900, 1600);
  } else {
    state.combo = 0;
    state.enemyAttackCount++;
    const special = trait.special;
    const isSpecial = special && (state.enemyEnraged || state.enemyAttackCount % special.every === 0);
    blocked = state.playerShield > 0;
    if (blocked) state.playerShield--;
    else {
      damage = currentPlayerDamage(state); state.playerHP -= damage;
      if (isSpecial) add(310, 'status-applied', () => {
        state.playerStatus.bleed += (special.bleed || 0) + (state.enemyEnraged ? trait.enrage?.bleed || 0 : 0);
        state.playerStatus.fog += special.fog || 0;
      });
    }
    add(190, 'impact');
    if (!blocked && state.playerHP <= 0) { add(510, 'player-defeated'); add(1340, 'defeat'); }
    else tick(830, 3000);
  }
  const immediate = copy(state);
  const events = pending.sort((a, b) => a.at - b.at).map(event => {
    event.apply?.();
    return { at: event.at, cue: event.cue, state: copy(state) };
  });
  return { immediate, events, damage, critical, blocked };
}
