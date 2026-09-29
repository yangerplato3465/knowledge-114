import { applyAction, emptyBottles, hasTarget, type Action } from './rules';
import { createDeck, type Difficulty, type Puzzle } from './puzzles';
import { GUIDE } from './art';

export const PRACTICE: Puzzle = {
  id: 'practice', capacities: [2, 3], target: 2, difficulty: 3, stage: 1,
  minimumSteps: 1, family: 'cycle', visitor: GUIDE.name,
};

export interface Result { puzzleId: string; steps: number; minimumSteps: number }
export const TWO_STAR_ALLOWANCE = 2;
// Rate only completed puzzles. Undo/restart and hints keep their existing rules.
export function performanceStars(steps: number, minimumSteps: number): 1 | 2 | 3 {
  if (steps === minimumSteps) return 3;
  return steps <= minimumSteps + TWO_STAR_ALLOWANCE ? 2 : 1;
}
export interface Move { before: number[]; action: Action }
export interface GameState {
  screen: 'home' | 'playing' | 'ready' | 'practice-done' | 'finished';
  practice: boolean;
  difficulty: Difficulty;
  seed: number;
  deck: Puzzle[];
  index: number;
  amounts: number[];
  history: Move[];
  results: Result[];
  selected: number | null;
  hintLevel: 0 | 1 | 2;
  lastAction: Action | 'deliver' | null;
  effectVersion: number;
}

export type GameEvent =
  | { type: 'start'; seed: number; difficulty: Difficulty }
  | { type: 'practice' }
  | { type: 'select'; index: number | null }
  | { type: 'operate'; action: Action }
  | { type: 'undo' }
  | { type: 'restart' }
  | { type: 'hint' }
  | { type: 'deliver' }
  | { type: 'home' };

export const initialGame: GameState = {
  screen: 'home', practice: false, difficulty: 3, seed: 0, deck: [], index: 0,
  amounts: [], history: [], results: [], selected: null,
  hintLevel: 0, lastAction: null, effectVersion: 0,
};

export function currentPuzzle(game: GameState): Puzzle {
  return game.practice ? PRACTICE : game.deck[game.index];
}

export function gameReducer(game: GameState, event: GameEvent): GameState {
  if (event.type === 'start') {
    const deck = createDeck(event.seed, event.difficulty);
    return { ...initialGame, screen: 'playing', difficulty: event.difficulty, seed: event.seed, deck,
      amounts: emptyBottles(deck[0].capacities), effectVersion: game.effectVersion + 1 };
  }
  if (event.type === 'practice') {
    return { ...initialGame, screen: 'playing', practice: true,
      amounts: emptyBottles(PRACTICE.capacities), effectVersion: game.effectVersion + 1 };
  }
  if (event.type === 'home') return { ...initialGame, effectVersion: game.effectVersion + 1 };
  if (event.type === 'deliver') {
    if (game.screen !== 'ready') return game;
    if (game.practice) return { ...game, screen: 'practice-done', lastAction: 'deliver', effectVersion: game.effectVersion + 1 };
    const puzzle = currentPuzzle(game);
    const results = [...game.results, { puzzleId: puzzle.id, steps: game.history.length, minimumSteps: puzzle.minimumSteps }];
    if (game.index === game.deck.length - 1) return { ...game, screen: 'finished', results, lastAction: 'deliver', effectVersion: game.effectVersion + 1 };
    const index = game.index + 1;
    return { ...game, screen: 'playing', index, amounts: emptyBottles(game.deck[index].capacities), history: [], results,
      selected: null, hintLevel: 0, lastAction: 'deliver', effectVersion: game.effectVersion + 1 };
  }
  if (game.screen !== 'playing' && game.screen !== 'ready') return game;
  const puzzle = currentPuzzle(game);
  if (event.type === 'select') {
    if (game.screen !== 'playing' || (event.index !== null && (event.index < 0 || event.index >= puzzle.capacities.length))) return game;
    return { ...game, selected: event.index };
  }
  if (event.type === 'operate') {
    if (game.screen !== 'playing') return game;
    const amounts = applyAction(puzzle.capacities, game.amounts, event.action);
    if (!amounts) return game;
    return { ...game, screen: hasTarget(amounts, puzzle.target) ? 'ready' : 'playing', amounts,
      history: [...game.history, { before: game.amounts, action: event.action }], selected: null, hintLevel: 0,
      lastAction: event.action, effectVersion: game.effectVersion + 1 };
  }
  if (event.type === 'undo') {
    const move = game.history.at(-1);
    if (!move) return game;
    return { ...game, screen: 'playing', amounts: move.before, history: game.history.slice(0, -1), selected: null,
      hintLevel: 0, lastAction: null, effectVersion: game.effectVersion + 1 };
  }
  if (event.type === 'restart') return { ...game, screen: 'playing', amounts: emptyBottles(puzzle.capacities),
    history: [], selected: null, hintLevel: 0, lastAction: null, effectVersion: game.effectVersion + 1 };
  if (event.type === 'hint' && game.screen === 'playing') return { ...game, hintLevel: Math.min(2, game.hintLevel + 1) as 1 | 2 };
  return game;
}
