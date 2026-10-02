import { expect, it } from 'vitest';
import { bottleDimensions, counterMask, counterY, workshopLayout } from './scene-layout';
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

it.each([[1920,1200],[1920,1080],[2560,1080],[1024,768],[375,625],[375,812],[768,1024],[844,390]])('%i × %i 操作配置填滿實際視窗，物件保留等比例', (w,h) => {
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
  // Rendering and actor clipping must use the same cover transform, including fullscreen ratios.
  expect(l.background.width/l.background.height).toBeCloseTo(1536/1024);
  expect(l.background.width).toBeGreaterThanOrEqual(l.width);
  expect(l.background.height).toBeGreaterThanOrEqual(l.height);
  for(const [x,y] of l.tableEdge){
    expect(counterY(l.tableEdge,x)).toBeCloseTo(y);
  }
  expect(l.tableY).toBeCloseTo(l.background.y+(573+(574-573)*(768-640)/(900-640))*l.background.height/1024);
  const mask=counterMask(l.tableEdge,l.guest.laneLeft,l.width-l.edge);
  expect(mask.slice(4,6)).toEqual([l.width-l.edge,counterY(l.tableEdge,l.width-l.edge)]);
  expect(mask.slice(-2)).toEqual([l.guest.laneLeft,counterY(l.tableEdge,l.guest.laneLeft)]);
  if(l.portrait){
    for(const capacity of [2,7,14]){
      const bottleTop=l.bottles.y-bottleDimensions(capacity,true,l.bottles.sizeScale).h;
      // Each hit area extends 2 logical pixels into the 4 px gap, without overlapping.
      expect(bottleTop-2-(l.station.y+2)).toBeGreaterThanOrEqual(-1e-8);
      expect(l.station.y).toBeGreaterThan(l.tableY);
      expect(l.bottles.y).toBeLessThanOrEqual(l.tableFrontY-12);
    }
  }
});

it('手機工具列壓縮高度時，兩列物件等比縮小並停在桌面內；足夠高時保留原尺寸',()=>{
  const compact=workshopLayout(430,717),tall=workshopLayout(430,956);
  expect(compact.bottles.sizeScale).toBeLessThan(1);
  expect(tall.bottles.sizeScale).toBe(1);
  expect(tall.bottles.y).toBeCloseTo(Math.max(tall.height*.76,tall.tableY+289));
  for(const capacity of [2,7,14]){
    const full=bottleDimensions(capacity,true),small=bottleDimensions(capacity,true,compact.bottles.sizeScale);
    expect(small.w/small.h).toBeCloseTo(full.w/full.h);
  }
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
  expect(b.milo.y-counterY(b.tableEdge,b.milo.x)).toBeCloseTo(a.milo.y-counterY(a.tableEdge,a.milo.x));
});
