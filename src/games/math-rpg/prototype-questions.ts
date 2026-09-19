import { questionPools, type Question } from './questions';
import { seededRandom } from './battle';
export const PROTOTYPE_UNITS: Record<string, Record<string, string>> = {
  五年級: {
    比率與百分率: '百分率是以 100 為基準；小數乘以 100 後加上 %。',
    生活中的大單位: '公里、公噸、公升換成對應小單位，都乘以 1000。',
  },
  六年級: { 數量關係: '先找每一份的量與份數，再判斷用乘法或除法。' },
};
/** 僅使用已存在的簡單示範題；每輪洗牌，跨輪不連續出相同題，選項也洗牌。 */
export function createPrototypeDeck(grade: string, unit: string, seed: number) {
  if (!PROTOTYPE_UNITS[grade]?.[unit]) throw new Error('尚未開放的原型單元');
  const pool = questionPools[grade][unit] as Question[];
  const random = seededRandom(seed);
  let bag: Question[] = [], previous = '';
  const shuffle = <T,>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return items;
  };
  return () => {
    if (!bag.length) {
      bag = shuffle([...pool]);
      if (bag[bag.length - 1].q === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const question = bag.pop()!; previous = question.q;
    const options = shuffle(question.a.map((text, index) => ({ text, index })));
    return { q: question.q, a: options.map(o => o.text), correct: options.findIndex(o => o.index === question.correct), hint: PROTOTYPE_UNITS[grade][unit] };
  };
}
