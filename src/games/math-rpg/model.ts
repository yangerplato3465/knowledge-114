export const ENEMY_HITS_TABLE = [3, 4, 4, 5, 5, 6] as const;
export const HERO_ATK_TABLE = [25, 32, 40, 50, 62, 75] as const;
export const ENEMY_ATK_TABLE = [10, 13, 16, 20, 24, 28] as const;
export const SHIELD_MAX = 3;
export const SHIELD_EVERY = 3;
export interface EnemyTrait {
  armor?: number;
  special?: { every: number; name: string; bleed?: number; fog?: number };
  enrage?: { at: number; atkMult: number; bleed: number };
}
export const ENEMY_TRAITS: readonly (EnemyTrait | null)[] = [
  null,
  { special: { every: 3, name: '撕裂', bleed: 3 } },
  { special: { every: 3, name: '迷霧', fog: 2 } },
  { special: { every: 2, name: '灼燒', bleed: 4 } },
  { armor: 12 },
  { special: { every: 3, name: '暗影爪', bleed: 3 }, enrage: { at: .5, atkMult: 1.5, bleed: 2 } },
];
export interface BattleState {
  playerMax: number; playerHP: number; roundTime: number; playerArmor: number;
  combo: number; comboCap: number; critChance: number; critMult: number;
  playerStatus: { bleed: number; fog: number }; bleedResist: number;
  playerShield: number; shieldUnlocked: boolean; upgradeTaken: Record<string, number>;
  enemyIndex: number; enemyMax: number; enemyHP: number; enemyEnraged: boolean; enemyAttackCount: number;
}
export function initialBattle(): BattleState {
  return { playerMax: 120, playerHP: 120, roundTime: 30, playerArmor: 0,
    combo: 0, comboCap: 10, critChance: .15, critMult: 2, playerStatus: { bleed: 0, fog: 0 },
    bleedResist: 0, playerShield: 0, shieldUnlocked: false, upgradeTaken: {},
    enemyIndex: 0, enemyMax: 75, enemyHP: 75, enemyEnraged: false, enemyAttackCount: 0 };
}
export const traitOf = (index: number): EnemyTrait => ENEMY_TRAITS[index % ENEMY_TRAITS.length] || {};
export const comboBonus = (state: BattleState) => Math.max(0, Math.min(state.combo, state.comboCap) - 1) * .05;
export const currentHeroDamage = (state: BattleState) => Math.round(HERO_ATK_TABLE[Math.min(state.enemyIndex, HERO_ATK_TABLE.length - 1)] * (1 + comboBonus(state)));
export const enemyArmorValue = (state: BattleState) => traitOf(state.enemyIndex).armor || 0;
export function currentPlayerDamage(state: BattleState) {
  let base: number = ENEMY_ATK_TABLE[Math.min(state.enemyIndex, ENEMY_ATK_TABLE.length - 1)];
  if (state.enemyEnraged) base = Math.round(base * traitOf(state.enemyIndex).enrage!.atkMult);
  return Math.max(0, base - state.playerArmor);
}
export const effectiveRoundTime = (state: BattleState) => state.playerStatus.fog > 0 ? Math.max(8, state.roundTime - 8) : state.roundTime;
export const bleedDamagePerTick = (state: BattleState) => state.bleedResist >= 2 ? 0 : state.bleedResist === 1 ? Math.floor(state.playerStatus.bleed / 2) : state.playerStatus.bleed;
/** 呼叫端先增加 combo；純數值計算，不決定動畫或回合結算時機。 */
export const strikeDamage = (state: BattleState, critical: boolean) => Math.max(1, Math.round(currentHeroDamage(state) * (critical ? state.critMult : 1)) - enemyArmorValue(state));
export const rollCrit = (state: BattleState, random = Math.random) => random() < state.critChance;
export function spawnEnemy(state: BattleState, index: number): BattleState {
  if (!Number.isInteger(index) || index < 0 || index >= ENEMY_HITS_TABLE.length) throw new RangeError('關卡必須介於 0 與 5');
  const hp = Math.max(1, HERO_ATK_TABLE[index] - (traitOf(index).armor || 0)) * ENEMY_HITS_TABLE[index];
  return { ...state, enemyIndex: index, enemyMax: hp, enemyHP: hp, enemyEnraged: false,
    enemyAttackCount: 0, playerStatus: { bleed: 0, fog: 0 } };
}

export interface Upgrade {
  icon: string; title: string; desc: string; weight: number; fx: 'heal' | 'buff'; max?: number;
  apply: (state: BattleState) => void;
}
// apply 僅用於 applyUpgrade 建立的草稿；元件透過 applyUpgrade 取得新狀態。
export const UPGRADES: readonly Upgrade[] = [
  { icon: '💚', title: '治療術', desc: '恢復 35% 最大生命', weight: 17, fx: 'heal',
    apply: s => { s.playerHP = Math.min(s.playerMax, s.playerHP + Math.round(s.playerMax * .35)); } },
  { icon: '🛡️', title: '強化護甲', desc: '護甲 +6（直接抵銷敵人攻擊力）', weight: 20, fx: 'buff', apply: s => { s.playerArmor += 6; } },
  { icon: '❤️', title: '強健體魄', desc: '最大生命 +25', weight: 17, fx: 'heal', apply: s => { s.playerMax += 25; s.playerHP += 25; } },
  { icon: '⏱️', title: '從容思考', desc: '作答時間 +5 秒', weight: 15, fx: 'buff', apply: s => { s.roundTime += 5; } },
  { icon: '💥', title: '會心一擊', desc: '爆擊機率 +10%', weight: 15, fx: 'buff', apply: s => { s.critChance = Math.min(.65, s.critChance + .10); } },
  { icon: '🔥', title: '連擊精通', desc: '連擊上限 +5 層（每層 +5% 傷害）', weight: 15, fx: 'buff', max: 2, apply: s => { s.comboCap += 5; } },
  { icon: '🩹', title: '止血繃帶', desc: '清除負面狀態，流血傷害減半', weight: 12, fx: 'heal', max: 2,
    apply: s => { s.playerStatus.bleed = 0; s.playerStatus.fog = 0; s.bleedResist = Math.min(2, s.bleedResist + 1); } },
  { icon: '✨', title: '護盾祝福', desc: `連對 ${SHIELD_EVERY} 題得 1 層護盾，抵免一次攻擊`, weight: 12, fx: 'buff', max: 1,
    apply: s => { s.shieldUnlocked = true; s.playerShield = Math.min(SHIELD_MAX, s.playerShield + 1); } },
];
export function pickWeighted<T extends { weight: number }>(pool: readonly T[], random = Math.random): T {
  if (!pool.length) throw new RangeError('卡池不可為空');
  let r = random() * pool.reduce((sum, u) => sum + u.weight, 0);
  for (const u of pool) { r -= u.weight; if (r < 0) return u; }
  return pool[pool.length - 1];
}
export function drawUpgrades(state: BattleState, random = Math.random) {
  const pool = UPGRADES.filter(u => !u.max || (state.upgradeTaken[u.title] || 0) < u.max);
  const picks: Upgrade[] = [];
  while (picks.length < 3 && pool.length) {
    const chosen = pickWeighted(pool, random); picks.push(chosen); pool.splice(pool.indexOf(chosen), 1);
  }
  return picks;
}
export function applyUpgrade(state: BattleState, title: string): BattleState {
  const upgrade = UPGRADES.find(u => u.title === title);
  if (!upgrade || (upgrade.max && (state.upgradeTaken[title] || 0) >= upgrade.max)) throw new RangeError('強化不存在或已達上限');
  const next = { ...state, playerStatus: { ...state.playerStatus }, upgradeTaken: { ...state.upgradeTaken } };
  upgrade.apply(next); next.upgradeTaken[title] = (next.upgradeTaken[title] || 0) + 1;
  return next;
}
