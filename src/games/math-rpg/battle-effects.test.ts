import { expect, test } from 'vitest';
import { attackPresentation } from './battle-effects';
import { BATTLE_RULES } from './battle-model';
import { animationFrameAt } from './battle-art';

test('低更新頻率也能直接顯示命中，不依賴先經過短暫觸發區間', () => {
  expect(attackPresentation('correct',1000,false).impactElapsed).toBe(380);
  expect(attackPresentation('correct',620,false).flight).toBe(1);
  expect(attackPresentation('wrong',699,false).impactElapsed).toBe(-1);
  expect(attackPresentation('timeout',700,false).impactElapsed).toBe(0);
  expect(attackPresentation('correct',BATTLE_RULES.resolveMs,false).active).toBe(false);
});
test('減少動態保留相同靜態命中標記，結算完才清除', () => {
  expect(attackPresentation('wrong',0,true).impactElapsed).toBe(attackPresentation('wrong',1000,true).impactElapsed);
  expect(attackPresentation('wrong',1000,true).impactElapsed).toBeGreaterThan(0);
  expect(attackPresentation('wrong',1000,true).projectileElapsed).toBe(-1);
  expect(attackPresentation('wrong',BATTLE_RULES.resolveMs,true).active).toBe(false);
});
test('依個別幀時間直接尋址，負時間及結尾不播放，跳幀不重啟受擊',()=>{
  const frames=[80,140,160,140].map(time=>({time}));
  expect(animationFrameAt(frames,-1)).toBeNull();
  expect(animationFrameAt(frames,79)).toBe(0);
  expect(animationFrameAt(frames,80)).toBe(1);
  expect(animationFrameAt(frames,380)).toBe(3);
  expect(animationFrameAt(frames,520)).toBeNull();
});
