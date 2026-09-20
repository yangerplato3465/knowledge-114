import { seededRandom } from './battle';
import type { Question } from './questions';

export const FACTOR_UNIT = '因數與倍數';
export const FACTOR_KINDS = ['factor', 'common-factor', 'gcd', 'multiple', 'common-multiple', 'lcm', 'divisibility'] as const;
export type FactorKind = typeof FACTOR_KINDS[number];
export interface FactorQuestion extends Question { kind: FactorKind; hint: string }
const NUMBERS = Array.from({ length: 100 }, (_, i) => i + 1);
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
const lcm = (a: number, b: number) => a / gcd(a, b) * b;
const COMPOSITES = NUMBERS.filter(n => n >= 12 && NUMBERS.some(d => d > 1 && d < n && n % d === 0));
const FACTOR_PAIRS: [number, number][] = [];
const MULTIPLE_PAIRS: [number, number][] = [];
for (let a = 2; a < 100; a++) for (let b = a + 1; b <= 100; b++) {
  if (a >= 12 && gcd(a, b) > 1 && b % a !== 0) FACTOR_PAIRS.push([a, b]);
  // 不出兩數皆在九九乘法範圍，亦避開直接倍數關係；答案仍不超過 100。
  if (b > 9 && b % a !== 0 && lcm(a, b) <= 100) MULTIPLE_PAIRS.push([a, b]);
}

/** 各題型輪流洗牌；一般題依題幹、快速判斷依題幹及選項避開最近 120 題。 */
export function createFactorDeck(seed: number) {
  const random = seededRandom(seed);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const pick = <T,>(values: readonly T[]) => values[int(0, values.length - 1)];
  const shuffle = <T,>(values: T[]) => {
    for (let i = values.length - 1; i > 0; i--) { const j = int(0, i); [values[i], values[j]] = [values[j], values[i]]; }
    return values;
  };
  function finish(kind: FactorKind, q: string, answer: number, wrong: number[], hint: string): FactorQuestion {
    const a = shuffle([answer, ...wrong.slice(0, 3)]).map(String);
    return { kind, q, a, correct: a.indexOf(String(answer)), hint };
  }
  function wrongOptions(valid: (n: number) => boolean, preferred: number[] = []) {
    return [...new Set([...shuffle(preferred), ...shuffle([...NUMBERS])])].filter(n => n >= 1 && n <= 100 && !valid(n)).slice(0, 3);
  }
  function generate(kind: FactorKind): FactorQuestion {
    if (kind === 'factor') {
      const n = pick(COMPOSITES), valid = (d: number) => n % d === 0;
      const answer = pick(NUMBERS.filter(d => d > 1 && d < n && valid(d)));
      return finish(kind, `下列哪個數是 ${n} 的因數？`, answer, wrongOptions(valid, [answer - 1, answer + 1, n + 1]),
        `${n} ÷ ${answer}＝${n / answer}，沒有餘數，所以 ${answer} 是 ${n} 的因數。`);
    }
    if (kind === 'common-factor' || kind === 'gcd') {
      const [a, b] = pick(FACTOR_PAIRS), greatest = gcd(a, b);
      const common = (n: number) => a % n === 0 && b % n === 0;
      const answer = kind === 'gcd' ? greatest : pick(NUMBERS.filter(n => n > 1 && common(n)));
      const valid = kind === 'gcd' ? (n: number) => n === answer : common;
      const wrong = wrongOptions(valid, NUMBERS.filter(n => (a % n === 0) !== (b % n === 0)));
      return finish(kind, `${kind === 'gcd' ? '' : '下列哪個數是 '}${a} 和 ${b} 的${kind === 'gcd' ? '最大公因數是多少' : '公因數'}？`, answer, wrong,
        kind === 'gcd' ? `能同時整除 ${a} 和 ${b} 的數中，最大的是 ${answer}。` : `${a} ÷ ${answer}＝${a / answer}，${b} ÷ ${answer}＝${b / answer}，兩者都沒有餘數。`);
    }
    if (kind === 'multiple') {
      const n = int(11, 49), valid = (v: number) => v % n === 0;
      const answer = pick(NUMBERS.filter(v => v > n && valid(v)));
      return finish(kind, `下列哪個數是 ${n} 的倍數？`, answer, wrongOptions(valid, [answer - 1, answer + 1, answer - 2, answer + 2]),
        `${n} × ${answer / n}＝${answer}，所以 ${answer} 是 ${n} 的倍數。`);
    }
    if (kind === 'common-multiple' || kind === 'lcm') {
      const [a, b] = pick(MULTIPLE_PAIRS), least = lcm(a, b);
      const common = (n: number) => n % a === 0 && n % b === 0;
      const answer = kind === 'lcm' ? least : pick(NUMBERS.filter(common));
      const valid = kind === 'lcm' ? (n: number) => n === answer : common;
      const wrong = wrongOptions(valid, NUMBERS.filter(n => (n % a === 0) !== (n % b === 0)));
      return finish(kind, `${kind === 'lcm' ? '' : '下列哪個數是 '}${a} 和 ${b} 的${kind === 'lcm' ? '最小公倍數是多少' : '公倍數'}？`, answer, wrong,
        kind === 'lcm' ? `依序列出 ${b} 的倍數，第一個也能被 ${a} 整除的是 ${answer}。` : `${answer} ÷ ${a}＝${answer / a}，${answer} ÷ ${b}＝${answer / b}，兩者都沒有餘數。`);
    }
    const divisor = pick([2, 5, 10]);
    const digits = int(3, 5), minPrefix = 10 ** (digits - 2), maxPrefix = 10 ** (digits - 1) - 1;
    const validDigits = Array.from({ length: 10 }, (_, i) => i).filter(n => n % divisor === 0);
    const invalidDigits = Array.from({ length: 10 }, (_, i) => i).filter(n => n % divisor !== 0);
    const answer = int(minPrefix, maxPrefix) * 10 + pick(validDigits);
    const wrong = new Set<number>();
    // 不重複的個位數讓選項一定互異；各選項整數位數相同。
    for (const digit of shuffle(invalidDigits).slice(0, 3)) wrong.add(int(minPrefix, maxPrefix) * 10 + digit);
    return finish(kind, `下列哪個數是 ${divisor} 的倍數？（看個位數判斷）`, answer, [...wrong],
      divisor === 2 ? '個位數是 0、2、4、6、8，就是 2 的倍數。' : divisor === 5 ? '個位數是 0 或 5，就是 5 的倍數。' : '個位數是 0，就是 10 的倍數。');
  }
  let bag: FactorKind[] = [];
  const recent: string[] = [];
  return (): FactorQuestion => {
    if (!bag.length) bag = shuffle([...FACTOR_KINDS]);
    const kind = bag.pop()!;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const question = generate(kind);
      const key = kind === 'divisibility' ? `${question.q}|${[...question.a].sort().join(',')}` : question.q;
      if (recent.includes(key)) continue;
      recent.push(key); if (recent.length > 120) recent.shift();
      return question;
    }
    throw new Error('無法產生未重複的因數與倍數題目');
  };
}
