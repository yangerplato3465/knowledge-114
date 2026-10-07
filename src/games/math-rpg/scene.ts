import type { App, Node, Pixi } from '../magic-workshop/scene-types';

export const LAYERS = ['background', 'actors', 'effects', 'interface'] as const;
export interface Viewport { width: number; height: number; scale: number; x: number; y: number }
export interface GameScene {
  layers: Record<typeof LAYERS[number], Node>;
  readonly viewport: Viewport;
  render(): void;
  destroy(): void;
}

/** Logical coordinates keep future artwork proportional in both orientations. */
export function fitViewport(width: number, height: number): Viewport {
  const portrait = height > width;
  const w = portrait ? 720 : 1280, h = portrait ? 1280 : 720;
  const scale = Math.min(width / w, height / h);
  return { width: w, height: h, scale, x: (width - w * scale) / 2, y: (height - h * scale) / 2 };
}

const loadLocalPixi = async () => await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Pixi;

/** Empty Pixi stage: new art and controls attach to these layers, never DOM panels. */
export async function createGameScene(host: HTMLElement, signal: AbortSignal, loadPixi = loadLocalPixi): Promise<GameScene> {
  signal.throwIfAborted();
  const P = await loadPixi();
  signal.throwIfAborted();
  const app: App = new P.Application();
  let initialized = false, destroyed = false;
  let resizeObserver: ResizeObserver | undefined;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    resizeObserver?.disconnect();
    signal.removeEventListener('abort', destroy);
    if (initialized) app.destroy({ removeView: true }, { children: true });
  };

  try {
    await app.init({
      width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight),
      backgroundAlpha: 0, antialias: true, autoStart: false, preference: 'webgl',
      resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
    });
    initialized = true;
    signal.throwIfAborted();
    signal.addEventListener('abort', destroy, { once: true });
    const root = new P.Container();
    app.stage.addChild(root);
    const layers = {} as GameScene['layers'];
    for (const key of LAYERS) layers[key] = root.addChild(new P.Container());
    let viewport = fitViewport(1, 1);
    const resize = () => {
      if (destroyed) return;
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      app.renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
      viewport = fitViewport(width, height);
      root.scale.set(viewport.scale);
      root.position.set(viewport.x, viewport.y);
      app.render();
    };
    app.canvas.setAttribute('aria-hidden', 'true');
    host.append(app.canvas);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    // No animation or gameplay has been added; render on demand, with no idle ticker.
    return { layers, get viewport() { return viewport; }, render() { if (!destroyed) app.render(); }, destroy };
  } catch (error) {
    destroy();
    // A failed renderer init may leave a context before Application plugins exist.
    if (!initialized && app.renderer) {
      (app.renderer as App['renderer'] & { destroy(options: { removeView: boolean }): void }).destroy({ removeView: true });
    }
    throw error;
  }
}
