import { seededRandom } from './battle';
import type { Question } from './questions';

export const GEOMETRY_UNIT = '多邊形與扇形';
export const GEOMETRY_KINDS = ['side', 'triangle', 'quadrilateral', 'parallelogram', 'straight', 'split', 'fraction-angle', 'angle-fraction', 'sector'] as const;
export type GeometryKind = typeof GEOMETRY_KINDS[number];
export interface GeometryDiagramData { type: 'triangle' | 'quadrilateral' | 'parallelogram' | 'straight' | 'split' | 'sector'; labels: string[]; angles: number[] }
export interface GeometryQuestion extends Question { kind: GeometryKind; hint: string; diagram?: GeometryDiagramData; difficulty: 'basic' | 'challenge' }
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
export const circleFraction = (angle: number) => `${angle / gcd(angle, 360)}/${360 / gcd(angle, 360)}`;

export function createGeometryDeck(seed: number) {
  const random = seededRandom(seed);
  const int = (a: number, b: number) => a + Math.floor(random() * (b - a + 1));
  const shuffle = <T,>(items: T[]) => { for (let i = items.length - 1; i > 0; i--) { const j = int(0, i); [items[i], items[j]] = [items[j], items[i]]; } return items; };
  function generate(kind: GeometryKind): GeometryQuestion {
    let q = '', hint = '', answer = 0, diagram: GeometryDiagramData | undefined;
    const difficulty = ['straight', 'split', 'sector'].includes(kind) ? 'challenge' : 'basic';
    let wrong: number[] = [], fraction = false, unit = '°';
    if (kind === 'side') {
      const a = int(12, 44), b = int(5, a - 2), low = a - b, high = a + b;
      answer = int(low + 1, high - 1); wrong = [low, high, high + int(1, 9)]; unit = ' 公分';
      q = `三角形的兩邊是 ${a} 公分與 ${b} 公分，第三邊可能是多少公分？`;
      hint = `第三邊要大於 ${a}－${b}＝${low}，且小於 ${a}＋${b}＝${high}；等於也不能圍成三角形。`;
    } else if (kind === 'triangle' || kind === 'straight' || kind === 'split') {
      const a = int(6, 15) * 5, b = int(6, 14) * 5; answer = 180 - a - b;
      const first = int(2, a / 5 - 2) * 5, second = a - first;
      q = kind === 'triangle' ? `三角形兩個內角為 ${a}°、${b}°，∠A 是多少度？`
        : kind === 'straight' ? `三角形一個頂點的外角為 ${180 - a}°（與內角合成平角），另一內角為 ${b}°，∠A 是多少度？`
          : `三角形頂角分成 ${first}° 與 ${second}°，另一內角為 ${b}°，∠A 是多少度？`;
      hint = kind === 'straight' ? `先求內角：180°－${180 - a}°＝${a}°；再算 180°－${a}°－${b}°＝${answer}°。`
        : `${kind === 'split' ? `先合併頂角：${first}°＋${second}°＝${a}°；` : ''}三角形內角和為 180°，180°－${a}°－${b}°＝${answer}°。`;
      diagram = { type: kind, angles: [answer, b, a], labels: kind === 'split' ? ['A', `${b}°`, `${first}°＋${second}°`] : ['A', `${b}°`, kind === 'straight' ? `外角 ${180 - a}°` : `${a}°`] };
    } else if (kind === 'quadrilateral' || kind === 'parallelogram') {
      const a = int(10, 16) * 5, b = kind === 'parallelogram' ? 180 - a : int(10, 18) * 5;
      const c = kind === 'parallelogram' ? a : int(18, 25) * 5; answer = 360 - a - b - c;
      q = kind === 'parallelogram' ? `平行四邊形 ABCD 中，∠A＝${a}°，相鄰的 ∠D 是多少度？` : `四邊形三個內角為 ${a}°、${b}°、${c}°，剩下的 ∠D 是多少度？`;
      hint = kind === 'parallelogram' ? `平行四邊形相鄰內角和為 180°，180°－${a}°＝${answer}°。` : `四邊形內角和為 360°，360°－${a}°－${b}°－${c}°＝${answer}°。`;
      diagram = { type: kind, angles: [a, b, c, answer], labels: kind === 'parallelogram' ? [`A ${a}°`, 'B', 'C', 'D ?'] : [`${a}°`, `${b}°`, `${c}°`, 'D ?'] };
    } else {
      const a = int(1, 10) * 15, b = int(1, 8) * 15;
      fraction = kind === 'angle-fraction' || (kind === 'sector' && random() < .5);
      answer = kind === 'sector' ? 360 - a - b : a;
      const label = random() < .5 ? `${b}°` : `${circleFraction(b)} 圓`;
      q = kind === 'sector' ? `圓被分成三個扇形，兩部分分別為 ${a}°、${label}。陰影部分是${fraction ? '幾分之幾圓（用最簡分數）' : '多少度'}？`
        : kind === 'fraction-angle' ? `陰影扇形是 ${circleFraction(a)} 圓，圓心角是多少度？` : `陰影扇形的圓心角為 ${a}°，是幾分之幾圓？（用最簡分數）`;
      hint = kind === 'sector' ? `一周為 360°；${label}＝${b}°，剩下 360°－${a}°－${b}°＝${answer}°。${fraction ? `占全圓 ${circleFraction(answer)}。` : ''}`
        : kind === 'fraction-angle' ? `全圓 360°，360° × ${circleFraction(a)}＝${a}°。` : `${a}° ÷ 360°＝${circleFraction(a)}，約成最簡分數。`;
      diagram = { type: 'sector', angles: kind === 'sector' ? [a, b, answer] : [360 - a, a], labels: kind === 'sector' ? [`${a}°`, label, '?'] : ['', kind === 'fraction-angle' ? `${circleFraction(a)} 圓` : `${a}°`] };
    }
    if (!wrong.length) wrong = shuffle([...new Set([answer - 15, answer + 15, answer - 30, answer + 30, 180 - answer, 360 - answer])].filter(v => v > 0 && v < 360 && v !== answer)).slice(0, 3);
    const format = (n: number) => fraction ? `${circleFraction(n)} 圓` : `${n}${unit}`;
    const options = shuffle([answer, ...wrong]);
    return { kind, q, a: options.map(format), correct: options.indexOf(answer), hint, difficulty, diagram };
  }
  let bag: GeometryKind[] = []; const recent: string[] = [];
  return () => {
    if (!bag.length) bag = shuffle([...GEOMETRY_KINDS]);
    const kind = bag.pop()!; let question = generate(kind);
    for (let i = 0; i < 100 && recent.includes(question.q); i++) question = generate(kind);
    recent.push(question.q); if (recent.length > 80) recent.shift(); return question;
  };
}
