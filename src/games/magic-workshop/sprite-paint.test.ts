import { expect, it } from 'vitest';
import { placeIllustration } from './sprite-paint';
import { UI_ART } from './ui-art';
import type { Sprite, Texture } from './scene-types';

it('所有插畫採小尺寸 WebP，固定格保留安全留白', () => {
  for(const spec of Object.values(UI_ART)) {
    expect(spec.file.endsWith('.webp')).toBe(true);
    expect(spec.size).toBeLessThanOrEqual(512);
    const [l,t,r,b]=spec.bounds;
    expect(l).toBeGreaterThanOrEqual(.08);expect(t).toBeGreaterThanOrEqual(.08);
    expect(r).toBeLessThanOrEqual(.92);expect(b).toBeLessThanOrEqual(.92);
  }
});

it('圖示以完整透明貼圖等比縮放，只有指定介面材質可拉伸', () => {
  const point=()=>({x:0,y:0,set(x:number,y=x){this.x=x;this.y=y;}});
  const texture={width:128,height:128,destroy(){}} as Texture;
  const textures=new Map([['ui:crystal-lit',texture]]);
  const sprite={anchor:point(),position:point(),scale:point()} as Sprite;
  placeIllustration(sprite,'crystal-lit',textures,50,75,30,40);
  expect(sprite.scale.x).toBe(sprite.scale.y);
  expect(sprite.position).toMatchObject({x:50,y:75});expect(sprite.texture).toBe(texture);
  const [l,t,r,b]=UI_ART['crystal-lit'].bounds;
  expect(sprite.scale.x*texture.width*(r-l)).toBeLessThanOrEqual(30.001);
  expect(sprite.scale.y*texture.height*(b-t)).toBeLessThanOrEqual(40.001);
});
