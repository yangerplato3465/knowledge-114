/** UI 與離線模擬共用的純函式模型。時間單位為秒，HP／傷害為整數。 */
export const BALANCE = {
  heroHp: 200, attack: 100, retreat: 8, warning: 3, heavyMultiplier: 1.05, hitGrowth: 1,
  stageHeal: 30, attackGrowth: 15, guardGrowth: 1, guardHeal: 16,
  tempoGrowth: 2, tempoHeal: 14, feedbackMinimum: 1.2, wrongFeedbackSeconds: 2.4, counterDamage: [12, 14, 16, 19, 22], counterMinimum: 6,
  enemyHp: [400, 500, 550, 600, 650],
  intervals: [28, 27, 26, 25, 24], damages: [10, 12, 14, 17, 20],
} as const;
/** 依單元選擇整局節奏；回饋、暫停與成長階段仍凍結蓄力。 */
export const BATTLE_PACING = {
  standard: BALANCE.intervals,
  quick: [18, 17, 16, 15, 14],
} as const;
export type BattlePace = keyof typeof BATTLE_PACING;
export type Card = 'attack' | 'guard' | 'tempo';
export const CARDS: readonly Card[] = ['attack', 'guard', 'tempo'];
export const CARD_INFO = {
  attack: { name: '磨利劍鋒', text: `每次答對的傷害 +${BALANCE.attackGrowth}，持續到本局結束。` },
  guard: { name: '穩固護甲', text: `護甲 +${BALANCE.guardGrowth}，降低敵人傷害；立即回復 ${BALANCE.guardHeal} HP。反擊最低 ${BALANCE.counterMinimum} 傷害。` },
  tempo: { name: '沉著應戰', text: `答對多壓回 ${BALANCE.tempoGrowth} 秒蓄力，立即回復 ${BALANCE.tempoHeal} HP。` },
};
export type Phase = 'battle' | 'feedback' | 'growth' | 'won' | 'lost';
export interface Battle {
  pace: BattlePace;
  phase: Phase; paused: boolean; stage: number; route: number[];
  hp: number; enemyHp: number; charge: number; attack: number; guard: number; retreat: number;
  cards: Card[]; correct: number; answered: number; strikes: number; damageTaken: number;
  stageHits: number; lastHitDamage: number;
  battleSeconds: number; playSeconds: number; feedbackSeconds: number; retries: number;
  message: string; lastCorrect: boolean | null;
}
export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function enemyFor(s: Pick<Battle, 'stage' | 'route'> & Partial<Pick<Battle, 'pace'>>) {
  const heavy = s.route[s.stage] === 1;
  const names = s.stage === 0 ? ['史萊姆', '哥布林'] : s.stage === 4 ? ['魔王・迅擊型', '魔王・重擊型'] : [`第 ${s.stage + 1} 關・迅擊型`, `第 ${s.stage + 1} 關・重擊型`];
  return { name: names[heavy ? 1 : 0], hp: BALANCE.enemyHp[s.stage],
    interval: BATTLE_PACING[s.pace ?? 'standard'][s.stage] * (heavy ? BALANCE.heavyMultiplier : 1),
    damage: BALANCE.damages[s.stage] * (heavy ? BALANCE.heavyMultiplier : 1), heavy };
}
export function createBattle(seed: number, route?: number[], pace: BattlePace = 'standard'): Battle {
  const random = seededRandom(seed);
  return { pace, phase: 'battle', paused: false, stage: 0, route: route ?? Array.from({ length: 5 }, () => random() < .5 ? 0 : 1),
    hp: BALANCE.heroHp, enemyHp: BALANCE.enemyHp[0], charge: 0, attack: BALANCE.attack, guard: 0, retreat: BALANCE.retreat,
    cards: [], correct: 0, answered: 0, strikes: 0, damageTaken: 0, stageHits: 0, lastHitDamage: 0, battleSeconds: 0, playSeconds: 0, feedbackSeconds: 0,
    retries: 0, message: '看清題目，再出劍。', lastCorrect: null };
}
export type Action = { type: 'tick'; seconds: number } | { type: 'answer'; correct: boolean } | { type: 'continue' } | { type: 'card'; card: Card } | { type: 'pause' } | { type: 'resume' } | { type: 'retry' };
export const feedbackDuration = (s: Pick<Battle, 'lastCorrect'>) => s.lastCorrect === false ? BALANCE.wrongFeedbackSeconds : BALANCE.feedbackMinimum;
function escalatingDamage(s: Pick<Battle, 'stageHits' | 'lastHitDamage'>, base: number) {
  return s.stageHits === 0 ? base : Math.max(base, s.lastHitDamage + BALANCE.hitGrowth);
}
export const counterDamage = (s: Pick<Battle, 'stage' | 'guard' | 'stageHits' | 'lastHitDamage'>) => escalatingDamage(s, Math.max(BALANCE.counterMinimum, BALANCE.counterDamage[s.stage] - s.guard));
export function attackDamage(s: Pick<Battle, 'stage' | 'route' | 'guard' | 'stageHits' | 'lastHitDamage'>) {
  const enemy = enemyFor(s);
  return escalatingDamage(s, Math.max(1, Math.round(enemy.damage - s.guard * (enemy.heavy ? BALANCE.heavyMultiplier : 1))));
}
export function battleReducer(s: Battle, action: Action): Battle {
  if (action.type === 'pause') return { ...s, paused: true };
  if (action.type === 'resume') return { ...s, paused: false };
  if (s.paused) return s;
  if (action.type === 'retry') return s.phase === 'lost' ? { ...s, phase: 'battle', hp: BALANCE.heroHp, enemyHp: enemyFor(s).hp, charge: 0, stageHits: 0, lastHitDamage: 0, retries: s.retries + 1, lastCorrect: null, message: '已回復 HP，怪物增傷歸零；保留本局成長，重新挑戰這一關。' } : s;
  if (action.type === 'tick') {
    if (!Number.isFinite(action.seconds) || action.seconds <= 0 || s.phase === 'won' || s.phase === 'lost') return s;
    if (s.phase !== 'battle') return { ...s, playSeconds: s.playSeconds + action.seconds, feedbackSeconds: s.feedbackSeconds + action.seconds };
    const enemy = enemyFor(s);
    // 逐擊結算遞增傷害；大步進也必須在死亡那一擊停止計時。
    let remaining = action.seconds, charge = s.charge, seconds = 0, hp = s.hp;
    let stageHits = s.stageHits, lastHitDamage = s.lastHitDamage, strikes = 0;
    while (hp > 0 && charge + remaining + 1e-9 >= enemy.interval) {
      const untilHit = Math.min(remaining, Math.max(0, enemy.interval - charge));
      seconds += untilHit; remaining -= untilHit; charge = 0;
      lastHitDamage = attackDamage({ ...s, stageHits, lastHitDamage });
      hp = Math.max(0, hp - lastHitDamage); stageHits++; strikes++;
    }
    if (hp > 0) { seconds += remaining; charge += remaining; }
    const damage = s.hp - hp;
    return { ...s, hp, stageHits, lastHitDamage, phase: hp === 0 ? 'lost' : s.phase, charge,
      battleSeconds: s.battleSeconds + seconds, playSeconds: s.playSeconds + seconds,
      strikes: s.strikes + strikes, damageTaken: s.damageTaken + damage,
      message: strikes ? `敵人攻擊 ${strikes} 次，受到 ${damage} 傷害。` : s.message };
  }
  if (action.type === 'answer' && s.phase === 'battle') {
    const damage = action.correct ? Math.min(s.enemyHp, s.attack) : 0;
    const charge = action.correct ? Math.max(0, s.charge - s.retreat) : s.charge;
    return { ...s, phase: 'feedback', enemyHp: s.enemyHp - damage, charge,
      answered: s.answered + 1, correct: s.correct + Number(action.correct), lastCorrect: action.correct, feedbackSeconds: 0,
      message: action.correct ? `答對了！造成 ${damage} 傷害，壓回蓄力。` : `敵人準備反擊：提示結束後受到 ${counterDamage(s)} 傷害，攻擊後蓄力歸零。` };
  }
  if (action.type === 'continue' && s.phase === 'feedback' && s.feedbackSeconds + 1e-9 >= feedbackDuration(s)) {
    const hit = s.lastCorrect === false ? counterDamage(s) : 0;
    const damage = Math.min(s.hp, hit);
    return { ...s, hp: s.hp - damage, damageTaken: s.damageTaken + damage,
      stageHits: s.stageHits + Number(hit > 0), lastHitDamage: hit || s.lastHitDamage,
      charge: s.lastCorrect === false ? 0 : s.charge,
      strikes: s.strikes + Number(damage > 0),
      phase: s.hp - damage <= 0 ? 'lost' : s.enemyHp > 0 ? 'battle' : s.stage === 4 ? 'won' : 'growth', lastCorrect: null,
      message: damage ? `敵人反擊，受到 ${damage} 傷害，蓄力已歸零。繼續挑戰！` : s.message };
  }
  if (action.type === 'card' && s.phase === 'growth' && CARDS.includes(action.card)) {
    const card = action.card;
    return { ...s, phase: 'battle', stage: s.stage + 1, enemyHp: BALANCE.enemyHp[s.stage + 1], charge: 0, stageHits: 0, lastHitDamage: 0,
      hp: Math.min(BALANCE.heroHp, s.hp + BALANCE.stageHeal + (card === 'guard' ? BALANCE.guardHeal : card === 'tempo' ? BALANCE.tempoHeal : 0)),
      attack: s.attack + (card === 'attack' ? BALANCE.attackGrowth : 0), guard: s.guard + (card === 'guard' ? BALANCE.guardGrowth : 0),
      retreat: s.retreat + (card === 'tempo' ? BALANCE.tempoGrowth : 0), cards: [...s.cards, card], message: `獲得「${CARD_INFO[card].name}」，進入下一關。` };
  }
  return s;
}
