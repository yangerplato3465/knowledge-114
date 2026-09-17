// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createBattleGraphics, type PixiRuntime } from './pixiLayers';
import { initialBattle } from './model';
import type { BattleSnapshot } from './session';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
it('貼圖切關、命中傷害、延遲清除與重玩使用實際 layer 邏輯', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const nodes: { text: string; visible: boolean; alpha: number; texture: object }[] = [];
  class Node {
    x = 0; y = 0; width = 0; height = 0; alpha = 1; visible = true; tint = 0; rotation = 0;
    text = ''; texture = { width: 100, height: 100 }; anchor = { set() {} }; destroy() {}
    constructor(options: object) { Object.assign(this, options); nodes.push(this); }
  }
  const textures: Record<string, { width: number; height: number }> = {};
  const addFrame = vi.fn(), removeFrame = vi.fn();
  const pixi = { Application: class {
    canvas = document.createElement('canvas'); renderer = { resize() {} }; stage = { addChild() {}, destroy() {} };
    ticker = { add: addFrame, remove: removeFrame };
    async init() {} start() {} stop() {} render() {} destroy() {}
  }, Sprite: Node, Text: Node, Assets: { load: vi.fn(async (url: string) => textures[url] ??= { width: 100, height: 100 }) } } as PixiRuntime;
  const targets = { battle: document.createElement('div'), overlay: document.createElement('div'), hero: document.createElement('img'), enemy: document.createElement('img') };
  document.body.append(...Object.values(targets));
  const graphics = createBattleGraphics(targets, async () => pixi);
  await graphics.mount(); expect(pixi.Assets.load).toHaveBeenCalledTimes(13);
  const snapshot: BattleSnapshot = { state: { ...initialBattle(), combo: 1 }, phase: 'resolving', questionId: 1, deadline: null, offers: [], cue: 'impact', hit: { damage: 25, critical: false, blocked: false } };
  graphics.update(snapshot); expect(nodes[3].text).toBe('−25'); expect(nodes[3].visible).toBe(true);
  vi.advanceTimersByTime(900); expect(nodes[3].visible).toBe(false);
  graphics.update({ ...snapshot, questionId: 2, cue: null, phase: 'question', state: { ...initialBattle(), enemyIndex: 1 } });
  expect(nodes[1].texture).toBe(textures['/assets/images/math-rpg/enemy2.webp']);
  expect(nodes[1].alpha).toBe(1);
  expect(pixi.Assets.load).toHaveBeenCalledTimes(13);
  graphics.update({ ...snapshot, phase: 'victory', cue: 'victory' });
  addFrame.mock.calls[1][0]();
  expect(nodes.slice(4).every(node => node.visible)).toBe(true);
  graphics.update({ ...snapshot, phase: 'question', questionId: 3, cue: null });
  expect(nodes.slice(4).every(node => !node.visible)).toBe(true);
  graphics.destroy(); expect(document.querySelectorAll('canvas')).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
  expect(addFrame).toHaveBeenCalledTimes(2);
  expect(removeFrame).toHaveBeenCalledTimes(2);
  expect(removeFrame).toHaveBeenCalledWith(addFrame.mock.calls[0][0]);
  expect(removeFrame).toHaveBeenCalledWith(addFrame.mock.calls[1][0]);
});
