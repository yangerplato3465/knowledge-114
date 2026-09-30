import { expect, it } from 'vitest';
import { bottleInterior, bottlePourAngle, liquidGeometry, polygonArea, pourTiming } from './liquid-geometry';

it.each([0,1/13,1/7,.25,.5,1])('液體 %f 依瓶內面積呈現容量，空瓶沒有殘液', fraction=>{
  const shape=liquidGeometry(130,198,fraction);
  expect(polygonArea(shape.points)/polygonArea(bottleInterior(130,198))).toBeCloseTo(fraction,5);
  if(fraction>0)expect(shape.surface).not.toBeNull();else expect(shape.points).toEqual([]);
});
it('滿瓶進入瓶頸，七分之一留在瓶底且有可見厚度',()=>{
  const full=liquidGeometry(130,198,1),low=liquidGeometry(130,198,1/7);
  expect(full.level).toBeCloseTo(-198*.913,3);
  expect(low.level).toBeGreaterThan(-198*.24);
  expect(-198*.067-low.level).toBeGreaterThan(14);
  expect(bottleInterior(130,198).some(p=>p.x===0&&Math.abs(p.y+198*.067)<.01)).toBe(true);
});
it.each([-1.78,-.6,0,.6,1.78])('傾斜 %f 時維持份量，液面沿世界水平',angle=>{
  const shape=liquidGeometry(130,198,.35,angle);
  expect(polygonArea(shape.points)/polygonArea(bottleInterior(130,198))).toBeCloseTo(.35,5);
  const [a,b]=shape.surface!;
  expect(a.x*Math.sin(angle)+a.y*Math.cos(angle)).toBeCloseTo(b.x*Math.sin(angle)+b.y*Math.cos(angle),5);
});
it('先抬瓶、流動期間才改變份量，停止水流後放回',()=>{
  expect(pourTiming(.2)).toMatchObject({flow:0,wet:false});
  expect(pourTiming(.5)).toMatchObject({pose:1,wet:true});
  expect(pourTiming(.85)).toMatchObject({flow:1,wet:false});
  expect(pourTiming(1)).toEqual({pose:0,flow:1,wet:false});
});
it.each([1,.5,1/7,.03])('剩餘 %f 時加大傾角，水面確實到達出水瓶唇',fraction=>{
  const angle=bottlePourAngle(fraction),shape=liquidGeometry(130,198,fraction,angle);
  const lipHeight=Math.sin(angle)*130*.19-Math.cos(angle)*198*.945;
  expect(shape.level).toBeLessThan(lipHeight);
});
