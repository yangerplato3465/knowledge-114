// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MathRpgRenderer, RendererScope, type RendererApplication, type RendererLayer } from './renderer';

const layer = (): RendererLayer => ({ setup: vi.fn(), setReducedMotion: vi.fn(), reset: vi.fn() });
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
let observers: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; callback: () => void }[];
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.useFakeTimers(); observers = [];
  media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn(); disconnect = vi.fn();
    constructor(public callback: () => void) { observers.push(this); }
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
function fixture(init?: (index: number) => Promise<void>, layers = { battle: layer(), overlay: layer() }) {
  const apps: RendererApplication[] = [];
  const runtime = { Application: class {
    canvas = document.createElement('canvas');
    renderer = { resize: vi.fn() }; stage = { destroy: vi.fn() };
    start = vi.fn(); stop = vi.fn(); render = vi.fn(); destroy = vi.fn();
    init = vi.fn(async () => { this.canvas.style.width = '320px'; this.canvas.style.height = '180px'; await init?.(apps.indexOf(this)); });
    constructor() { apps.push(this); }
  } };
  const targets = { battle: document.createElement('div'), overlay: document.createElement('div') };
  document.body.append(targets.battle, targets.overlay);
  const errors = vi.fn();
  const renderer = new MathRpgRenderer(async () => runtime, layers, errors);
  return { renderer, targets, apps, layers, errors };
}

it('兩層都完成才附加畫布；兩種尺寸獨立 resize，重複 mount 拒絕', async () => {
  const wait = deferred(); const f = fixture(i => i === 1 ? wait.promise : Promise.resolve());
  const mounting = f.renderer.mount(f.targets);
  await vi.waitFor(() => expect(f.apps).toHaveLength(2));
  expect(document.querySelectorAll('canvas')).toHaveLength(0);
  wait.resolve(); expect(await mounting).toBe(true);
  expect(document.querySelectorAll('canvas')).toHaveLength(2);
  expect(await f.renderer.mount(f.targets)).toBe(false);
  for (const app of f.apps) {
    expect(app.init).toHaveBeenCalledWith(expect.objectContaining({ autoStart: false, sharedTicker: false, preference: 'webgl' }));
    expect(app.canvas.getAttribute('aria-hidden')).toBe('true');
    expect(app.canvas.style.width).toBe('320px');
    expect(app.canvas.style.height).toBe('180px');
    expect(app.renderer!.resize).toHaveBeenCalledWith(1, 1);
  }
  expect(observers[0].observe).toHaveBeenCalledTimes(2);
  f.renderer.destroy(); f.renderer.destroy();
  for (const app of f.apps) expect(app.destroy).toHaveBeenCalledExactlyOnceWith({ removeView: true }, { children: true });
  expect(document.querySelectorAll('canvas')).toHaveLength(0);
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
});

it('init 途中離場，完成後釋放，不建立第二層或附加 canvas', async () => {
  const wait = deferred(); const f = fixture(() => wait.promise);
  const mounting = f.renderer.mount(f.targets);
  await Promise.resolve();
  f.renderer.destroy();
  expect(f.apps[0].destroy).not.toHaveBeenCalled();
  wait.resolve(); expect(await mounting).toBe(false);
  expect(f.apps).toHaveLength(1);
  expect(f.apps[0].destroy).toHaveBeenCalledTimes(1);
  expect(f.layers.battle.setup).not.toHaveBeenCalled();
});

it('第二層失敗時第一層與私有資源一起回收', async () => {
  const release = vi.fn(); const layers = { battle: layer(), overlay: layer() };
  layers.battle.setup = (_app, scope) => scope.own(release);
  const f = fixture(async i => { if (i === 1) throw new Error('GPU failed'); }, layers);
  await expect(f.renderer.mount(f.targets)).rejects.toThrow('GPU failed');
  expect(release).toHaveBeenCalledTimes(1);
  expect(f.apps.every(app => vi.mocked(app.destroy).mock.calls.length === 1)).toBe(true);
  expect(document.querySelectorAll('canvas')).toHaveLength(0);
});

it('setup 非同步途中離場即取消效果，晚取得資源立即清理', async () => {
  const wait = deferred(); const lateRelease = vi.fn(); const effect = vi.fn();
  const layers = { battle: layer(), overlay: layer() };
  layers.battle.setup = async (_app, scope) => { scope.later(effect, 100); await wait.promise; scope.own(lateRelease); };
  const f = fixture(undefined, layers); const mounting = f.renderer.mount(f.targets);
  await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
  f.renderer.destroy(); vi.advanceTimersByTime(1000);
  expect(effect).not.toHaveBeenCalled();
  wait.resolve(); expect(await mounting).toBe(false);
  expect(lateRelease).toHaveBeenCalledTimes(1);
  expect(f.apps[0].destroy).toHaveBeenCalledTimes(1);
});

it('reduced-motion 不解除手動暫停；reset 取消延遲效果', async () => {
  let scope!: RendererScope;
  const layers = { battle: layer(), overlay: layer() };
  layers.battle.setup = (_app, value) => { scope = value; };
  const f = fixture(undefined, layers); await f.renderer.mount(f.targets);
  f.renderer.pause(); f.apps.forEach(app => vi.mocked(app.start).mockClear());
  const effect = vi.fn(); scope.later(effect, 100);
  f.renderer.setReducedMotion(true); f.renderer.setReducedMotion(false);
  expect(f.apps.every(app => vi.mocked(app.start).mock.calls.length === 0)).toBe(true);
  vi.advanceTimersByTime(100); expect(effect).not.toHaveBeenCalled();
  scope.later(effect, 100); f.renderer.reset(); vi.advanceTimersByTime(100);
  expect(effect).not.toHaveBeenCalled(); expect(layers.overlay.reset).toHaveBeenCalledTimes(1);
  f.renderer.resume(); expect(f.apps[0].start).toHaveBeenCalledTimes(1);
  f.renderer.destroy(); expect(media.removeEventListener).toHaveBeenCalledTimes(1);
});

it('背景頁面暫停；恢復可見後仍尊重手動暫停', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  const f = fixture(); await f.renderer.mount(f.targets);
  expect(f.apps[0].start).not.toHaveBeenCalled();
  hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
  expect(f.apps[0].start).toHaveBeenCalledTimes(1);
  f.renderer.pause(); document.dispatchEvent(new Event('visibilitychange'));
  expect(f.apps[0].start).toHaveBeenCalledTimes(1); f.renderer.destroy();
});

it('清理例外不影響另一層或其他資源，舊實例不清理新實例', async () => {
  const layers = { battle: layer(), overlay: layer() }; const release = vi.fn();
  layers.battle.setup = (_app, scope) => { scope.own(release); scope.own(() => { throw new Error('cleanup'); }); };
  const old = fixture(undefined, layers); const next = fixture();
  await old.renderer.mount(old.targets); await next.renderer.mount(next.targets);
  old.renderer.destroy();
  expect(old.errors).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
  expect(next.targets.battle.querySelectorAll('canvas')).toHaveLength(1);
  expect(next.apps[0].destroy).not.toHaveBeenCalled(); next.renderer.destroy();
});

it('runtime 載入失敗與掛載前離場不建立畫布', async () => {
  const f = fixture(); f.renderer.destroy(); expect(await f.renderer.mount(f.targets)).toBe(false);
  expect(f.apps).toHaveLength(0);
  const renderer = new MathRpgRenderer(async () => { throw new Error('load'); }, { battle: layer(), overlay: layer() });
  await expect(renderer.mount(f.targets)).rejects.toThrow('load');
  renderer.destroy(); expect(document.querySelectorAll('canvas')).toHaveLength(0);
});

it('init 在 renderer 建立前失敗仍清除 stage，不呼叫不安全的 Application.destroy', async () => {
  const stageDestroy = vi.fn(); const appDestroy = vi.fn();
  const f = fixture();
  const renderer = new MathRpgRenderer(async () => ({ Application: class {
    canvas = document.createElement('canvas'); stage = { destroy: stageDestroy };
    async init() { throw new Error('no renderer'); }
    start() {} stop() {} render() {} destroy = appDestroy;
  } }), { battle: layer(), overlay: layer() });
  await expect(renderer.mount(f.targets)).rejects.toThrow('no renderer');
  expect(stageDestroy).toHaveBeenCalledExactlyOnceWith({ children: true });
  expect(appDestroy).not.toHaveBeenCalled();
});

it('已排隊的舊特效即使清除失效，reset 世代仍會拒絕回呼', () => {
  const callbacks: (() => void)[] = [];
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
    callbacks.push(callback); return callbacks.length;
  }) as unknown as typeof setTimeout);
  vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
  const scope = new RendererScope(); const effect = vi.fn();
  scope.later(effect, 100); scope.cancelEffects(); callbacks[0]();
  expect(effect).not.toHaveBeenCalled();
  scope.dispose();
});
