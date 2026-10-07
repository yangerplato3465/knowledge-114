// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import type { Node, Texture } from '../magic-workshop/scene-types';
import { CONTROL_IMAGES, createTouchControls, type ControlPixi } from './controls';

const xy = () => ({ x: 0, y: 0, set(x: number, y = x) { this.x = x; this.y = y; } });
class MockNode implements Node {
  x = 0; y = 0; width = 0; height = 0; alpha = 1; rotation = 0; visible = true;
  scale = xy(); position = xy(); pivot = xy(); anchor = xy(); mask: Node | null = null;
  children: MockNode[] = []; tint = 0xffffff; text = ''; texture?: Texture;
  constructor(options?: { text?: string; texture?: Texture }) { this.text = options?.text ?? ''; this.texture = options?.texture; }
  addChild<T extends Node>(node: T): T { this.children.push(node as unknown as MockNode); return node; }
  removeChildren() { return this.children.splice(0); }
  destroy = vi.fn();
  clear() { return this; }
  roundRect() { return this; }
  fill() { return this; }
}
function setup() {
  const textures = CONTROL_IMAGES.map(() => ({ width: 384, height: 128, destroy: vi.fn() }));
  let next = 0;
  const P = { Container: MockNode, NineSliceSprite: MockNode, Text: MockNode, Graphics: MockNode, Texture: { from: () => textures[next++] } } as unknown as ControlPixi;
  const parent = new MockNode(), stage = document.createElement('div'), host = document.createElement('div'); stage.append(host);
  host.getBoundingClientRect = () => ({ left: 20, top: 10, height: 600 } as DOMRect);
  for (const [index, id] of ['jump', 'red', 'blue'].entries()) {
    const button = document.createElement('button'); button.dataset.control = id; stage.append(button);
    button.getBoundingClientRect = () => ({ left: 40 + index * 240, top: 480, width: 220, height: 120 } as DOMRect);
  }
  const hud = createTouchControls(P, CONTROL_IMAGES.map(() => new Image()), parent, host);
  hud.layout(); hud.sync({ mode: 'play', paused: false, completed: false, tutorialOpen: false, color: null });
  const views = parent.children[0].children, surfaces = views.map(view => view.children[0]);
  return { hud, textures, views, surfaces };
}
it('Pixi 按壓分別追蹤多個接觸來源，短按也顯示壓平圖；釋放與暫停可恢復', () => {
  const { hud, textures, surfaces, views } = setup();
  hud.press('jump', true, 'pointer-1'); hud.press('jump', true, 'pointer-2'); hud.update(0.2, false);
  expect(surfaces[0].y).toBeGreaterThan(7); expect(surfaces[0].children[0].texture).toBe(textures[1]);
  hud.press('jump', false, 'pointer-1'); hud.update(0.2, false); expect(surfaces[0].y).toBeGreaterThan(7);
  hud.press('red', true, 'pointer-3'); hud.press('red', false, 'pointer-3'); hud.update(0.03, false);
  expect(surfaces[1].children[0].texture).toBe(textures[3]);
  hud.sync({ mode: 'play', paused: true, completed: false, tutorialOpen: false, color: 'purple' }); hud.update(0, true);
  expect(surfaces.map(surface => surface.y)).toEqual([0, 8, 8]); expect(views.every(view => view.alpha === 0.5)).toBe(true);
  expect(surfaces.map(surface => surface.children.map(child => child.text).filter(Boolean))).toEqual([['跳躍'], ['紅燈'], ['藍燈']]);
  hud.clear(); hud.destroy(); textures.forEach(texture => expect(texture.destroy).toHaveBeenCalledExactlyOnceWith(true));
});
it('對齊 DOM 的觸控框；巡覽與減少動態保留燈操作、停用跳躍', () => {
  const { hud, views, surfaces, textures } = setup();
  expect(views[0].position).toMatchObject({ x: 20, y: 470 });
  hud.sync({ mode: 'preview', paused: true, completed: false, tutorialOpen: false, color: 'blue' });
  hud.press('jump', true, 'pointer-1'); hud.press('blue', true, 'pointer-2'); hud.update(0, true);
  expect(surfaces[0].y).toBe(0); expect(surfaces[2].y).toBe(8);
  expect(surfaces[2].children[0]).toMatchObject({ width: 220, height: 112, texture: textures[5] });
  expect(views[0].alpha).toBe(0.5); expect(views[2].alpha).toBe(1);
  hud.clear(); hud.update(0, true); expect(surfaces[2].y).toBe(8);
  hud.sync({ mode: 'preview', paused: true, completed: false, tutorialOpen: false, color: null });
  hud.update(0, true); expect(surfaces[2].y).toBe(0); hud.destroy();
});
it('燈亮後放開接觸仍保持壓下；兩燈、關閉其中一燈及重設皆各自反映實際世界顏色', () => {
  const { hud, surfaces, textures } = setup();
  const sync = (color: 'red' | 'blue' | 'purple' | null) => hud.sync({ mode: 'play', paused: false, completed: false, tutorialOpen: false, color });
  hud.press('red', true, 'pointer-1'); sync('red'); hud.press('red', false, 'pointer-1'); hud.update(1, false);
  expect(surfaces[1].y).toBeCloseTo(8); expect(surfaces[1].children[0].texture).toBe(textures[3]);
  expect(surfaces[2].y).toBe(0);
  sync('purple'); hud.update(1, false); expect(surfaces[2].y).toBeCloseTo(8);
  sync('blue'); hud.update(1, false); expect(surfaces[1].y).toBeCloseTo(0); expect(surfaces[2].y).toBeCloseTo(8);
  sync(null); hud.update(1, false); expect(surfaces[2].y).toBeCloseTo(0);
  expect(surfaces[1].children[0].texture).toBe(textures[2]); expect(surfaces[2].children[0].texture).toBe(textures[4]);
  hud.destroy();
});
