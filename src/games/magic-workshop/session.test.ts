import { describe, expect, it } from 'vitest';
import { currentPuzzle, gameReducer, initialGame, performanceStars } from './session';
import { shortestSolution } from './rules';

describe('工坊一局流程', () => {
  it.each([5, 6, 7, 8, 9, 10])('最短 %i 步：最短解三星、多一或兩步兩星、再多也有完成一星', minimum => {
    expect(performanceStars(minimum, minimum)).toBe(3);
    expect(performanceStars(minimum + 1, minimum)).toBe(2);
    expect(performanceStars(minimum + 2, minimum)).toBe(2);
    expect(performanceStars(minimum + 3, minimum)).toBe(1);
    expect(performanceStars(minimum + 100, minimum)).toBe(1);
  });
  it.each([3, 4, 5] as const)('%i 星完整交付五關，保留所選難度與實際步數', difficulty => {
    let game = gameReducer(initialGame, { type: 'start', seed: 27, difficulty });
    for (let stage = 0; stage < 5; stage++) {
      const puzzle = currentPuzzle(game);
      expect(puzzle.difficulty).toBe(difficulty);
      for (const action of shortestSolution(puzzle)!) game = gameReducer(game, { type: 'operate', action });
      expect(game.screen).toBe('ready');
      expect(game.history.length).toBe(puzzle.minimumSteps);
      const unchanged = gameReducer(game, { type: 'operate', action: { kind: 'empty', from: 0 } });
      expect(unchanged).toBe(game);
      game = gameReducer(game, { type: 'deliver' });
      expect(game.results.at(-1)).toEqual({ puzzleId: puzzle.id, steps: puzzle.minimumSteps, minimumSteps: puzzle.minimumSteps });
    }
    expect(game.screen).toBe('finished');
    expect(game.results).toHaveLength(5);
  });

  it('成功後仍可復原；重試清掉本關步數但保留已交付關卡', () => {
    let game = gameReducer(initialGame, { type: 'practice' });
    game = gameReducer(game, { type: 'operate', action: { kind: 'fill', from: 0 } });
    expect(game.screen).toBe('ready');
    game = gameReducer(game, { type: 'undo' });
    expect(game.screen).toBe('playing');
    expect(game.amounts).toEqual([0, 0]);
    expect(game.history).toHaveLength(0);
    game = gameReducer(game, { type: 'operate', action: { kind: 'fill', from: 0 } });
    game = gameReducer(game, { type: 'deliver' });
    expect(game.screen).toBe('practice-done');
    expect(game.results).toHaveLength(0);
    game = gameReducer(game, { type: 'start', seed: 9, difficulty: 3 });
    game = gameReducer(game, { type: 'operate', action: { kind: 'fill', from: 0 } });
    game = gameReducer(game, { type: 'restart' });
    expect(game.amounts).toEqual(currentPuzzle(game).capacities.map(() => 0));
    expect(game.history).toHaveLength(0);
  });
});
