import { expect, it } from 'vitest';
import { GUESTS } from './art';
import { currentPuzzle, gameReducer, initialGame } from './session';
import { createDeck } from './puzzles';
import { shortestSolution } from './rules';
import { sceneAnnouncement, sceneDialogue } from './scene-model';
import { GUEST_SECRETS, OPERATION_NOTES, STORIES, storyFor, visitFor } from './story';

it('故事與彩蛋維持現有兩行泡泡，每行最多十字，不擴張版面', () => {
  const beats: string[] = STORIES.flatMap(story => [story.ending, ...story.visits.flatMap(visit => Object.values(visit))]);
  beats.push(...GUEST_SECRETS.flat(), ...Object.values(OPERATION_NOTES).flat());
  for (const beat of beats) {
    const lines = beat.split('\n');
    expect(lines, beat).toHaveLength(2);
    for (const line of lines) expect([...line].length, line).toBeLessThanOrEqual(10);
  }
  for (const story of STORIES) {
    expect([...story.title].length).toBeLessThanOrEqual(10);
    story.visits.forEach((visit, index) => expect(visit.request).toContain(GUESTS[index].name));
  }
});

it('四條故事可重現，涵蓋代碼上下界且不改變題組', () => {
  expect(new Set([0, 1, 2, 3].map(seed => storyFor(seed))).size).toBe(STORIES.length);
  for (const seed of [0, 1, 2, 3, 2147483648, 4294967295]) {
    const deck = createDeck(seed, 2);
    expect(storyFor(seed)).toBe(storyFor(seed));
    expect(storyFor(seed)).toBeDefined();
    expect(createDeck(seed, 2)).toEqual(deck);
  }
});

it.each([0, 1, 2, 3])('代碼 %i 的五關串接委託、操作、完成與故事結局', seed => {
  let game = gameReducer(initialGame, { type: 'start', seed, difficulty: 2 });
  for (let index = 0; index < 5; index++) {
    const visit = storyFor(seed).visits[index];
    expect(sceneDialogue(game)).toBe(visit.request);
    const path = shortestSolution(currentPuzzle(game))!;
    for (const [step, action] of path.entries()) {
      game = gameReducer(game, { type: 'operate', action });
      const dialogue = sceneDialogue(game);
      expect(sceneAnnouncement(game)).toContain(dialogue.replaceAll('\n', ''));
      if (step === 0) {
        expect(OPERATION_NOTES[action.kind]).toContain(dialogue);
        const selected = gameReducer(game, { type: 'select', index: 0 });
        expect(sceneDialogue(selected)).toBe(dialogue);
      }
      if (step === 1) expect(GUEST_SECRETS[index]).toContain(dialogue);
    }
    expect(game.screen).toBe('ready');
    expect(sceneDialogue(game)).toBe(visit.ready);
    expect(visitFor(game).thanks).toBe(visit.thanks);
    game = gameReducer(game, { type: 'deliver' });
  }
  expect(game.screen).toBe('finished');
  expect(sceneDialogue(game)).toBe(storyFor(seed).ending);
  expect(game.results).toHaveLength(5);
});

it('提示優先於彩蛋；復原、重試、練習與回首頁不殘留故事狀態', () => {
  let game = gameReducer(initialGame, { type: 'start', seed: 1, difficulty: 3 });
  const opening = sceneDialogue(game);
  const action = shortestSolution(currentPuzzle(game))![0];
  game = gameReducer(game, { type: 'operate', action });
  const afterMove = sceneDialogue(game);
  game = gameReducer(game, { type: 'hint' });
  expect(sceneDialogue(game)).not.toBe(afterMove);
  game = gameReducer(game, { type: 'hint' });
  expect(sceneDialogue(game)).toMatch(/第 \d 瓶/);
  game = gameReducer(game, { type: 'undo' });
  expect(sceneDialogue(game)).toBe(opening);
  game = gameReducer(game, { type: 'operate', action });
  expect(sceneDialogue(game)).toBe(afterMove);
  expect(sceneDialogue(gameReducer(game, { type: 'restart' }))).toBe(opening);
  expect(sceneDialogue(gameReducer(game, { type: 'home' }))).toContain('我是米洛');
  game = gameReducer(game, { type: 'practice' });
  expect(sceneDialogue(game)).toContain('一起試試');
  game = gameReducer(game, { type: 'operate', action: { kind: 'fill', from: 0 } });
  expect(sceneDialogue(game)).toContain('可以出發');
  expect(sceneDialogue(gameReducer(game, { type: 'deliver' }))).toContain('第一位客人');
});
