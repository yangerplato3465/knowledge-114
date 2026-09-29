import { createDeck, type Difficulty } from './puzzles';

const KEY = 'magic-workshop-recent-v1';
export const RECENT_LIMIT = 6;
type Recent = string[][];

export function chooseFreshSeed(difficulty: Difficulty, recent: Recent, random: () => number): number {
  let best = 0;
  let lowest = Infinity;
  for (let attempt = 0; attempt < 256; attempt++) {
    const seed = random() >>> 0;
    const deck = createDeck(seed, difficulty);
    const repeats = deck.reduce((sum, puzzle, index) => sum + Number(recent[index]?.includes(puzzle.id)), 0);
    if (repeats < lowest) { best = seed; lowest = repeats; }
    if (repeats === 0) return seed;
  }
  return best;
}

// History only chooses a new seed. Explicit replay codes remain independent of storage.
export function freshSeed(difficulty: Difficulty): number {
  const key = `${KEY}-${difficulty}`;
  let recent: Recent = Array.from({ length: 5 }, () => []);
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(saved) && saved.length === 5) recent = saved.map(row =>
      Array.isArray(row) ? row.filter((id): id is string => typeof id === 'string' && id.length < 80).slice(-RECENT_LIMIT) : []);
  } catch { /* Private mode or corrupted history must not prevent starting a game. */ }
  const seed = chooseFreshSeed(difficulty, recent, () => crypto.getRandomValues(new Uint32Array(1))[0]);
  const next = createDeck(seed, difficulty).map((puzzle, index) => [...recent[index], puzzle.id].slice(-RECENT_LIMIT));
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  return seed;
}
