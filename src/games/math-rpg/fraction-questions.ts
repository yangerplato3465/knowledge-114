import { seededRandom } from './battle';
import type { Question } from './questions';

export const FRACTION_UNIT = '擴分、約分與通分';
export const FRACTION_KINDS = ['division', 'mixed', 'compare', 'observe-unit', 'observe-gap', 'expand', 'reduce'] as const;
export type FractionKind = typeof FRACTION_KINDS[number];
export interface FractionQuestion extends Question { kind: FractionKind; hint: string }
type Fraction = { n: number; d: number };
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const valueKey = ({ n, d }: Fraction) => `${n / gcd(n, d)}/${d / gcd(n, d)}`;
const fraction = ({ n, d }: Fraction) => `${n}/${d}`;
function simplest(n: number, d: number, mixed = false) {
  const common = gcd(n, d); n /= common; d /= common;
  if (d === 1) return String(n);
  return mixed && n > d ? `${Math.floor(n / d)}又${n % d}/${d}` : `${n}/${d}`;
}

export function createFractionDeck(seed: number) {
  const random = seededRandom(seed);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const pick = <T,>(values: readonly T[]) => values[int(0, values.length - 1)];
  const shuffle = <T,>(values: T[]) => {
    for (let i = values.length - 1; i > 0; i--) { const j = int(0, i); [values[i], values[j]] = [values[j], values[i]]; }
    return values;
  };
  function finish(kind: FractionKind, q: string, answer: string, wrong: string[], hint: string): FractionQuestion {
    const a = shuffle([answer, ...wrong.slice(0, 3)]);
    return { kind, q, a, correct: a.indexOf(answer), hint };
  }
  function numberOptions(answer: number) {
    return shuffle([...new Set([answer - 1, answer + 1, answer - 2, answer + 2, answer + 3])].filter(n => n > 0 && n <= 100)).slice(0, 3).map(String);
  }
  function fractionOptions(n: number, d: number, mixed: boolean) {
    const correct = valueKey({ n, d }), values = new Map<string, Fraction>();
    for (const v of shuffle([{ n: d, d: n }, { n: n + d, d }, { n: Math.max(1, n - d), d },
      { n: n + 1, d }, { n: Math.max(1, n - 1), d }, { n: n + 2, d }, { n, d: d + 1 }])) {
      if (v.n % v.d === 0 || (mixed && v.n < v.d)) continue;
      const key = valueKey(v);
      if (key !== correct) values.set(key, v);
    }
    if (values.size < 3) {
      for (let delta = 3; values.size < 3; delta++) {
        const v = { n: n + delta, d };
        if (v.n % d !== 0 && (!mixed || v.n > d)) values.set(valueKey(v), v);
      }
    }
    return [...values.values()].slice(0, 3).map(v => simplest(v.n, v.d, mixed));
  }
  function generate(kind: FractionKind): FractionQuestion {
    if (kind === 'division' || kind === 'mixed') {
      const divisor = int(3, 12), whole = kind === 'mixed' ? int(1, 12) : int(0, 8);
      const remainder = int(1, divisor - 1), total = whole * divisor + remainder;
      const answer = simplest(total, divisor, kind === 'mixed');
      const food = pick(['雞蛋糕', '鳳梨酥', '餅乾']);
      const form = kind === 'mixed' ? '最簡帶分數' : whole > 0 ? '最簡假分數' : '最簡分數';
      const q = random() < .5 ? `${total} ÷ ${divisor}＝？（用${form}表示）`
        : `每 ${divisor} 個${food}算 1 盒，${total} 個${food}相當於幾盒？（用${form}表示）`;
      return finish(kind, q, answer, fractionOptions(total, divisor, kind === 'mixed'),
        `${total} ÷ ${divisor}＝${total}/${divisor}＝${answer}；${kind === 'mixed' ? '商是整數部分，餘數是分子，再約成最簡分數。' : '被除數作分子、除數作分母，再約成最簡分數。'}`);
    }
    if (kind === 'expand' || kind === 'reduce') {
      const d = int(3, 16), n = int(1, d - 1), factor = int(2, 6);
      const whole = random() < .5 ? int(1, 9) : 0, prefix = whole ? `${whole}又` : '';
      const numeratorBlank = random() < .5;
      const from = kind === 'expand' ? { n, d } : { n: n * factor, d: d * factor };
      const to = kind === 'expand' ? { n: n * factor, d: d * factor } : { n, d };
      const answer = numeratorBlank ? to.n : to.d;
      return finish(kind, `用${kind === 'expand' ? '擴分' : '約分'}填入空格：${prefix}${fraction(from)}＝${prefix}${numeratorBlank ? '□' : to.n}/${numeratorBlank ? to.d : '□'}，□ 是多少？`,
        String(answer), numberOptions(answer),
        `分子、分母同時${kind === 'expand' ? '乘以' : '除以'} ${factor}，分數大小不變${whole ? '，整數部分不變' : ''}。`);
    }
    return comparison(kind);
  }

  // 比大小依教師確認使用兩個分數與三個關係符號。
  function comparison(kind: 'compare' | 'observe-unit' | 'observe-gap'): FractionQuestion {
    let left: Fraction, right: Fraction;
    let hint: string;
    if (kind !== 'compare') {
      const [a, b] = shuffle(Array.from({ length: 32 }, (_, i) => i + 4));
      left = { n: kind === 'observe-unit' ? 1 : a - 1, d: a };
      right = { n: kind === 'observe-unit' ? 1 : b - 1, d: b };
      hint = kind === 'observe-unit' ? '分子都是 1，分母越大，分數越小。'
        : `${fraction(left)}＝1－1/${a}，${fraction(right)}＝1－1/${b}；減掉的分數越小，結果越大。`;
    } else {
      const d = int(3, 12), n = pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter(n => gcd(n, d) === 1));
      const multiplier = int(2, 4);
      left = { n: n * multiplier, d: d * multiplier };
      if (random() < .2) right = { n, d };
      else {
        const otherD = pick(Array.from({ length: 10 }, (_, i) => i + 3).filter(b => b !== d && b / gcd(b, d) * d <= 60));
        const otherN = pick(Array.from({ length: otherD - 1 }, (_, i) => i + 1).filter(a => gcd(a, otherD) === 1));
        right = { n: otherN, d: otherD };
      }
      const common = d / gcd(d, right.d) * right.d;
      hint = `先把 ${fraction(left)} 約成 ${n}/${d}；通分後比較 ${n * (common / d)}/${common} 和 ${right.n * (common / right.d)}/${common} 的分子。`;
    }
    const difference = left.n * right.d - right.n * left.d;
    const answer = difference > 0 ? '＞' : difference < 0 ? '＜' : '＝';
    const a = ['＞', '＜', '＝'];
    return { kind, q: `${kind === 'compare' ? '先約分、通分比較' : '用觀察的方法比較'}：${fraction(left)} □ ${fraction(right)}，□ 應填入哪個符號？`, a, correct: a.indexOf(answer), hint };
  }
  let bag: FractionKind[] = [];
  const recent: string[] = [];
  return (): FractionQuestion => {
    if (!bag.length) bag = shuffle([...FRACTION_KINDS]);
    const kind = bag.pop()!;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const question = generate(kind);
      const key = question.q;
      if (recent.includes(key)) continue;
      recent.push(key); if (recent.length > 120) recent.shift();
      return question;
    }
    throw new Error('無法產生未重複的分數題目');
  };
}
