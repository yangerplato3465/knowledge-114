import type { GameState } from './session';

interface Graphic { clear(): Graphic; circle(x: number, y: number, radius: number): Graphic; fill(style: { color: number; alpha: number }): Graphic }
interface App {
  init(options: Record<string, unknown>): Promise<void>;
  canvas: HTMLCanvasElement;
  stage: { addChild(graphic: Graphic): void };
  ticker: { add(fn: (ticker: { deltaMS: number }) => void): void; maxFPS: number };
  start(): void; stop(): void; render(): void;
  destroy(options: { removeView: boolean }, children: { children: boolean }): void;
}
interface Vendor { Application: new () => App; Graphics: new () => Graphic }
export interface WorkshopScene { update(game: GameState): void; motion(reduced: boolean): void; destroy(): void }

/** Transparent fireflies over the complete panorama; the image remains visible if WebGL fails. */
export async function createWorkshopScene(host: HTMLElement, _initial: GameState, signal: AbortSignal): Promise<WorkshopScene> {
  const P = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Vendor;
  signal.throwIfAborted();
  const app = new P.Application();
  let ready = false, disposed = false;
  const destroy = () => { if (disposed) return; disposed = true; if (ready) app.destroy({ removeView: true }, { children: true }); };
  try {
    await app.init({ width: 960, height: 320, backgroundAlpha: 0, antialias: true, autoStart: false,
      preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    ready = true; signal.throwIfAborted();
    const motes = new P.Graphics(); app.stage.addChild(motes);
    app.canvas.style.width = '100%'; app.canvas.style.height = '100%'; host.append(app.canvas);
    app.ticker.maxFPS = 24;
    let time = 0, reduced = false;
    const draw = () => {
      motes.clear();
      if (reduced) return;
      for (let i = 0; i < 18; i++) {
        const phase = i * 1.7;
        motes.circle(60 + i * 49 + Math.sin(time * .4 + phase) * 6, 50 + i * 43 % 190 + Math.sin(time * .6 + phase) * 10, 1.3 + i % 2)
          .fill({ color: i % 3 ? 0xffe0a0 : 0x8aefe3, alpha: .2 + (Math.sin(time + phase) + 1) * .16 });
      }
    };
    app.ticker.add(t => { time += Math.min(t.deltaMS, 60) / 1000; draw(); });
    draw(); app.render();
    return { update() {}, motion(value) { reduced = value; draw(); app.render(); if (reduced || document.visibilityState !== 'visible') app.stop(); else app.start(); }, destroy };
  } catch (error) { destroy(); throw error; }
}
