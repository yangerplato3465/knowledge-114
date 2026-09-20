import { expect, test } from 'vitest';
import { CURRICULUM, createQuestionDeck, isUnitReady, battlePaceFor } from './question-deck';

test('戰鬥節奏依單元切換，不影響小數或六上單元', () => {
  expect(battlePaceFor('五上', '因數與倍數')).toBe('quick');
  expect(battlePaceFor('五上', '多位小數與加減')).toBe('standard');
  expect(battlePaceFor('六上', '最大公因數與最小公倍數')).toBe('standard');
});

test('五上合併第 2–3 單元並保留課本編號，六上九單元不變；僅新題庫可開局', () => {
  expect(Object.keys(CURRICULUM)).toEqual(['五上', '六上']);
  expect(CURRICULUM.五上).toHaveLength(9);
  expect(CURRICULUM.五上[1]).toEqual({ number: 2, endNumber: 3, name: '因數與倍數' });
  expect(CURRICULUM.六上).toHaveLength(9);
  for (const [grade, units] of Object.entries(CURRICULUM)) {
    expect(units.map(u => u.number)).toEqual(grade === '五上' ? [1, 2, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const unit of units) {
      if (grade === '五上' && [1, 2, 4].includes(unit.number)) expect(createQuestionDeck(grade, unit.name, 1)().a.length).toBeGreaterThanOrEqual(3);
      else {
        expect(isUnitReady(grade, unit.name)).toBe(false);
        expect(() => createQuestionDeck(grade, unit.name, 1)).toThrow('尚未開放');
      }
    }
  }
  for (const [grade, unit] of [['五年級', '比率與百分率'], ['六年級', '數量關係'], ['五上', '生活中的大單位']]) {
    expect(() => createQuestionDeck(grade, unit, 1)).toThrow('尚未開放');
  }
});
