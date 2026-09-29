import { describe, expect, it } from 'vitest';
import { applyAction, emptyBottles, hasTarget, legalActions, shortestPathAudit, shortestSolution } from './rules';
import { createDeck, DIFFICULTY_SETTINGS, PUZZLES, verifyPuzzle } from './puzzles';

describe('量取規則與最短解', () => {
  it('補滿、倒空與互倒只接受會改變狀態的完整操作', () => {
    const capacities = [3, 5];
    expect(applyAction(capacities, [0, 0], { kind: 'fill', from: 1 })).toEqual([0, 5]);
    expect(applyAction(capacities, [0, 5], { kind: 'pour', from: 1, to: 0 })).toEqual([3, 2]);
    expect(applyAction(capacities, [3, 2], { kind: 'empty', from: 0 })).toEqual([0, 2]);
    expect(applyAction(capacities, [3, 2], { kind: 'fill', from: 0 })).toBeNull();
    expect(applyAction(capacities, [3, 2], { kind: 'empty', from: 1 })).toEqual([3, 0]);
    expect(applyAction(capacities, [0, 0], { kind: 'empty', from: 0 })).toBeNull();
    expect(applyAction(capacities, [0, 0], { kind: 'pour', from: 0, to: 1 })).toBeNull();
    expect(applyAction(capacities, [3, 2], { kind: 'pour', from: 0, to: 0 })).toBeNull();
    expect(legalActions(capacities, [0, 0])).toEqual([{ kind: 'fill', from: 0 }, { kind: 'fill', from: 1 }]);
  });

  it('候選題全數可解，最短步數與星級相符，代表解確實到達目標', () => {
    for (const puzzle of PUZZLES) {
      expect(verifyPuzzle(puzzle), puzzle.id).toBe(true);
      const path = shortestSolution(puzzle)!;
      let amounts = emptyBottles(puzzle.capacities);
      for (const action of path) amounts = applyAction(puzzle.capacities, amounts, action)!;
      expect(hasTarget(amounts, puzzle.target), puzzle.id).toBe(true);
    }
  });

  it('三瓶題的第三瓶不是裝飾，刪除任一瓶會失去原本的最短解', () => {
    for (const puzzle of PUZZLES.filter(puzzle => puzzle.capacities.length === 3)) {
      for (let omitted = 0; omitted < 3; omitted++) {
        const capacities = puzzle.capacities.filter((_, index) => index !== omitted);
        const shorterDeck = shortestSolution({ capacities, target: puzzle.target });
        expect(shorterDeck === null || shorterDeck.length > puzzle.minimumSteps, `${puzzle.id}: ${capacities}`).toBe(true);
      }
    }
  });

  it('檢視所有最短路線，不把第一條路線誤當唯一解', () => {
    for (const puzzle of PUZZLES) {
      const audit = shortestPathAudit(puzzle)!;
      expect(audit.steps).toBe(puzzle.minimumSteps);
      expect(audit.count).toBeGreaterThanOrEqual(audit.paths.length);
      if (puzzle.family === 'compare') expect(audit.count, puzzle.id).toBeGreaterThan(1);
      if (puzzle.family === 'relay') {
        const hasRelay = audit.paths.some(path => {
          const received = new Set<number>();
          for (const action of path) if (action.kind === 'pour') {
            if (received.has(action.from)) return true;
            received.add(action.to!);
          }
          return false;
        });
        expect(hasRelay, puzzle.id).toBe(true);
      }
    }
  });

  it('先選星級；五關同星級、維持原定步數範圍與瓶數安排，種子可重現', () => {
    for (const difficulty of [3, 4, 5] as const) {
      const variants = new Set<string>();
      for (const seed of [0, 1, 17, 123456789, 0xffffffff, ...Array.from({ length: 100 }, (_, index) => index * 991)]) {
        const deck = createDeck(seed, difficulty);
        const ids = deck.map(puzzle => puzzle.id);
        expect(createDeck(seed, difficulty).map(puzzle => puzzle.id)).toEqual(ids);
        expect(deck.map(puzzle => puzzle.difficulty)).toEqual(Array(5).fill(difficulty));
        expect(deck.map(puzzle => puzzle.stage)).toEqual([1, 2, 3, 4, 5]);
        expect(deck.map(puzzle => puzzle.capacities.length)).toEqual(DIFFICULTY_SETTINGS[difficulty].bottlesByStage);
        for (const puzzle of deck) {
          expect(puzzle.minimumSteps).toBeGreaterThanOrEqual(difficulty * 2 - 1);
          expect(puzzle.minimumSteps).toBeLessThanOrEqual(difficulty * 2);
        }
        expect(new Set(ids).size).toBe(5);
        expect(new Set(deck.map(puzzle => puzzle.family)).size).toBe(difficulty === 3 ? 2 : difficulty === 4 ? 4 : 5);
        expect(deck.map(puzzle => puzzle.capacities.length)).toEqual(difficulty === 3 ? [2, 2, 2, 2, 2] : difficulty === 4 ? [2, 2, 2, 3, 3] : [3, 3, 3, 3, 3]);
        variants.add(ids.join(','));
      }
      expect(variants.size).toBeGreaterThan(1);
    }
  });
});
