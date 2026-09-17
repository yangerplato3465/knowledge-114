import type { Question } from './questions';

export function normalizeSetting(value: string, max: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 1 : Math.min(max, Math.max(1, parsed));
}

export function drawQuestions(pool: readonly Question[], count: number, random = Math.random) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
