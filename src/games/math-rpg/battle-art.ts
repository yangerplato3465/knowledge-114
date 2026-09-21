import { attackDamage, counterDamage, enemyFor, feedbackDuration, type Battle } from './battle';
export const SCENE_SIZE = { width: 640, height: 300, actorOffset: 80, ground: 261 } as const;

export const REGIONS = [
  { name: '晨光草原', subtitle: '從這裡，踏出第一步', sky: 0xd7f0ed, hill: 0x9ed3b6, back: 0xbfe2ce, ground: 0x628e69, accent: 0xffd985 },
  { name: '蘑菇森林', subtitle: '小心林間的神祕住客', sky: 0xdcebd6, hill: 0x83b897, back: 0xb3d3ab, ground: 0x587f60, accent: 0xf0b49b },
  { name: '微風山谷', subtitle: '讓你的思路，比雷電更快', sky: 0xd9edf6, hill: 0x91b4c7, back: 0xb6d2df, ground: 0x6c8799, accent: 0xf8dfa3 },
  { name: '星火遺跡', subtitle: '勇氣，是再試一次的力量', sky: 0xeae0ee, hill: 0xb0a3c3, back: 0xd3c4dc, ground: 0x8b7e9b, accent: 0xffc7a5 },
  { name: '天空王城', subtitle: '最後的試煉，就在眼前', sky: 0xdde3f5, hill: 0x9badd1, back: 0xbecbeb, ground: 0x7e8bac, accent: 0xffdf97 },
] as const;
export const ENEMY_ATTACKS = {
  slime: { label: '彈跳水花', effect: 'hit-spark', kind: 'splash', color: 0x64d9f5, lunge: 160, lift: 14 },
  goblin: { label: '木棒重擊', effect: 'hit-spark', kind: 'club', color: 0xd4ac6b, lunge: 160, lift: 0 },
  bat: { label: '毒牙俯衝', effect: 'void-slash', kind: 'fang', color: 0xbb94ec, lunge: 170, lift: 22 },
  mushroom: { label: '荊棘藤拳', effect: 'enemy-impact', kind: 'vine', color: 0x95d58d, lunge: 150, lift: 0 },
  lizard: { label: '雷爪突襲', effect: 'storm-lightning', kind: 'lightning', color: 0x8ef2ff, lunge: 165, lift: 5 },
  'armored-beast': { label: '鐵甲衝撞', effect: 'hit-spark', kind: 'ram', color: 0xc3d3e3, lunge: 175, lift: 0 },
  assassin: { label: '雙刃影襲', effect: 'sword-slash', kind: 'slash', color: 0xd2b6f2, lunge: 185, lift: 6 },
  colossus: { label: '咒焰重拳', effect: 'enemy-impact', kind: 'fire', color: 0xffb364, lunge: 145, lift: 0 },
  'storm-dragon': { label: '暴風雷擊', effect: 'storm-lightning', kind: 'storm', color: 0x9adeff, lunge: 55, lift: 16 },
  'void-king': { label: '虛空裂爪', effect: 'void-slash', kind: 'void', color: 0xf599e8, lunge: 130, lift: 0 },
} as const;
export function attackArt(state: Pick<Battle, 'stage' | 'route'>) {
  return ENEMY_ATTACKS[ENEMY_ART[state.stage][state.route[state.stage] === 1 ? 1 : 0].id];
}
export function enemyIntent(state: Battle) {
  const counter = state.phase === 'feedback' && state.lastCorrect === false;
  const ended = state.enemyHp <= 0 || state.phase === 'lost';
  const seconds = Math.max(0, Math.ceil(counter ? feedbackDuration(state) - state.feedbackSeconds : enemyFor(state).interval - state.charge));
  return { label: ended ? state.phase === 'lost' ? '戰鬥結束' : '已擊敗' : state.paused ? '已暫停' : counter ? '反擊倒數' : state.phase === 'feedback' ? '蓄力暫停' : '攻擊倒數', seconds, damage: counter ? counterDamage(state) : attackDamage(state), ended, counter };
}
export const ENEMY_ART = [
  [{ id: 'slime', name: '果凍史萊姆' }, { id: 'goblin', name: '木棒哥布林' }],
  [{ id: 'bat', name: '毒牙蝙蝠' }, { id: 'mushroom', name: '荊棘魔菇' }],
  [{ id: 'lizard', name: '雷紋蜥蜴' }, { id: 'armored-beast', name: '鐵甲魔獸' }],
  [{ id: 'assassin', name: '暗影刺客' }, { id: 'colossus', name: '咒焰巨像' }],
  [{ id: 'storm-dragon', name: '暴風魔龍' }, { id: 'void-king', name: '虛空魔王' }],
] as const;
export const HERO_ACTIONS = ['idle', 'attack', 'hurt', 'restore', 'victory', 'defeat'] as const;
export const ENEMY_ACTIONS = ['idle', 'charge', 'attack', 'hurt', 'defeat'] as const;
export const EFFECTS = ['sword-slash', 'hit-spark', 'enemy-impact', 'correct-burst', 'wrong-warning', 'heal-ring', 'guard-flash', 'charge-aura', 'storm-lightning', 'void-slash'] as const;
export const artUrl = (path: string) => `${import.meta.env.BASE_URL}assets/images/math-rpg/${path}.webp`;
export const heroSheet = (action: string) => `hero/hero-${action}-v1`;
export function enemySheet(stage: number, route: number, action: string) {
  const id = ENEMY_ART[stage][route === 1 ? 1 : 0].id;
  const version = id === 'goblin' && action === 'charge' ? 3 : 1;
  return `enemies/stage-${stage + 1}/${id}/${id}-${action}-v${version}`;
}
export type VisualEvent = { kind: 'attack' | 'hurt' | 'restore'; amount: number };
// Counters distinguish consecutive correct answers, timed attacks and counterattacks.
export function visualEvents(previous: Battle, next: Battle): VisualEvent[] {
  if (next.stage !== previous.stage || next.retries !== previous.retries) return [{ kind: 'restore', amount: Math.max(0, next.hp - previous.hp) }];
  const events: VisualEvent[] = [];
  if (next.strikes > previous.strikes) events.push({ kind: 'hurt', amount: Math.max(0, previous.hp - next.hp) });
  if (next.correct > previous.correct) events.push({ kind: 'attack', amount: Math.max(0, previous.enemyHp - next.enemyHp) });
  return events;
}
