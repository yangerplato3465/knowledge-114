import { seededRandom } from './battle';
import type { Question } from './questions';

export const DECIMAL_UNIT = '多位小數與加減';
export const DECIMAL_KINDS = ['add', 'subtract', 'round', 'round-source', 'order', 'place-order'] as const;
export type DecimalKind = typeof DECIMAL_KINDS[number];
export interface DecimalQuestion extends Question { hint: string; kind: DecimalKind }
// 全部數值以十萬分之一為單位；比較、加減與四捨五入均使用整數。
const SCALE = 100_000;
const MAX = 100 * SCALE;
const PLACES = ['個位', '十分位', '百分位', '千分位'];
function format(value: number, places?: number): string {
  const integer = Math.floor(value / SCALE);
  const fraction = String(value % SCALE).padStart(5, '0');
  if (places !== undefined) return places ? `${integer}.${fraction.slice(0, places)}` : String(integer);
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed ? `${integer}.${trimmed}` : String(integer);
}
function rounded(value: number, step: number) { return Math.floor((value + step / 2) / step) * step; }

/** 一局一個實例；每六題涵蓋六種題型，最近 120 題不重複題幹。 */
export function createDecimalDeck(seed: number) {
  const random = seededRandom(seed);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const shuffle = <T,>(values: T[]) => {
    for (let i = values.length - 1; i > 0; i--) { const j = int(0, i); [values[i], values[j]] = [values[j], values[i]]; }
    return values;
  };
  function finish(kind: DecimalKind, q: string, answer: string, other: string[], hint: string): DecimalQuestion {
    const a = shuffle([answer, ...other]);
    return { kind, q, a, correct: a.indexOf(answer), hint };
  }
  function alternatives(value: number, step: number, valid = (_candidate: number) => true) {
    const values: number[] = [];
    // 鄰近位值的差異對應漏進／借位、捨去與多進一位等錯法。
    for (const delta of shuffle([step, -step, step * 10, -step * 10, step * 2, -step * 2, step * 3, -step * 3])) {
      const candidate = value + delta;
      if (candidate >= 0 && candidate <= MAX && valid(candidate) && !values.includes(candidate)) values.push(candidate);
      if (values.length === 3) return values;
    }
    throw new Error('無法建立互異的誘答選項');
  }
  function generate(kind: DecimalKind): DecimalQuestion {
    if (kind === 'add' || kind === 'subtract') {
      const stepA = 10 ** (5 - int(1, 5)), stepB = 10 ** (5 - int(1, 5));
      let left = int(1, (MAX - stepA) / stepA) * stepA;
      if (kind === 'add' && MAX - left < stepB) left = stepA;
      let right = int(1, kind === 'add' ? Math.floor((MAX - left) / stepB) : (MAX - stepB) / stepB) * stepB;
      if (kind === 'subtract' && left < right) [left, right] = [right, left];
      const answer = kind === 'add' ? left + right : left - right;
      return finish(kind, `${format(left)} ${kind === 'add' ? '＋' : '－'} ${format(right)}＝？`, format(answer),
        alternatives(answer, Math.min(stepA, stepB)).map(v => format(v)),
        kind === 'add' ? '小數點對齊，空位補零；滿十要向左進一。' : '小數點對齊，空位補零；不夠減時向左借一。');
    }
    if (kind === 'round' || kind === 'round-source') {
      const places = int(0, 3), step = 10 ** (5 - places);
      const sourceStep = 10 ** (5 - int(places + 1, 5));
      const source = int(1, (MAX - sourceStep) / sourceStep) * sourceStep;
      const target = rounded(source, step);
      const hint = `取到${PLACES[places]}，看右邊一位；小於 5 捨去，滿 5 進一。`;
      if (kind === 'round') return finish(kind, `將 ${format(source)} 用四捨五入法取概數到${PLACES[places]}，結果是多少？`,
        format(target, places), alternatives(target, step).map(v => format(v, places)), hint);
      return finish(kind, `哪個數用四捨五入法取概數到${PLACES[places]}會得到 ${format(target, places)}？`, format(source),
        alternatives(source, step, v => v < MAX && rounded(v, step) !== target).map(v => format(v)), hint);
    }
    const ascending = random() < 0.5;
    let values: number[], descriptions: string[];
    if (kind === 'order') {
      const step = 10 ** int(0, 3), base = int(0, 98) * SCALE + int(0, 8) * 10_000;
      values = shuffle([base + step, base + int(2, 4) * step, base + int(5, 9) * step]);
      descriptions = values.map(v => format(v));
    } else {
      // 相似個數配上不同小數單位；所有換算結果互異且小於 100。
      const count = int(11, 99), places = int(3, 5);
      const pairs = shuffle([{ count, places }, { count: count * 10, places }, { count: count * 100, places: places - 1 }]);
      values = pairs.map(p => p.count * 10 ** (5 - p.places));
      descriptions = pairs.map(p => `${p.count} 個 ${format(10 ** (5 - p.places))} 合起來`);
    }
    const labels = ['甲', '乙', '丙'];
    const order = [0, 1, 2].sort((a, b) => ascending ? values[a] - values[b] : values[b] - values[a]);
    const symbol = ascending ? '＜' : '＞';
    const answer = order.map(i => labels[i]).join(symbol);
    const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const other = shuffle(permutations.map(p => p.map(i => labels[i]).join(symbol)).filter(v => v !== answer)).slice(0, 3);
    return finish(kind, `${descriptions.map((v, i) => `${labels[i]}：${v}`).join('；')}。由${ascending ? '小到大' : '大到小'}排列，哪個正確？`, answer, other,
      kind === 'order' ? '小數末尾可補零；從整數部分開始，逐位比較。' : `先換算：${values.map((v, i) => `${labels[i]}＝${format(v)}`).join('、')}，再逐位比較。`);
  }
  let bag: DecimalKind[] = [];
  const recent: string[] = [];
  return (): DecimalQuestion => {
    if (!bag.length) bag = shuffle([...DECIMAL_KINDS]);
    const kind = bag.pop()!;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const question = generate(kind);
      if (recent.includes(question.q)) continue;
      recent.push(question.q);
      if (recent.length > 120) recent.shift();
      return question;
    }
    throw new Error('題目產生器無法取得未重複題目');
  };
}
