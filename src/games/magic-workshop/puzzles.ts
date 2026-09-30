import { shortestSolution, type PuzzleRule } from './rules';
import { BANK_ROWS } from './generated-bank';
import { NOVICE_ROWS } from './novice-bank';

export type Difficulty = 2 | 3 | 4 | 5;
export type Family = 'cycle' | 'relay' | 'space' | 'switch' | 'compare' | 'accumulate' | 'remainder' | 'subtract';
export type Stage = 1 | 2 | 3 | 4 | 5;

// Star tiers bound the entire session; later stages never raise the step ceiling.
export const DIFFICULTY_SETTINGS = {
  2: { name: '見習生', minimumSteps: [4, 4], bottlesByStage: [2, 2, 2, 2, 2], description: '翻開嫩綠筆記，用四步發現第一道魔法。' },
  3: { name: '學徒', minimumSteps: [5, 6], bottlesByStage: [2, 2, 2, 2, 2], description: '循著螢光走進森林，展開溫柔的魔法初試。' },
  4: { name: '魔法師', minimumSteps: [7, 8], bottlesByStage: [2, 2, 2, 3, 3], description: '穿越迷霧與古老符文，用巧思解開工坊的祕密。' },
  5: { name: '大魔導師', minimumSteps: [9, 10], bottlesByStage: [3, 3, 3, 3, 3], description: '踏入星光深處的祕境，迎接大魔導師的試煉。' },
} as const;

export interface Puzzle extends PuzzleRule {
  id: string;
  difficulty: Difficulty;
  stage: Stage;
  minimumSteps: number;
  family: Family;
  visitor: string;
  signature?: string;
}

// Families describe properties found in shortest solutions, not unique psychological difficulties.
export const STAGE_FAMILIES: Record<Difficulty, readonly Family[]> = {
  2: ['accumulate','subtract','remainder','accumulate','compare'],
  3: ['cycle', 'space', 'cycle', 'space', 'cycle'],
  4: ['cycle', 'space', 'cycle', 'relay', 'switch'],
  5: ['cycle', 'compare', 'space', 'relay', 'switch'],
};
export const PUZZLES: readonly Puzzle[] = ([2, 3, 4, 5] as const).flatMap(difficulty =>
  ([1, 2, 3, 4, 5] as const).flatMap((stage):Puzzle[] => {
    if(difficulty===2)return NOVICE_ROWS.map(([capacities,target,family])=>({
      id:`mw-${capacities.join('-')}-t${target}`,capacities,target,minimumSteps:4,
      difficulty,stage,family,signature:`novice-${family}`,visitor:'工坊客人',
    }));
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const family = STAGE_FAMILIES[difficulty][stage - 1];
    return BANK_ROWS.filter(([capacities, , steps, families]) =>
      capacities.length === settings.bottlesByStage[stage - 1]
      && steps >= settings.minimumSteps[0] && steps <= settings.minimumSteps[1] && families.includes(family))
      .map(([capacities, target, minimumSteps, , signature]) => ({
        id: `mw-${capacities.join('-')}-t${target}`, capacities, target, minimumSteps,
        difficulty, stage, family, signature, visitor: '工坊客人',
      }));
  }));

export const stagePool = (difficulty: Difficulty, stage: Stage) =>
  PUZZLES.filter(puzzle => puzzle.difficulty === difficulty && puzzle.stage === stage);

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

export function createDeck(seed: number, difficulty: Difficulty): Puzzle[] {
  const draw = random(seed ^ Math.imul(difficulty, 0x9e3779b1));
  const deck: Puzzle[] = [];
  for (const stage of [1, 2, 3, 4, 5] as const) {
    const unused = stagePool(difficulty, stage).filter(puzzle => !deck.some(previous => previous.id === puzzle.id));
    const varied = unused.filter(puzzle => puzzle.signature !== deck.at(-1)?.signature);
    const options = varied.length ? varied : unused;
    if (!options.length) throw new Error(`魔法工坊 ${difficulty} 星第 ${stage} 關沒有已驗證題目`);
    deck.push(options[Math.floor(draw() * options.length)]);
  }
  return deck;
}

export function verifyPuzzle(puzzle: Puzzle): boolean {
  const path = shortestSolution(puzzle);
  const settings = DIFFICULTY_SETTINGS[puzzle.difficulty];
  const range = settings.minimumSteps;
  return Number.isInteger(puzzle.stage) && puzzle.stage >= 1 && puzzle.stage <= 5
    && puzzle.capacities.length === settings.bottlesByStage[puzzle.stage - 1]
    && puzzle.capacities.every(capacity => Number.isInteger(capacity) && capacity > 0)
    && !puzzle.capacities.includes(puzzle.target)
    && path !== null && path.length === puzzle.minimumSteps && path.length >= range[0] && path.length <= range[1];
}
