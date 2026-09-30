import { expect, it } from 'vitest';
import { OrderEntrance } from './order-entrance';

it('每關先停留展示放大目標，之後平滑縮回訂單',()=>{
  const intro=new OrderEntrance();intro.begin();
  expect(intro.pose()).toEqual({dock:0,scale:1.55});
  intro.advance(1100);expect(intro.pose().dock).toBe(0);
  intro.advance(400);expect(intro.pose().dock).toBeGreaterThan(0);expect(intro.pose().scale).toBeGreaterThan(1);
  expect(intro.advance(400)).toBe(true);expect(intro.pose()).toEqual({dock:1,scale:1});
  expect(intro.advance(400)).toBe(false);
});

it('回工坊、減少動態與背景頁能立即結束；下一關可重新開始',()=>{
  const intro=new OrderEntrance();intro.begin();intro.advance(300);intro.finish();
  expect(intro.active).toBe(false);expect(intro.advance(5000)).toBe(false);
  intro.begin(true);expect(intro.pose()).toEqual({dock:1,scale:1});
  intro.begin();expect(intro.active).toBe(true);expect(intro.elapsed).toBe(0);
});
