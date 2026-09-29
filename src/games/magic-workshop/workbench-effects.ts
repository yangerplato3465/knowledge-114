import type { GameState } from './session';
import { OPERATION_MS } from './motion';

interface Graphic {
  clear(): Graphic;
  circle(x: number, y: number, radius: number): Graphic;
  moveTo(x: number, y: number): Graphic;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): Graphic;
  fill(options: { color: number; alpha: number }): Graphic;
  stroke(options: { color: number; alpha: number; width: number; cap?: string }): Graphic;
}
interface App {
  init(options: Record<string, unknown>): Promise<void>;
  canvas: HTMLCanvasElement;
  stage: { addChild(graphic: Graphic): void };
  ticker: { add(callback: (ticker: { deltaMS: number }) => void): void; maxFPS: number };
  start(): void; stop(): void; render(): void;
  destroy(options: { removeView: boolean }, children: { children: boolean }): void;
}
interface Vendor { Application: new () => App; Graphics: new () => Graphic }
export interface Spot { x: number; y: number }
export interface EffectsLayout { bottles: Spot[]; spring: Spot; recycler: Spot }
export interface EffectsScene { update(game: GameState, layout: EffectsLayout): void; drag(spot: Spot | null): void; motion(reduced: boolean): void; destroy(): void }

const bottleX = (index: number, count: number) => 480 + (index - (count - 1) / 2) * 165;
const arcY = (start: Spot, end: Spot) => Math.max(12, Math.min(start.y, end.y) - 96);
const point = (start: Spot, end: Spot, progress: number) => ({
  x: start.x + (end.x - start.x) * progress,
  y: (1 - progress) ** 2 * start.y + 2 * (1 - progress) * progress * arcY(start, end) + progress ** 2 * end.y,
});

export async function createEffectsScene(host: HTMLElement, initial: GameState, signal: AbortSignal, measure?: () => EffectsLayout): Promise<EffectsScene> {
  const P = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Vendor;
  signal.throwIfAborted();
  const app = new P.Application();
  let ready = false, disposed = false;
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    if (ready) app.destroy({ removeView: true }, { children: true });
  };
  try {
    await app.init({ width: 960, height: 360, backgroundAlpha: 0, antialias: true, autoStart: false,
      preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    ready = true;
    signal.throwIfAborted();
    const graphic = new P.Graphics();
    app.stage.addChild(graphic);
    app.canvas.style.width = '100%'; app.canvas.style.height = '100%';
    host.append(app.canvas);
    app.ticker.maxFPS = 30;
    let state = initial;
    let lastVersion = initial.effectVersion;
    let elapsed = 9;
    let started = 0;
    let trail: (Spot & { at: number })[] = [];
    let clock = 0;
    let reduced = false;
    let event = initial.lastAction === 'deliver' ? null : initial.lastAction;
    let count = state.practice ? 2 : state.deck[state.index]?.capacities.length ?? 2;
    let layout: EffectsLayout = { bottles: Array.from({ length: count }, (_, index) => ({ x: bottleX(index, count), y: 171 })),
      spring: { x: 105, y: 171 }, recycler: { x: 855, y: 171 } };
    const draw = () => {
      graphic.clear();
      const now = performance.now();
      trail = trail.filter(spot => now - spot.at < 280);
      if (!reduced) trail.forEach((spot, index) => graphic.circle(spot.x, spot.y, 2 + index % 2)
        .fill({ color: 0x9deee5, alpha: (1 - (now - spot.at) / 280) * .65 }));
      if (event && elapsed <= OPERATION_MS / 1000 && measure) layout = measure();
      if (state.selected !== null && state.screen === 'playing') {
        const spot = layout.bottles[state.selected];
        if (spot) {
        const pulse = reduced ? 1 : 1 + Math.sin(clock * 4) * .08;
        graphic.circle(spot.x, spot.y + 60, 52 * pulse).stroke({ color: 0x6de9df, alpha: .18, width: 3 });
        }
      }
      if (!event || reduced || elapsed > OPERATION_MS / 1000 || state.screen === 'home') return;
      const start = event.kind === 'fill' ? layout.spring : layout.bottles[event.from];
      const end = event.kind === 'empty' ? layout.recycler : layout.bottles[event.kind === 'pour' ? event.to! : event.from];
      if (!start || !end) return;
      const progress = Math.min(1, elapsed / (OPERATION_MS / 1000));
      const color = event.kind === 'empty' ? 0xd5a7ef : event.kind === 'fill' ? 0x7be9ec : 0x85efca;
      if (event.kind !== 'pour') {
        const station = event.kind === 'fill' ? start : end;
        const radius = event.kind === 'fill' ? 10 + progress * 38 : 48 * (1 - progress) + 5;
        graphic.circle(station.x, station.y, radius).stroke({ color, alpha: Math.sin(progress * Math.PI) * .7, width: 4 });
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3 + progress * Math.PI * 2;
          graphic.circle(station.x + Math.cos(angle) * radius, station.y + Math.sin(angle) * radius * .55, 3)
            .fill({ color, alpha: Math.sin(progress * Math.PI) });
        }
      }
      if (progress < .15 || progress > .85) return;
      graphic.moveTo(start.x, start.y).quadraticCurveTo((start.x + end.x) / 2, arcY(start, end), end.x, end.y)
        .stroke({ color, alpha: Math.max(0, .42 * (1 - progress)), width: 5, cap: 'round' });
      for (let i = 0; i < 12; i++) {
        const travel = ((progress - .15) / .7 * 2 - i * .075) % 1;
        if (travel < 0 || travel > 1) continue;
        const position = point(start, end, travel);
        graphic.circle(position.x, position.y, i % 3 === 0 ? 7 : 4).fill({ color, alpha: .92 });
      }
      graphic.circle(end.x, end.y, 15 + 32 * progress).stroke({ color, alpha: Math.max(0, 1 - progress), width: 4 });
    };
    app.ticker.add(ticker => {
      clock += Math.min(ticker.deltaMS, 50) / 1000;
      elapsed = (performance.now() - started) / 1000;
      draw();
      if (elapsed > OPERATION_MS / 1000 && state.selected === null && !trail.length) { app.render(); app.stop(); }
    });
    draw(); app.render();
    return {
      update(game, nextLayout) {
        state = game;
        count = state.practice ? 2 : state.deck[state.index]?.capacities.length ?? 2;
        layout = nextLayout;
        if (lastVersion !== game.effectVersion) {
          lastVersion = game.effectVersion;
          event = game.lastAction === 'deliver' ? null : game.lastAction;
          elapsed = event ? 0 : 9;
          started = event ? performance.now() : 0;
          trail = [];
        }
        draw();
        if (reduced) app.render();
        else if (!document.hidden) app.start();
      },
      drag(spot) {
        if (!spot || reduced || document.hidden) trail = [];
        else { trail = [...trail.slice(-7), { ...spot, at: performance.now() }]; app.start(); }
        draw(); if (reduced) app.render();
      },
      motion(value) { reduced = value; if (reduced || document.visibilityState !== 'visible') { elapsed = 9; event = null; trail = []; app.stop(); draw(); app.render(); } else app.start(); },
      destroy,
    };
  } catch (error) { destroy(); throw error; }
}
