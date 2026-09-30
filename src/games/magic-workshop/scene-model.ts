import { currentPuzzle, performanceStars, type GameState } from './session';
import { GUESTS } from './art';
import { shortestSolution, type Action } from './rules';
import type { Difficulty } from './puzzles';

export interface SceneModel { game: GameState; difficulty: Difficulty; seed: string; codeOpen: boolean; fullscreen?: boolean }
export interface SceneControl { id: string; label: string; x: number; y: number; w: number; h: number; disabled?: boolean; selected?: boolean }
export type SceneSound = 'pickup' | 'pour' | 'full' | 'success';
/** A Howl instance can be attached for each cue without coupling game rules to audio. */
export type WorkshopSoundBank = Partial<Record<SceneSound, { play(): unknown; stop(): unknown }>>;
export const isSession = (g: GameState) => g.screen === 'playing' || g.screen === 'ready';
export function targetAction(from: number, id: string): Action | null {
  if (id === 'spring') return { kind: 'fill', from };
  if (id === 'recycler') return { kind: 'empty', from };
  if (id.startsWith('bottle:')) return { kind: 'pour', from, to: Number(id.split(':')[1]) };
  return null;
}
export function sceneDialogue(g: GameState): string {
  if (g.screen === 'home') return '晚安，我是米洛。\n今晚，也讓魔法發光吧！';
  if (g.screen === 'finished') return '五份心意，都送到了！\n你讓整座森林亮了起來。';
  if (g.screen === 'practice-done') return '剛剛好！\n準備迎接第一位客人吧。';
  if (g.screen === 'ready') return '哇，剛剛好！\n這份魔法可以出發囉！';
  if (g.hintLevel) {
    const action = shortestSolution(currentPuzzle(g), g.amounts)?.[0];
    if (!action) return '這份魔法，已經剛剛好了。';
    if (g.hintLevel === 1) return action.kind === 'empty' ? '有時候，留一點空間，\n才裝得下新的可能。' : action.kind === 'fill' ? '滿滿的一瓶，\n也許就是下一個靈感。' : '看看兩個瓶子，\n誰的空間比較小呢？';
    return action.kind === 'fill' ? `第 ${action.from + 1} 瓶，\n正在等魔力泉的光。` : action.kind === 'empty' ? `讓第 ${action.from + 1} 瓶\n在回收釜歇一會兒吧。` : `第 ${action.from + 1} 瓶的魔法，\n正好能借給第 ${action.to! + 1} 瓶。`;
  }
  return g.practice ? '我們一起試試吧！\n先量出這個份量。' : `${GUESTS[g.index].name}的委託來了。\n${['把露珠的魔法留住吧！', '讓好消息帶著光出發！', '為晚歸的人留一盞燈。', '草藥與魔法，最合拍了。', '再添一點溫暖的魔法吧！'][g.index]}`;
}
export function sceneAnnouncement(g: GameState): string {
  if (g.screen === 'finished') return `${sceneDialogue(g).replaceAll('\n', '')}${g.results.map((r, i) => `第 ${i + 1} 關 ${r.steps} 步，最短 ${r.minimumSteps} 步，通關表現 ${performanceStars(r.steps, r.minimumSteps )} 枚魔力結晶。`).join('')}重玩代碼 ${g.seed}，${['初階','進階','大師'][g.difficulty-3]}委託。`;
  if (!isSession(g)) return sceneDialogue(g).replaceAll('\n', '');
  const p = currentPuzzle(g);
  const rating = g.practice ? '' : `結晶全亮標準 ${p.minimumSteps} 步內，目前 ${performanceStars(g.history.length, p.minimumSteps )} 枚魔力結晶。`;
  return `${g.practice ? '操作練習。' : `第 ${g.index + 1} 關，共五關。${GUESTS[g.index].name}的訂單，${['初階','進階','大師'][g.difficulty-3]}委託。`}${rating}目標 ${p.target} 單位。已用 ${g.history.length} 步。${g.amounts.map((n, i) => `第 ${i + 1} 瓶 ${n}/${p.capacities[i]}`).join('，')}。${g.screen === 'ready' ? `委託完成。${g.practice ? '' : `通關表現 ${performanceStars(g.history.length, p.minimumSteps )} 枚魔力結晶，最短 ${p.minimumSteps} 步。`}` : ''}${g.hintLevel ? sceneDialogue(g) : ''}`;
}
