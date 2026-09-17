// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { WordSortFX } from './WordSortFX';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
function runtime(init: () => Promise<void> = async () => {}) {
  const removed = vi.fn(); const textureDestroy = vi.fn();
  const app = { canvas: document.createElement('canvas'), init, stage: { addChild: vi.fn() },
    ticker: { add: vi.fn(), remove: vi.fn() }, renderer: { resize: vi.fn() }, start: vi.fn(), stop: vi.fn(), destroy: vi.fn() };
  const add = vi.fn();
  vi.stubGlobal('PIXI', {
    Application: class { constructor() { return app; } },
    ParticleContainer: class { addParticle = add; removeParticle = removed; },
    Particle: class { constructor(options: object) { Object.assign(this, options); } },
    Texture: { from: () => ({ destroy: textureDestroy }) },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ beginPath() {}, roundRect() {}, fill() {} } as unknown as CanvasRenderingContext2D);
  const host = document.createElement('div'); document.body.append(host);
  return { app, add, removed, textureDestroy, host };
}
it('偏好指令清空粒子，暫停不能被偏好切換解除，銷毀只釋放本實例', async () => {
  const r = runtime(); const fx = new WordSortFX(); await fx.mount(r.host);
  fx.dispatch({ type: 'set-reduced-motion', enabled: false }); fx.resume();
  fx.burst(20, 30, 'ful'); expect(r.add).toHaveBeenCalledTimes(55);
  fx.dispatch({ type: 'set-reduced-motion', enabled: true }); expect(r.removed).toHaveBeenCalledTimes(55);
  fx.burst(20, 30, 'ful'); expect(r.add).toHaveBeenCalledTimes(55);
  fx.pause(); r.app.start.mockClear();
  fx.dispatch({ type: 'set-reduced-motion', enabled: false }); expect(r.app.start).not.toHaveBeenCalled();
  fx.destroy(); fx.destroy();
  expect(r.app.destroy).toHaveBeenCalledTimes(1); expect(r.textureDestroy).toHaveBeenCalledTimes(1);
});
it('init 尚未結束已離場時不附加 canvas，完成後釋放 renderer', async () => {
  let finish!: () => void;
  const r = runtime(() => new Promise<void>(resolve => { finish = resolve; }));
  const fx = new WordSortFX(); const mounting = fx.mount(r.host);
  await Promise.resolve(); r.host.remove(); finish(); await mounting;
  expect(r.host.children.length).toBe(0); expect(r.app.destroy).toHaveBeenCalledTimes(1);
});
it('GPU 初始化失敗時 mount 正常結束，特效呼叫與 destroy 安全', async () => {
  const r = runtime(async () => { throw new Error('GPU unavailable'); });
  const fx = new WordSortFX(); await expect(fx.mount(r.host)).resolves.toBeUndefined();
  expect(() => { fx.resume(); fx.burst(0, 0, 'less'); fx.destroy(); }).not.toThrow();
  expect(r.host.children.length).toBe(0);
  expect(r.app.destroy).toHaveBeenCalledTimes(1);
});
