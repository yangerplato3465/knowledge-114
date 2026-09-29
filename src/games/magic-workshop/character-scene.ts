import { ART, REACTIONS, artUrl, fitArt, type ArtKey } from './art';

interface Sprite {
  anchor: { set(x: number, y: number): void };
  scale: { set(value: number): void };
  x: number; y: number; rotation: number; alpha: number;
}
interface Texture { destroy(source: boolean): void }
interface App {
  init(options: Record<string, unknown>): Promise<void>;
  canvas: HTMLCanvasElement;
  stage: { addChild(sprite: Sprite): void };
  ticker: { add(fn: (ticker: { deltaMS: number }) => void): void; maxFPS: number };
  start(): void; stop(): void; render(): void;
  destroy(options: { removeView: boolean }, children: { children: boolean }): void;
}
interface Vendor { Application: new () => App; Sprite: new (texture: Texture) => Sprite; Texture: { from(image: HTMLImageElement): Texture } }
export interface CharacterScene { motion(reduced: boolean): void; celebrate(value: boolean): void; destroy(): void }

export function loadCharacterImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const image = new Image();
    const clean = () => { image.onload = null; image.onerror = null; signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); image.src = ''; reject(new DOMException('Aborted', 'AbortError')); };
    image.onload = () => { clean(); resolve(image); };
    image.onerror = () => { clean(); reject(new Error('Character image unavailable')); };
    signal.addEventListener('abort', abort, { once: true });
    image.src = src;
  });
}

export async function createCharacterScene(host: HTMLElement, art: ArtKey, signal: AbortSignal): Promise<CharacterScene> {
  const spec = ART[art];
  const [P, image] = await Promise.all([
    import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Promise<Vendor>,
    loadCharacterImage(artUrl(spec.file), signal),
  ]);
  signal.throwIfAborted();
  const app = new P.Application();
  let ready = false, disposed = false;
  let texture: Texture | undefined;
  let reactionTexture: Texture | undefined;
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    if (ready) app.destroy({ removeView: true }, { children: true });
    texture?.destroy(true);
    reactionTexture?.destroy(true);
  };
  try {
    await app.init({ width: 240, height: 260, backgroundAlpha: 0, antialias: true, autoStart: false,
      preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    ready = true;
    signal.throwIfAborted();
    // Own texture per scene: destroying a portrait never unloads another mounted scene's texture.
    texture = P.Texture.from(image);
    const sprite = new P.Sprite(texture);
    const fit = fitArt(spec, 240, 260);
    sprite.anchor.set(fit.anchorX, fit.anchorY);
    sprite.scale.set(fit.scale * 1254 / image.naturalWidth);
    sprite.x = 120; sprite.y = fit.baseline;
    app.stage.addChild(sprite);
    app.canvas.style.width = '100%'; app.canvas.style.height = '100%';
    host.append(app.canvas);
    app.ticker.maxFPS = 30;
    let time = 0, reduced = false, happy = false, celebration = 9;
    let reaction: Sprite | undefined;
    let blend = 0;
    const draw = () => {
      const sway = 'sway' in spec ? spec.sway : 0;
      const pace = 'pace' in spec ? spec.pace : 1;
      // Rotate around the planted feet; no breathing-scale distortion or endless jumping.
      sprite.rotation = reduced ? 0 : Math.sin(time * pace) * sway;
      sprite.y = fit.baseline;
      if (!reduced && happy && celebration < .8) {
        sprite.rotation += Math.sin(celebration / .8 * Math.PI * 2) * .025;
      }
      sprite.alpha = reaction ? 1 - blend : 1;
      if (reaction) { reaction.alpha = blend; reaction.rotation = sprite.rotation; }
    };
    app.ticker.add(t => {
      const dt = Math.min(t.deltaMS, 50) / 1000; time += dt; celebration += dt;
      blend = happy ? Math.min(1, blend + dt / .24) : Math.max(0, blend - dt / .18);
      draw();
    });
    const reactionKey = REACTIONS[art];
    if (reactionKey) {
      // Optional pose loading never delays or removes the neutral portrait.
      void loadCharacterImage(artUrl(ART[reactionKey].file), signal).then(image => {
        if (disposed || signal.aborted) return;
        reactionTexture = P.Texture.from(image);
        reaction = new P.Sprite(reactionTexture);
        const poseFit = fitArt(ART[reactionKey], 240, 260);
        reaction.anchor.set(poseFit.anchorX, poseFit.anchorY);
        reaction.scale.set(poseFit.scale * 1254 / image.naturalWidth);
        reaction.x = 120; reaction.y = poseFit.baseline;
        app.stage.addChild(reaction);
        blend = happy ? 1 : 0;
        draw(); app.render();
      }).catch(() => { /* Neutral art is the complete fallback. */ });
    }
    draw(); app.render();
    return {
      motion(value) { reduced = value; if (reduced || document.hidden) { celebration = 9; blend = happy ? 1 : 0; } draw(); app.render(); if (reduced || document.visibilityState !== 'visible') app.stop(); else app.start(); },
      celebrate(value) { if (value && !happy) celebration = 0; happy = value; if (reduced || document.hidden) blend = happy ? 1 : 0; draw(); app.render(); },
      destroy,
    };
  } catch (error) { destroy(); throw error; }
}
