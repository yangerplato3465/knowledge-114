import { currentPuzzle, performanceStars, type GameState } from './session';
import { GUESTS } from './art';
import { shortestSolution, type Action } from './rules';
import type { Difficulty } from './puzzles';
import { journeyDialogue, storyFor } from './story';

export interface SceneModel { game: GameState; difficulty: Difficulty; seed: string; codeOpen: boolean; fullscreen?: boolean }
export interface SceneControl { id: string; label: string; x: number; y: number; w: number; h: number; disabled?: boolean; selected?: boolean }
export type SceneSound = 'pickup' | 'pour' | 'full' | 'success';
/** A Howl instance can be attached for each cue without coupling game rules to audio. */
export type WorkshopSoundBank = Partial<Record<SceneSound, { play(): unknown; stop(): unknown }>>;
export const isSession = (g: GameState) => g.screen === 'playing' || g.screen === 'ready';
export const difficultyTitle = (level: Difficulty) => ({2:'見習生',3:'學徒',4:'魔法師',5:'大魔導師'} as const)[level];
export function targetAction(from: number, id: string): Action | null {
  if (id === 'spring') return { kind: 'fill', from };
  if (id === 'recycler') return { kind: 'empty', from };
  if (id.startsWith('bottle:')) return { kind: 'pour', from, to: Number(id.split(':')[1]) };
  return null;
}
export function sceneDialogue(g: GameState): string {
  if (g.screen === 'home') return '我是米洛。\n一起為朋友施展魔法！';
  if (g.screen === 'finished') return storyFor(g.seed).ending;
  if (g.screen === 'practice-done') return '剛剛好！\n準備迎接第一位客人吧。';
  if (g.screen === 'ready') return g.practice ? '哇，剛剛好！\n魔力液可以交付了！' : journeyDialogue(g);
  if (g.hintLevel) {
    const action = shortestSolution(currentPuzzle(g), g.amounts)?.[0];
    if (!action) return '魔力液已經量好了。';
    if (g.hintLevel === 1) return action.kind === 'empty' ? '試著先倒空一瓶，\n替下一次互倒留空間。' : action.kind === 'fill' ? '試著先補滿一瓶，\n再看看能怎麼分配。' : '互倒時，來源會先空，\n還是另一瓶先滿呢？';
    return action.kind === 'fill' ? `選第 ${action.from + 1} 瓶，\n到魔力泉補滿。` : action.kind === 'empty' ? `選第 ${action.from + 1} 瓶，\n到回收釜倒空。` : `選第 ${action.from + 1} 瓶，\n倒進第 ${action.to! + 1} 瓶。`;
  }
  return g.practice ? '我們一起試試吧！\n量出委託需要的量。' : journeyDialogue(g);
}
export function sceneAnnouncement(g: GameState): string {
  if (g.screen === 'finished') return `${sceneDialogue(g).replaceAll('\n', '')}${g.results.map((r, i) => `第 ${i + 1} 關 ${r.steps} 步，最短 ${r.minimumSteps} 步，通關表現 ${performanceStars(r.steps, r.minimumSteps )} 枚魔力結晶。`).join('')}重玩代碼 ${g.seed}，${difficultyTitle(g.difficulty)}委託。`;
  if (!isSession(g)) return sceneDialogue(g).replaceAll('\n', '');
  const p = currentPuzzle(g);
  const rating = g.practice ? '' : `結晶全亮標準 ${p.minimumSteps} 步內，目前 ${performanceStars(g.history.length, p.minimumSteps )} 枚魔力結晶。`;
  return `${g.practice ? '操作練習。' : `第 ${g.index + 1} 關，共五關。${GUESTS[g.index].name}的訂單，${difficultyTitle(g.difficulty)}委託。`}${rating}目標 ${p.target} 單位。已用 ${g.history.length} 步。${g.amounts.map((n, i) => `第 ${i + 1} 瓶 ${n}/${p.capacities[i]}`).join('，')}。${g.screen === 'ready' ? `委託完成。${g.practice ? '' : `通關表現 ${performanceStars(g.history.length, p.minimumSteps )} 枚魔力結晶，最短 ${p.minimumSteps} 步。`}` : ''}${sceneDialogue(g).replaceAll('\n', '')}`;
}
