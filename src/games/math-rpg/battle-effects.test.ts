import { expect, test } from 'vitest';
import { attackPresentation } from './battle-effects';
import { BATTLE_RULES } from './battle-model';

test('低更新頻率也能直接顯示命中，不依賴先經過短暫觸發區間', () => {
  expect(attackPresentation(1000,false).impact).toBeGreaterThan(.35);
  expect(attackPresentation(600,false).flight).toBe(1);
  expect(attackPresentation(BATTLE_RULES.resolveMs,false).active).toBe(false);
});
test('減少動態保留相同靜態命中標記，結算完才清除', () => {
  expect(attackPresentation(0,true)).toEqual(attackPresentation(1000,true));
  expect(attackPresentation(1000,true).impact).toBeGreaterThan(0);
  expect(attackPresentation(1000,true).trail).toBe(0);
  expect(attackPresentation(BATTLE_RULES.resolveMs,true).active).toBe(false);
});
