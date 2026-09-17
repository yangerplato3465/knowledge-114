export type Suffix = 'ful' | 'less';
export interface WordItem {
  stem: string;
  stemZh: string;
  suffix: Suffix;
  def: string;
  note?: string;
}
export const ROUND_SIZE = 12;
export const timing = { merge: 280, correct: 900, wrong: 2100, note: 1500, leave: 260, shift: 420, courier: 1250 } as const;
export const wordOf = (item: WordItem) => item.stem + item.suffix;
export const answerDelay = (item: WordItem, chosen: Suffix) =>
  (chosen === item.suffix ? timing.correct : timing.wrong) + (item.note ? timing.note : 0);

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 保留舊版補足及相鄰字根交換順序，避免搬遷時改變抽題。 */
export function drawQueue(pool: readonly WordItem[], random = Math.random): WordItem[] {
  const half = Math.floor(ROUND_SIZE / 2);
  const ful = shuffle(pool.filter(item => item.suffix === 'ful'), random);
  const less = shuffle(pool.filter(item => item.suffix === 'less'), random);
  let picked = ful.slice(0, half).concat(less.slice(0, ROUND_SIZE - half));
  if (picked.length < ROUND_SIZE) {
    const rest = ful.slice(half).concat(less.slice(ROUND_SIZE - half));
    picked = picked.concat(shuffle(rest, random).slice(0, ROUND_SIZE - picked.length));
  }
  picked = shuffle(picked, random);
  for (let i = 1; i < picked.length; i++) {
    if (picked[i].stem !== picked[i - 1].stem) continue;
    for (let j = i + 1; j < picked.length; j++) {
      if (picked[j].stem !== picked[i].stem) {
        [picked[i], picked[j]] = [picked[j], picked[i]];
        break;
      }
    }
  }
  return picked;
}

export function makeChallengeTasks(learned: readonly WordItem[], random = Math.random) {
  const unique: WordItem[] = [];
  shuffle(learned, random).forEach(item => {
    if (!unique.some(seen => seen.stem === item.stem)) unique.push(item);
  });
  const targets: WordItem[] = [];
  (['ful', 'less'] as const).forEach(suffix => {
    const found = unique.find(item => item.suffix === suffix && !targets.some(picked => picked.stem === item.stem));
    if (found) targets.push(found);
  });
  unique.forEach(item => {
    if (targets.length < 3 && !targets.some(picked => picked.stem === item.stem)) targets.push(item);
  });
  return shuffle(targets, random).map(target => {
    const distractors = unique.filter(item => item.stem !== target.stem);
    const options = shuffle([target].concat(shuffle(distractors, random).slice(0, 5)), random);
    return { target, options, targetIndex: options.indexOf(target) };
  });
}
