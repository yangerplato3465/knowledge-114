// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createGameScene, fitViewport } from './scene';
import type { App, Pixi } from '../magic-workshop/scene-types';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function fixture(init = async () => {}) {
  class Container {
    children: Container[] = [];
    scale = { set: vi.fn() }; position = { set: vi.fn() };
    addChild(child: Container) { this.children.push(child); return child; }
  }
  const canvas = document.createElement('canvas');
  const app = {
    init: vi.fn(init), stage: new Container(), canvas,
    renderer: { resize: vi.fn(), destroy: vi.fn() },
    render: vi.fn(), start: vi.fn(), stop: vi.fn(),
    destroy: vi.fn(() => canvas.remove()),
  };
  let resize = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe = vi.fn(); disconnect = disconnect;
  });
  const load = vi.fn(async () => ({ Application: class { constructor() { return app as unknown as App; } }, Container }) as unknown as Pixi);
  const host = document.createElement('div');
  let width = 1440, height = 900;
  Object.defineProperties(host, { clientWidth: { get: () => width }, clientHeight: { get: () => height } });
  return { host, app, load, disconnect, resize(w: number, h: number) { width = w; height = h; resize(); } };
}

test('橫直向均保持比例、置中，不裁切邏輯畫布', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [320, 568]]) {
    const view = fitViewport(width, height);
    expect(view.x).toBeGreaterThanOrEqual(0); expect(view.y).toBeGreaterThanOrEqual(0);
    expect(view.width * view.scale + view.x * 2).toBeCloseTo(width);
    expect(view.height * view.scale + view.y * 2).toBeCloseTo(height);
    expect(view.width > view.height).toBe(width >= height);
  }
});

test('建立單一空白畫布與四個空圖層，尺寸改變及取消都安全清理', async () => {
  const f = fixture(), controller = new AbortController();
  const scene = await createGameScene(f.host, controller.signal, f.load);
  expect(f.host.querySelectorAll('canvas')).toHaveLength(1);
  expect(Object.keys(scene.layers)).toEqual(['background', 'actors', 'effects', 'interface']);
  expect(f.app.stage.children[0].children.every(layer => layer.children.length === 0)).toBe(true);
  expect(f.app.init).toHaveBeenCalledWith(expect.objectContaining({ autoStart: false, backgroundAlpha: 0 }));
  expect(f.app.start).not.toHaveBeenCalled();
  f.resize(390, 844);
  expect(scene.viewport).toMatchObject({ width: 720, height: 1280 });
  expect(f.app.renderer.resize).toHaveBeenLastCalledWith(390, 844, expect.any(Number));
  controller.abort(); scene.destroy();
  expect(f.app.destroy).toHaveBeenCalledTimes(1);
  expect(f.disconnect).toHaveBeenCalledTimes(1);
  expect(f.host.childNodes).toHaveLength(0);
  const renders = f.app.render.mock.calls.length;
  f.resize(800, 600); scene.render();
  expect(f.app.render).toHaveBeenCalledTimes(renders);
});

test('引擎匯入尚未完成便取消，不建立 Application', async () => {
  const f = fixture(), controller = new AbortController();
  let finish!: (pixi: Pixi) => void;
  const pending = createGameScene(f.host, controller.signal, () => new Promise(resolve => { finish = resolve; }));
  controller.abort(); finish(await f.load());
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(f.app.init).not.toHaveBeenCalled();
  expect(f.host.childNodes).toHaveLength(0);
});

test('初始化途中取消，晚到的畫布銷毀且不附加至頁面', async () => {
  let finish!: () => void;
  const f = fixture(() => new Promise<void>(resolve => { finish = resolve; }));
  const controller = new AbortController();
  const pending = createGameScene(f.host, controller.signal, f.load);
  await vi.waitFor(() => expect(f.app.init).toHaveBeenCalled());
  controller.abort(); finish();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(f.app.destroy).toHaveBeenCalledTimes(1);
  expect(f.host.childNodes).toHaveLength(0);
});

test('初始化失敗釋放已建立的 renderer，不啟用未完成的 Application 清理', async () => {
  const f = fixture(async () => { throw new Error('renderer unavailable'); });
  await expect(createGameScene(f.host, new AbortController().signal, f.load)).rejects.toThrow('renderer unavailable');
  expect(f.app.renderer.destroy).toHaveBeenCalledTimes(1);
  expect(f.app.destroy).not.toHaveBeenCalled();
  expect(f.host.childNodes).toHaveLength(0);
});
