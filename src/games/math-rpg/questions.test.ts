import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { createQuestionPools, type Question, type QuestionPools } from './questions';

function random(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

it('九組固定題庫內容與答案逐題等價', () => {
  const original = JSON.parse(runInNewContext(`${readFileSync('tests/fixtures/math-rpg-pools.reference.txt', 'utf8')}; JSON.stringify(QUESTION_POOLS)`));
  const actual = JSON.parse(JSON.stringify(createQuestionPools()));
  expect(actual).toEqual(original);
  expect(Object.values(actual as QuestionPools).flatMap(grade => Object.values(grade)).flat()).toHaveLength(36);
});

it('動態除法題連續 1000 題的新舊亂數序列、選項與正解相同', () => {
  const seed = 12345;
  const original = runInNewContext(`${readFileSync('tests/fixtures/math-rpg-pools.reference.txt', 'utf8')}; generateDivideQuestion`, { Math: Object.assign(Object.create(Math), { random: random(seed) }) }) as () => Question;
  const generate = createQuestionPools(random(seed))['五年級']['整數、小數除以整數'] as () => Question;
  for (let i = 0; i < 1000; i++) {
    const question = generate();
    expect(question).toEqual(JSON.parse(JSON.stringify(original())));
    expect(new Set(question.a).size).toBe(4);
    const [a, b] = question.q.match(/\d+/g)!.map(Number);
    expect(Number(question.a[question.correct])).toBeCloseTo(a / b, 3);
  }
});
