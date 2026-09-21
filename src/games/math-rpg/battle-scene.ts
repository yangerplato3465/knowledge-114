import { BALANCE, enemyFor, type Battle } from './battle';
import { frameBounds } from './frame-bounds';
import { artUrl, heroSheet, enemySheet, HERO_ACTIONS, ENEMY_ACTIONS, EFFECTS, REGIONS, SCENE_SIZE, visualEvents, attackArt, type VisualEvent } from './battle-art';

// A narrow contract keeps the local vendor out of the homepage module graph.
interface Point { set(x: number, y?: number): void }
interface Node { x: number; y: number; alpha: number; visible: boolean; scale: Point }
interface Texture { width: number; source: { scaleMode: string }; destroy(): void }
interface Sprite extends Node { texture: Texture; tint: number; anchor: Point }
interface Graphic extends Node { clear(): Graphic; rect(x: number, y: number, w: number, h: number): Graphic; ellipse(x: number, y: number, w: number, h: number): Graphic; poly(points: number[]): Graphic; fill(color: number | { color: number; alpha: number }): Graphic }
interface Label extends Node { text: string; anchor: Point; style: { fill: number } }
interface App {
  init(options: Record<string, unknown>): Promise<void>; canvas: HTMLCanvasElement;
  stage: { y: number; addChild(...nodes: Node[]): void }; ticker: { add(fn: (ticker: { deltaMS: number }) => void): void; maxFPS: number };
  start(): void; stop(): void; render(): void;
  destroy(options: { removeView: boolean }, children: { children: boolean }): void;
}
interface Vendor {
  Application: new () => App; Graphics: new () => Graphic; Sprite: new (options: { texture: Texture }) => Sprite;
  Texture: new (options: { source: Texture['source']; frame: unknown; orig: unknown; trim: unknown }) => Texture;
  Rectangle: new (x: number, y: number, width: number, height: number) => unknown;
  Text: new (options: Record<string, unknown>) => Label;
  Assets: { load(url: string): Promise<Texture> };
}
export interface Scene { update(state: Battle): void; motion(reduced: boolean): void; destroy(): void }

export async function createScene(host: HTMLElement, initial: Battle, signal: AbortSignal): Promise<Scene> {
  const url = `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`;
  const P = await import(/* @vite-ignore */ url) as Vendor;
  signal.throwIfAborted();
  const app = new P.Application();
  const slices: Texture[] = [];
  let initialized = false, disposed = false;
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener('abort', destroy);
    if (initialized) app.destroy({ removeView: true }, { children: true });
    slices.forEach(texture => texture.destroy());
  };
  try {
    await app.init({ width: SCENE_SIZE.width, height: SCENE_SIZE.height, backgroundAlpha: 0, antialias: false, autoStart: false, preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    initialized = true; signal.throwIfAborted();
    signal.addEventListener('abort', destroy, { once: true });
    const frames = new Map<string, Texture[]>();
    const paths = [...HERO_ACTIONS.map(heroSheet), ...ENEMY_ACTIONS.map(a => enemySheet(initial.stage, initial.route[initial.stage], a)), ...EFFECTS.map(a => `effects/${a}/${a}-v1`)];
    // A bounded shared cache retains battle sheets, never large masters/references.
    const textures = await Promise.all(paths.map(path => P.Assets.load(artUrl(path))));
    signal.throwIfAborted();
    textures.forEach((texture, i) => {
      texture.source.scaleMode = 'nearest';
      const cells = Array.from({ length: texture.width / 128 }, (_, index) => {
        const { left, width } = frameBounds(paths[i], index);
        return new P.Texture({ source: texture.source,
          frame: new P.Rectangle(index * 128 + left, 0, width, 128),
          orig: new P.Rectangle(0, 0, 128, 128), trim: new P.Rectangle(left, 0, width, 128) });
      });
      slices.push(...cells); frames.set(paths[i], cells);
    });
    const region = REGIONS[initial.stage];
    const attackStyle = attackArt(initial);
    // Reserve a clear band above the actors for the accessible DOM combat HUD.
    app.stage.y = SCENE_SIZE.actorOffset;
    const scenery = new P.Graphics().rect(0, -SCENE_SIZE.actorOffset, SCENE_SIZE.width, SCENE_SIZE.height).fill(region.sky);
    scenery.rect(498, 23, 34, 34).fill(0xfff6d4).rect(490, 31, 50, 18).fill(0xfff6d4);
    for (let i = 0; i < 7; i++) {
      const x = i * 112 - 50, top = 70 + (i % 3) * 15;
      scenery.poly([x, 170, x, top + 22, x + 28, top + 22, x + 28, top, x + 65, top, x + 65, top + 18, x + 100, top + 18, x + 130, 170]).fill(region.back);
    }
    for (let i = 0; i < 9; i++) {
      const x = i * 90 - 50;
      scenery.rect(x, 124 + i % 3 * 8, 78, 67).fill(region.hill);
      if (initial.stage === 1) scenery.rect(x + 32, 95, 10, 60).fill(region.ground).rect(x + 10, 82, 54, 27).fill(region.hill);
      if (initial.stage >= 3) scenery.rect(x + 28, 88 + i % 2 * 14, 19, 80).fill(region.back).rect(x + 23, 87 + i % 2 * 14, 29, 8).fill(region.hill);
    }
    scenery.rect(0, 181, 640, 39).fill(region.ground).rect(0, 181, 640, 4).fill(region.hill);
    scenery.poly([265, 185, 383, 185, 461, 220, 186, 220]).fill({ color: 0xffe8bb, alpha: .24 });
    for (let i = 0; i < 32; i++) {
      scenery.rect((i * 83) % 640, 191 + i % 4 * 7, 7, 2).fill({ color: 0xffffff, alpha: .15 });
      if (i % 3 === 0) scenery.rect((i * 79) % 640, 177, 3, 4).fill(region.accent);
    }
    const shadows = new P.Graphics().ellipse(170, 184, 40, 6).fill({ color: 0x183c35, alpha: .2 }).ellipse(470, 184, 43, 6).fill({ color: 0x183c35, alpha: .2 });
    const sprite = (path: string) => { const s = new P.Sprite({ texture: frames.get(path)![0] }); s.anchor.set(.5, 0); s.scale.set(1.5); return s; };
    const hero = sprite(heroSheet('idle')), enemy = sprite(enemySheet(initial.stage, initial.route[initial.stage], 'idle'));
    const effect = sprite('effects/hit-spark/hit-spark-v1'); effect.visible = false;
    const burst = sprite('effects/correct-burst/correct-burst-v1'); burst.visible = false;
    const signature = new P.Graphics();
    const label = new P.Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 24, fontWeight: '900', fill: 0x194d43, stroke: { color: 0xffffff, width: 4 } } });
    label.anchor.set(.5); label.visible = false;
    const motes = Array.from({ length: 10 }, (_, i) => new P.Graphics().rect(i * 67 + 12, 20 + i % 4 * 26, 2, 2).fill({ color: 0xffffff, alpha: .7 }));
    app.stage.addChild(scenery, ...motes, shadows, hero, enemy, effect, signature, burst, label);
    app.canvas.style.width = '100%'; app.canvas.style.height = '100%';
    host.append(app.canvas);
    let state = initial, previous = initial, time = 0, phaseTime = 0, reduced = false;
    let active: VisualEvent | undefined, elapsed = 0;
    const queue: VisualEvent[] = initial.stage > 0 ? [{ kind: 'restore', amount: 0 }] : [];
    const pose = (target: Sprite, path: string, seconds: number, loop = true, fps = 8) => {
      const cells = frames.get(path)!;
      const index = reduced ? (loop ? 0 : Math.min(1, cells.length - 1)) : loop ? Math.floor(seconds * fps) % cells.length : Math.min(cells.length - 1, Math.floor(seconds * fps));
      target.texture = cells[index];
    };
    const draw = (dt: number) => {
      time += dt; phaseTime += dt;
      if (!active && queue.length) { active = queue.shift(); elapsed = 0; }
      if (active) elapsed += dt;
      if (active && elapsed >= .72) { active = undefined; elapsed = 0; }
      hero.x = 170; hero.y = 17; hero.tint = 0xffffff;
      enemy.x = 470; enemy.y = 21; enemy.tint = 0xffffff;
      effect.visible = false; effect.alpha = 1; effect.tint = 0xffffff; effect.scale.set(1.5); burst.visible = false; label.visible = false;
      burst.scale.set(1.5); burst.alpha = 1;
      signature.clear();
      const warning = state.lastCorrect === false || enemyFor(state).interval - state.charge <= BALANCE.warning;
      const enemyAction = state.enemyHp <= 0 ? 'defeat' : warning ? 'charge' : 'idle';
      pose(hero, heroSheet(state.hp <= 0 ? 'defeat' : state.phase === 'won' || state.phase === 'growth' ? 'victory' : 'idle'), phaseTime, state.hp > 0 && state.phase !== 'won' && state.phase !== 'growth', 5);
      pose(enemy, enemySheet(state.stage, state.route[state.stage], enemyAction), time, enemyAction !== 'defeat', 5);
      if (warning && state.enemyHp > 0 && !reduced) {
        const name = state.lastCorrect === false ? 'wrong-warning' : 'charge-aura';
        effect.visible = true; effect.x = enemy.x; effect.y = 20; effect.alpha = .65;
        effect.tint = attackStyle.color;
        pose(effect, `effects/${name}/${name}-v1`, time, true, 4);
      }
      motes.forEach((mote, i) => { mote.y = reduced ? 0 : Math.sin(time * .7 + i) * 4; });
      if (active) {
        const attack = active.kind === 'attack', heal = active.kind === 'restore', strike = elapsed >= .14;
        const lunge = reduced ? 0 : elapsed < .15 ? elapsed / .15 : elapsed < .3 ? 1 : Math.max(0, 1 - (elapsed - .3) / .22);
        if (heal) pose(hero, heroSheet('restore'), elapsed, false);
        else if (attack) {
          hero.x += lunge * 160; pose(hero, heroSheet('attack'), elapsed, false, 9);
          pose(enemy, enemySheet(state.stage, state.route[state.stage], strike ? state.enemyHp <= 0 ? 'defeat' : 'hurt' : 'idle'), Math.max(0, elapsed - .14), false);
          if (strike && !reduced) enemy.x += Math.sin(Math.min(1, (elapsed - .14) / .4) * Math.PI) * 10;
        } else {
          enemy.x -= lunge * attackStyle.lunge;
          if (!reduced) enemy.y -= Math.sin(lunge * Math.PI / 2) * attackStyle.lift;
          pose(enemy, enemySheet(state.stage, state.route[state.stage], 'attack'), elapsed, false);
          pose(hero, heroSheet(strike ? state.hp <= 0 ? 'defeat' : 'hurt' : 'idle'), Math.max(0, elapsed - .14), false);
          if (strike && !reduced) hero.x -= Math.sin(Math.min(1, (elapsed - .14) / .4) * Math.PI) * 8;
        }
        if (strike || heal) {
          const name = heal ? 'heal-ring' : attack ? 'sword-slash' : attackStyle.effect;
          effect.visible = !reduced && elapsed < .5; effect.x = attack ? enemy.x - 25 : hero.x + 10; effect.y = 20;
          effect.alpha = 1;
          pose(effect, `effects/${name}/${name}-v1`, Math.max(0, elapsed - .14), false, 10);
          if (!heal && !attack) {
            effect.tint = attackStyle.color;
            if (['splash', 'fang', 'vine', 'slash'].includes(attackStyle.kind)) effect.visible = false;
            if (attackStyle.kind === 'club' || attackStyle.kind === 'ram') { effect.scale.set(1); effect.alpha = .8; }
            // Distinct silhouettes accompany the reusable sheets: droplets, fangs,
            // vines, dust, twin blades, flame, lightning and three void claws.
            if (!reduced && elapsed < .6) {
              const x = hero.x + 20, y = 105, spread = (elapsed - .14) * 65;
              const paint = { color: attackStyle.color, alpha: Math.max(0, 1 - (elapsed - .14) / .46) };
              switch (attackStyle.kind) {
                case 'splash':
                  signature.ellipse(x, y, 22 + spread, 10).fill({ color: attackStyle.color, alpha: paint.alpha * .35 });
                  for (let i = 0; i < 6; i++) signature.ellipse(x + Math.cos(i) * (12 + spread), y + Math.sin(i) * (15 + spread), 4, 6).fill(paint);
                  break;
                case 'fang':
                  for (const offset of [-12, 12]) {
                    signature.poly([x + offset - 8, y - 19, x + offset + 8, y - 19, x + offset, y + 16]).fill(paint);
                    signature.poly([x + offset - 4, y - 16, x + offset + 4, y - 16, x + offset, y + 7]).fill({ color: 0xfff9eb, alpha: paint.alpha });
                  }
                  break;
                case 'vine':
                  for (const offset of [-16, 14]) signature.poly([x - 26, y + offset + 12, x, y + offset - 7, x + 27, y + offset, x + 4, y + offset + 4, x - 12, y + offset + 19]).fill(paint);
                  break;
                case 'slash': case 'void':
                  for (let i = 0; i < (attackStyle.kind === 'void' ? 3 : 2); i++) signature.poly([x - 28 + i * 17, y + 28, x + 13 + i * 17, y - 30, x + 5 + i * 17, y + 2]).fill(paint);
                  break;
                case 'lightning': case 'storm':
                  for (let i = 0; i < 2; i++) {
                    const start = attackStyle.kind === 'storm' ? enemy.x - 25 : x + 66;
                    const offset = i * 24;
                    signature.poly([start, y - 20 + offset, x + 22, y - 6 + offset, x + 44, y + 4 + offset, x - 22, y + 20 + offset, x + 10, y + 3 + offset, x - 4, y - 7 + offset]).fill(paint);
                  }
                  break;
                case 'fire':
                  for (let i = 0; i < 5; i++) signature.poly([x - 35 + i * 15, y + 25, x - 29 + i * 15, y - 25 - i % 2 * 10, x - 20 + i * 15, y + 21]).fill(paint);
                  break;
                default:
                  for (let i = 0; i < 6; i++) signature.rect(x - 30 + i * 13 + (i % 2 ? spread : -spread), 168 - i % 3 * spread / 2, 7, 5).fill(paint);
                  if (attackStyle.kind === 'ram') for (let i = 0; i < 3; i++) signature.rect(enemy.x + 35, 110 + i * 17, 35, 3).fill(paint);
              }
              // Armour is a separate overlay, so it never replaces the monster's attack.
              if (state.guard > 0) {
                burst.visible = elapsed < .5; burst.x = hero.x - 35; burst.y = 100;
                burst.scale.set(.65); burst.alpha = .8;
                pose(burst, 'effects/guard-flash/guard-flash-v1', elapsed - .14, false, 10);
              }
            }
          }
          if (attack && !reduced) {
            const sparkle = elapsed < .4 ? 'hit-spark' : 'correct-burst';
            burst.visible = elapsed < .68; burst.x = elapsed < .4 ? enemy.x : hero.x; burst.y = 20;
            pose(burst, `effects/${sparkle}/${sparkle}-v1`, Math.max(0, elapsed - (elapsed < .4 ? .14 : .4)), false, 12);
          }
          label.visible = true; label.text = heal && active.amount === 0 ? '恢復力量' : `${heal ? '+' : '−'}${active.amount}`;
          label.x = attack ? 470 : 170; label.y = reduced ? 38 : 48 - elapsed * 25;
          label.alpha = reduced ? 1 : Math.min(1, (.72 - elapsed) * 5);
          label.style.fill = heal ? 0x217259 : attack ? 0x194d43 : 0x9f3748;
        }
      }
    };
    app.ticker.maxFPS = 60;
    app.ticker.add(ticker => draw(Math.min(ticker.deltaMS / 1000, .05)));
    draw(0); app.render();
    const sync = () => { if (state.paused || document.visibilityState !== 'visible') app.stop(); else app.start(); };
    const scene: Scene = {
      update(next) { queue.push(...visualEvents(previous, next)); if (next.phase !== state.phase) phaseTime = 0; previous = next; state = next; if (queue.length > 4) queue.splice(0, queue.length - 4); sync(); },
      motion(value) { reduced = value; draw(0); app.render(); }, destroy,
    };
    sync(); return scene;
  } catch (error) { destroy(); throw error; }
}
