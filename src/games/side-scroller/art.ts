import type { Node, Pixi, Sprite, Texture } from '../magic-workshop/scene-types';
import metadata from '../../../assets/images/side-scroller/sprites-v1.json';
import type { State } from './model';

export const SPRITES = metadata.animations;
export type AnimationName = keyof typeof SPRITES;
interface Frame { texture: Texture; time: number }
export interface Animation extends Sprite {
  textures: Frame[]; currentFrame: number;
  play(): void; gotoAndStop(frame: number): void; gotoAndPlay(frame: number): void;
  update(ticker: { deltaTime: number }): void;
}
export type ArtPixi = Omit<Pixi, 'Texture'> & {
  Rectangle: new (x: number, y: number, width: number, height: number) => unknown;
  Texture: { new (options: { source: unknown; frame: unknown }): Texture; from(image: HTMLImageElement): Texture & { source: unknown } };
  AnimatedSprite: new (options: { textures: Frame[]; autoUpdate: boolean; autoPlay: boolean; loop: boolean }) => Animation;
};
export function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => { image.onload = image.onerror = null; signal.removeEventListener('abort', aborted); };
    const aborted = () => { cleanup(); image.src = ''; reject(signal.reason); };
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error(`素材載入失敗：${url}`)); };
    signal.addEventListener('abort', aborted, { once: true }); image.src = url;
  });
}
export async function loadSpriteImages(signal: AbortSignal) {
  const names = Object.keys(SPRITES) as AnimationName[];
  const images = await Promise.all(names.map(name => loadImage(`${import.meta.env.BASE_URL}${SPRITES[name].file}`, signal)));
  return Object.fromEntries(names.map((name, i) => [name, images[i]])) as Record<AnimationName, HTMLImageElement>;
}
// Scene-owned images keep the existing abort/unmount isolation, without sharing a global texture cache.
export function createSpriteArt(P: ArtPixi, images: Record<AnimationName, HTMLImageElement>) {
  const bases: Texture[] = [], frames: Texture[] = [];
  const sequences = {} as Record<AnimationName, Frame[]>;
  for (const name of Object.keys(SPRITES) as AnimationName[]) {
    const spec = SPRITES[name], base = P.Texture.from(images[name]); bases.push(base);
    sequences[name] = Array.from({ length: spec.frames }, (_, i) => {
      const texture = new P.Texture({ source: base.source, frame: new P.Rectangle(i % spec.columns * 256, Math.floor(i / spec.columns) * 256, 256, 256) });
      frames.push(texture); return { texture, time: spec.durationsMs[i] };
    });
  }
  return {
    sequences,
    create(name: AnimationName) {
      const sprite = new P.AnimatedSprite({ textures: sequences[name], autoUpdate: false, autoPlay: true, loop: name !== 'jump' });
      const anchor = SPRITES[name].anchor; sprite.anchor.set(anchor[0] / 256, anchor[1] / 256); return sprite;
    },
    destroy() { frames.forEach(texture => texture.destroy(false)); bases.forEach(texture => texture.destroy(true)); },
  };
}
export type SpriteArt = ReturnType<typeof createSpriteArt>;

export function jumpFrame(vy: number, airborneSeconds: number): number {
  if (vy < 0 && airborneSeconds < 0.055) return 0;
  if (vy < -380) return 1;
  if (vy < -110) return 2;
  if (vy < 110) return 3;
  if (vy < 380) return 4;
  return 5;
}
export function createMilo(P: ArtPixi, art: SpriteArt, parent: Node) {
  const sprite = art.create('run'); sprite.scale.set(0.5); parent.addChild(sprite);
  let action: 'run' | 'jump' = 'run', wasGrounded = true, airAge = 0, landAge = 1;
  const change = (next: 'run' | 'jump') => {
    if (action === next) return; action = next; sprite.textures = art.sequences[next];
    if (next === 'run') sprite.gotoAndPlay(0);
  };
  return {
    sprite,
    reset() { wasGrounded = true; airAge = 0; landAge = 1; change('run'); sprite.gotoAndPlay(0); sprite.alpha = 1; sprite.scale.set(0.5); },
    update(state: Pick<State, 'grounded' | 'vy'>, dt: number, reduced = false) {
      if (!state.grounded) {
        airAge = wasGrounded ? 0 : airAge + dt; landAge = 0;
        change('jump'); sprite.gotoAndStop(jumpFrame(state.vy, airAge));
      } else {
        landAge = wasGrounded ? landAge + dt : 0; airAge = 0;
        if (landAge < 0.085) { change('jump'); sprite.gotoAndStop(landAge < 0.045 ? 6 : 7); }
        else { change('run'); if (reduced) sprite.gotoAndStop(0); else { sprite.play(); sprite.update({ deltaTime: dt * 60 }); } }
      }
      wasGrounded = state.grounded;
    },
  };
}
