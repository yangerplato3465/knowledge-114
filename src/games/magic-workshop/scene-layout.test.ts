import { expect, it } from 'vitest';
import { bottleDimensions, workshopLayout } from './scene-layout';
import { difficultyTitle } from './scene-model';

it('難度恢復原本的魔法職階稱號', () => {
  expect([3,4,5].map(n=>difficultyTitle(n as 3|4|5))).toEqual(['學徒','魔法師','大魔導師']);
});

it('容量分成三種瓶身尺寸，保持玻璃瓶比例與可讀性',()=>{
  for(const portrait of [false,true]){
    const sizes=[2,7,12].map(n=>bottleDimensions(n,portrait));
    expect(sizes.map(s=>s.size)).toEqual(['small','medium','large']);
    expect(sizes[0].h).toBeLessThan(sizes[1].h);
    expect(sizes[1].h).toBeLessThan(sizes[2].h);
    expect(sizes[0].w/sizes[0].h).toBeCloseTo(sizes[2].w/sizes[2].h);
    expect(sizes[0].w).toBeGreaterThan(68);
  }
});

it.each([[1920,1200],[1920,1080],[2560,1080],[1024,768],[375,812],[768,1024],[844,390]])('%i × %i 操作配置填滿實際視窗，物件保留等比例', (w,h) => {
  const l=workshopLayout(w,h);
  expect(l.width*l.scale).toBeCloseTo(w);expect(l.height*l.scale).toBeCloseTo(h);
  if(l.portrait)expect(l.order.x+l.order.width/2).toBe(l.width-l.edge);
  else expect(l.order.x-l.order.width/2).toBe(l.edge);
  const head=l.milo.y-l.milo.height;
  expect(head-l.dialogue.y).toBeGreaterThan(40);
  expect(head-l.dialogue.y).toBeLessThan(90);
  expect(l.dialogue.x-(l.dialogue.width+30)/2).toBeGreaterThan(0);
  expect(l.dialogue.x+(l.dialogue.width+30)/2).toBeLessThanOrEqual(l.width-l.edge);
  expect(l.milo.x+l.milo.width/2).toBeLessThan(l.guest.laneLeft);
  expect(l.guest.seatX-l.guest.half).toBeGreaterThan(l.guest.laneLeft);
  expect(l.guest.entryX+l.guest.half).toBeCloseTo(l.width-l.edge);
  expect(l.guest.entryX).toBeGreaterThan(l.guest.seatX);
  expect(l.footer.y).toBeGreaterThan(l.bottles.y+55);
  expect(l.footer.homeY+33).toBeLessThanOrEqual(l.height);
  expect(l.station.left-65).toBeGreaterThanOrEqual(0);
  expect(l.station.left-l.station.springWidth/2).toBeGreaterThanOrEqual(l.edge);
  expect(l.station.springWidth).toBeGreaterThan(l.station.recyclerWidth);
  expect(l.station.right+80).toBeLessThan(l.width);
  expect(l.station.y-l.station.springHeight).toBeGreaterThan(l.order.y+132);
});

it('加寬時左右資訊隨邊界分開，瓶子間距跟著擴展', () => {
  const a=workshopLayout(1200,800),b=workshopLayout(1920,800);
  expect(a.scale).toBe(b.scale);
  expect(b.order.x).toBe(a.order.x);
  expect(b.dialogue.x).toBe(a.dialogue.x);
  expect(b.guest.entryX-a.guest.entryX).toBe(720);
  expect(b.footer.homeX-a.footer.homeX).toBe(720);
  expect(b.bottles.span).toBeGreaterThan(a.bottles.span);
});

it('直向加高時操作列靠下，瓶子與角色依桌面重新排位', () => {
  const a=workshopLayout(600,1000),b=workshopLayout(600,1400);
  expect(b.footer.y-a.footer.y).toBe(400);
  expect(b.bottles.y).toBeGreaterThan(a.bottles.y);
  expect(b.milo.y-b.tableY).toBeCloseTo(a.milo.y-a.tableY);
});
