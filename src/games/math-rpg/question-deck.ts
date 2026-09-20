import { createDecimalDeck, DECIMAL_UNIT } from './decimal-questions';
import { createFactorDeck, FACTOR_UNIT } from './factor-questions';
import { createFractionDeck, FRACTION_UNIT } from './fraction-questions';
import type { BattlePace } from './battle';

export interface Unit { number: number; endNumber?: number; name: string }
export const CURRICULUM: Record<string, Unit[]> = {
  五上: [
    { number: 1, name: DECIMAL_UNIT },
    { number: 2, endNumber: 3, name: FACTOR_UNIT },
    ...[FRACTION_UNIT, '多邊形與扇形', '異分母分數的加減', '線對稱圖形',
      '整數四則運算', '面積', '柱體、錐體和球'].map((name, index) => ({ number: index + 4, name })),
  ],
  六上: [
    '最大公因數與最小公倍數', '分數除法', '數量關係', '小數除法', '比與比值',
    '圓周長與扇形周長', '圓面積與扇形面積', '認識速率', '放大圖、縮圖與比例尺',
  ].map((name, index) => ({ number: index + 1, name })),
};

export function isUnitReady(grade: string, unit: string) {
  return grade === '五上' && (unit === DECIMAL_UNIT || unit === FACTOR_UNIT || unit === FRACTION_UNIT);
}

export function battlePaceFor(grade: string, unit: string): BattlePace {
  if (grade === '五上' && unit === FACTOR_UNIT) return 'quick';
  if (grade === '五上' && unit === FRACTION_UNIT) return 'moderate';
  return 'standard';
}

/** 未製作的單元禁止開局，不以其他單元題目代替。 */
export function createQuestionDeck(grade: string, unit: string, seed: number) {
  if (!isUnitReady(grade, unit)) throw new Error('此單元題庫尚未開放');
  return unit === FACTOR_UNIT ? createFactorDeck(seed) : unit === FRACTION_UNIT ? createFractionDeck(seed) : createDecimalDeck(seed);
}
