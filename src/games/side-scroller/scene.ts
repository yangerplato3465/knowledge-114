import type { App, Node, Sprite, Texture } from '../magic-workshop/scene-types';
import { advance, EXIT, GHOST_ALPHA, initialState, PHYSICS, PLATFORMS, selectWorldColor, surfaceY, toggleColor, WORLD_WIDTH, type ColorButton, type Platform, type WorldColor } from './model';

import { createMilo, createSpriteArt, loadImage, loadSpriteImages, type ArtPixi } from './art';

export type SceneMode = 'preview' | 'play';
type Action = 'jump';
export interface SceneStatus { mode: SceneMode; paused: boolean; completed: boolean; checkpoint: number; falls: number; lap: number; color: WorldColor | null }
export interface SideScrollerScene {
  hold(action: Action, held: boolean, source: string): void;
  tap(action: Action): void;
  setMode(mode: SceneMode): void;
  toggleColor(button: ColorButton): void;
  togglePause(): void;
  setTutorial(open: boolean): void;
  restart(): void;
  destroy(): void;
}
const HEIGHT = 600, TILE = 64;
const LIGHT_ALPHA = 0.08;
const LIGHT_COLORS = { red: 0xff596e, blue: 0x477dff, purple: 0xb968f0 };
interface ColorFilter { matrix: number[]; destroy(): void }
export type ColorPixi = ArtPixi & { ColorMatrixFilter: new () => ColorFilter };
export function colorMatrix(color: WorldColor, alpha: number) {
  const channels = color === 'red' ? [1.45, 0.34, 0.42] : color === 'blue' ? [0.3, 0.76, 1.55] : [1.0, 0.42, 1.5];
  return [...channels.flatMap(value => [0.299 * value, 0.587 * value, 0.114 * value, 0, 0]), 0, 0, 0, alpha, 0];
}
const ASSETS = ['background_clouds', 'background_fade_hills', 'background_fade_trees',
  'terrain_sand_block_top', 'terrain_sand_block_center', 'terrain_sand_horizontal_left',
  'terrain_sand_horizontal_middle', 'terrain_sand_horizontal_right'] as const;

export async function createSideScroller(host: HTMLElement, signal: AbortSignal, onStatus: (status: SceneStatus) => void): Promise<SideScrollerScene> {
  const P = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as ColorPixi;
  const [images, spriteImages] = await Promise.all([
    Promise.all(ASSETS.map(name => loadImage(`${import.meta.env.BASE_URL}assets/images/side-scroller/kenney/${name}.png`, signal))),
    loadSpriteImages(signal),
  ]);
  signal.throwIfAborted();
  const textures = {} as Record<typeof ASSETS[number], Texture>;
  ASSETS.forEach((name, i) => { textures[name] = P.Texture.from(images[i]); });
  const art = createSpriteArt(P, spriteImages);
  const app: App = new P.Application();
  const filters = { red: new P.ColorMatrixFilter(), blue: new P.ColorMatrixFilter(), purple: new P.ColorMatrixFilter() };
  let initialized = false;
  const dispose = () => { if (initialized) app.destroy({ removeView: true }, { children: true }); art.destroy(); Object.values(filters).forEach(filter => filter.destroy()); Object.values(textures).forEach(texture => texture.destroy(true)); };
  try {
    await app.init({ width: 1067, height: HEIGHT, background: 0xc3e3ff, antialias: true, autoStart: false,
      sharedTicker: false, preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    initialized = true;
    signal.throwIfAborted();
    const clouds = new P.Container(), hills = new P.Container(), trees = new P.Container(), neutralWorld = new P.Container(), light = new P.Graphics(), world = new P.Container();
    // Full viewport light washes the scenery; special terrain stays above it, preserving its exact tint and opacity.
    [clouds, hills, trees, neutralWorld, light, world].forEach(layer => app.stage.addChild(layer));
    // White areas of the original backgrounds let the lower layer show through.
    (hills as Node & { blendMode: string }).blendMode = 'multiply';
    (trees as Node & { blendMode: string }).blendMode = 'multiply';
    hills.alpha = 0.55; trees.alpha = 0.7;
    const terrainNodes: { node: Node; x: number; end: number }[] = [];
    const sprite = (name: typeof ASSETS[number], x: number, y: number, w: number, h: number, parent: Node) => {
      const s = new P.Sprite(textures[name]); s.position.set(x, y); s.width = w; s.height = h; parent.addChild(s); return s;
    };
    const grounds = PLATFORMS.filter(p => p.kind === 'ground');
    const markColor = (p: Platform, group: Node) => {
      if (!p.color) return;
      const marks = new P.Graphics();
      for (let x = p.x + TILE; x < p.x + p.w; x += TILE * 2) {
        const y = surfaceY(p, x) + 16;
        if (p.color === 'red') marks.poly([x, y - 7, x + 7, y + 6, x - 7, y + 6]);
        else if (p.color === 'blue') marks.circle(x, y, 7);
        else marks.poly([x, y - 8, x + 8, y, x, y + 8, x - 8, y]);
        marks.fill(0xffffff).stroke({ color: 0x302943, width: 2 });
      }
      group.addChild(marks);
    };
    for (const p of PLATFORMS) {
      const group = new P.Container(); (p.color ? world : neutralWorld).addChild(group); terrainNodes.push({ node: group, x: p.x, end: p.x + p.w });
      // Filter the assembled terrain once, so overlapping tiles keep a uniform ghost opacity.
      if (p.color) (group as Node & { filters: ColorFilter[] }).filters = [filters[p.color]];
      if (p.kind === 'bridge') {
        for (let x = p.x; x < p.x + p.w; x += TILE) {
          const part = x === p.x ? 'left' : x + TILE >= p.x + p.w ? 'right' : 'middle';
          sprite(`terrain_sand_horizontal_${part}`, x, p.y, TILE, p.h, group);
        }
        markColor(p, group); continue;
      }
      const bottom = p.y + p.h, endY = p.endY ?? p.y;
      const clip = new P.Graphics().poly([p.x, p.y, p.x + p.w, endY, p.x + p.w, bottom, p.x, bottom]).fill(0xffffff);
      group.addChild(clip);
      const tiles = new P.Container(); tiles.mask = clip; group.addChild(tiles);
      for (let y = Math.min(p.y, endY); y < bottom; y += TILE) {
        for (let x = p.x; x < p.x + p.w; x += TILE) sprite('terrain_sand_block_center', x, y, TILE, TILE, tiles);
      }
      // Shear each top tile along the exact collision surface, including gentle slopes.
      for (let x = p.x; x < p.x + p.w; x += TILE) {
        const left = surfaceY(p, x), right = surfaceY(p, x + TILE);
        const top = new P.MeshSimple({ texture: textures.terrain_sand_block_top,
          vertices: new Float32Array([x, left, x + TILE, right, x + TILE, right + TILE, x, left + TILE]),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) });
        tiles.addChild(top);
      }
      const edges = new P.Graphics();
      const before = grounds.find(other => other.x + other.w === p.x);
      const after = grounds.find(other => other.x === p.x + p.w);
      if (p.x > 0 && (!before || p.y < (before.endY ?? before.y))) {
        edges.moveTo(p.x + 2, p.y).lineTo(p.x + 2, before ? Math.min(bottom, before.endY ?? before.y) : bottom).stroke({ color: 0x38313d, width: 4 });
      }
      if (p.x + p.w < WORLD_WIDTH && (!after || endY < after.y)) {
        edges.moveTo(p.x + p.w - 2, endY).lineTo(p.x + p.w - 2, after ? Math.min(bottom, after.y) : bottom).stroke({ color: 0x38313d, width: 4 });
      }
      group.addChild(edges);
      markColor(p, group);
    }
    const portal = art.create('portal'); portal.scale.set(0.8); portal.position.set(EXIT.x, EXIT.y); neutralWorld.addChild(portal);
    const milo = createMilo(P, art, neutralWorld), player = milo.sprite; player.visible = false;
    let tutorialOpen = true, finishAge = 0;
    let state = initialState(), previous = state, accumulator = 0, camera = 0, viewportWidth = 1067, previewTravel = 0;
    let mode: SceneMode = 'preview', paused = false, destroyed = false, lap = 1, lastStatus = '';
    const held = new Set<string>(); let tapTimer: number | undefined; let jumpPressed = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches;
    const backgroundLayers = [
      { node: clouds, name: 'background_clouds' as const, width: 768, height: 600, y: 0, factor: 0.12, sprites: [] as Sprite[] },
      { node: hills, name: 'background_fade_hills' as const, width: 768, height: 380, y: 250, factor: 0.22, sprites: [] as Sprite[] },
      { node: trees, name: 'background_fade_trees' as const, width: 640, height: 340, y: 300, factor: 0.38, sprites: [] as Sprite[] },
    ];
    const emit = () => {
      const status = { mode, paused, completed: mode === 'play' && state.completed && finishAge >= 0.6, checkpoint: state.checkpoint, falls: state.falls, lap, color: state.color };
      const serialized = JSON.stringify(status);
      if (serialized !== lastStatus) { lastStatus = serialized; onStatus(status); }
    };
    const release = () => { held.clear(); jumpPressed = false; if (tapTimer !== undefined) window.clearTimeout(tapTimer); tapTimer = undefined; };
    const draw = () => {
      world.x = neutralWorld.x = -camera;
      terrainNodes.forEach(({ node, x, end }) => { node.visible = end >= camera - TILE && x <= camera + viewportWidth + TILE; });
      backgroundLayers.forEach(layer => layer.sprites.forEach((s, i) => {
        s.x = i * layer.width - (camera * (reduced ? 0 : layer.factor)) % layer.width;
      }));
      const mix = paused || state.completed ? 1 : accumulator / PHYSICS.step;
      player.position.set(previous.x + (state.x - previous.x) * mix, previous.y + (state.y - previous.y) * mix);
      if (state.completed) {
        const progress = Math.min(1, finishAge / 0.6), eased = progress * progress * (3 - 2 * progress);
        player.x += (EXIT.x - player.x) * eased; player.y += (EXIT.y + 30 - player.y) * eased;
        player.scale.set(0.5 * (1 - eased * 0.65)); player.alpha = 1 - eased;
      }
      portal.visible = EXIT.x + 110 >= camera && EXIT.x - 110 <= camera + viewportWidth;
      player.visible = mode === 'play';
    };
    const paintLight = () => {
      light.clear();
      if (state.color) light.rect(0, 0, viewportWidth, HEIGHT).fill({ color: LIGHT_COLORS[state.color], alpha: LIGHT_ALPHA });
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      viewportWidth = HEIGHT * bounds.width / Math.max(1, bounds.height);
      app.renderer.resize(viewportWidth, HEIGHT); app.canvas.style.width = app.canvas.style.height = '100%';
      backgroundLayers.forEach(layer => {
        layer.node.removeChildren().forEach(node => node.destroy());
        layer.sprites = Array.from({ length: Math.ceil(viewportWidth / layer.width) + 1 }, (_, i) => sprite(layer.name, i * layer.width, layer.y, layer.width + 1, layer.height, layer.node));
      });
      camera = Math.max(0, Math.min(camera, WORLD_WIDTH - viewportWidth)); paintLight(); draw(); app.render();
    };
    const stage = host.parentElement!;
    const updateColors = () => {
      for (const color of ['red', 'blue', 'purple'] as const) filters[color].matrix = colorMatrix(color, state.color === color ? 1 : GHOST_ALPHA);
      paintLight();
    };
    const toggleLight = (button: ColorButton) => {
      if (destroyed || tutorialOpen || (mode === 'play' && (paused || state.completed))) return;
      state = selectWorldColor(state, toggleColor(state.color, button)); previous = state;
      updateColors(); draw(); if (paused) app.render(); emit();
    };
    const togglePause = () => { if (destroyed || tutorialOpen) return; paused = !paused; release(); accumulator = 0; previous = state; emit(); };
    const reset = (preserveColor = false) => { release(); milo.reset(); finishAge = 0; const color = state.color; state = initialState(); if (preserveColor) state.color = color; previous = state; paused = false; camera = previewTravel = accumulator = 0; lap = 1; updateColors(); draw(); emit(); };
    const keydown = (event: KeyboardEvent) => {
      if (tutorialOpen || (event.target as HTMLElement).closest('button,a,input,select,dialog')) return;
      if (!event.repeat && ['1', '2'].includes(event.key)) { event.preventDefault(); toggleLight(event.key === '1' ? 'red' : 'blue'); }
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code) || [' ', 'Space', 'ArrowUp', 'w', 'W'].includes(event.key)) {
        event.preventDefault();
        if (!paused && mode === 'play') { held.add(event.code || event.key); if (!event.repeat) jumpPressed = true; }
      }
      if ((event.code === 'KeyP' || event.key === 'p' || event.key === 'P' || event.key === 'Escape') && !event.repeat) { event.preventDefault(); togglePause(); }
    };
    const keyup = (event: KeyboardEvent) => { if (held.delete(event.code || event.key)) event.preventDefault(); };
    const focus = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest('button,a')) stage.focus({ preventScroll: true }); };
    const focusout = (event: FocusEvent) => { if (!stage.contains(event.relatedTarget as globalThis.Node | null)) release(); };
    const blur = () => { release(); paused = true; accumulator = 0; previous = state; emit(); };
    const visibility = () => { if (document.hidden) blur(); };
    const motionChanged = () => { reduced = motion.matches; };
    const observer = new ResizeObserver(resize);
    const tick = (ticker: { deltaMS: number }) => {
      const dt = Math.min(0.1, ticker.deltaMS / 1000);
      if (!paused && !tutorialOpen) {
        if (mode === 'preview') {
          const limit = Math.max(0, WORLD_WIDTH - viewportWidth);
          previewTravel += PHYSICS.speed * dt;
          if (previewTravel > limit + PHYSICS.speed) { previewTravel = 0; lap++; }
          camera = Math.min(limit, previewTravel);
        } else if (!state.completed) {
          accumulator += dt;
          while (accumulator >= PHYSICS.step) {
            previous = state;
            state = advance(state, { jump: jumpPressed || held.size > 0 }, PHYSICS.step);
            jumpPressed = false;
            if (state.falls !== previous.falls) { previous = state; milo.reset(); }
            accumulator -= PHYSICS.step;
          }
          camera = Math.max(0, Math.min(WORLD_WIDTH - viewportWidth, state.x - viewportWidth * 0.28));
        }
      }
      if (!paused && !tutorialOpen) {
        if (!reduced) portal.update({ deltaTime: dt * 60 });
        if (mode === 'play') {
          if (state.completed) finishAge = Math.min(0.6, finishAge + dt);
          else milo.update(state, dt, reduced);
        }
      }
      draw(); emit();
    };
    updateColors(); host.append(app.canvas); resize(); observer.observe(host);
    stage.addEventListener('keydown', keydown); stage.addEventListener('keyup', keyup); stage.addEventListener('pointerdown', focus);
    stage.addEventListener('focusout', focusout); window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', motionChanged);
    app.ticker.add(tick); app.ticker.maxFPS = 60; app.start(); emit();
    return {
      hold(_action, active, source) {
        if (destroyed) return;
        if (active && !tutorialOpen && !paused && !state.completed && mode === 'play') { if (!held.has(source)) jumpPressed = true; held.add(source); }
        else held.delete(source);
      },
      tap() {
        if (destroyed || tutorialOpen || paused || state.completed || mode !== 'play') return;
        jumpPressed = true; held.add('tap'); if (tapTimer !== undefined) window.clearTimeout(tapTimer);
        tapTimer = window.setTimeout(() => { held.delete('tap'); tapTimer = undefined; }, 100);
      },
      setMode(next) { if (destroyed) return; mode = next; reset(true); },
      setTutorial(open) { if (destroyed) return; tutorialOpen = open; release(); accumulator = 0; previous = state; },
      toggleColor: toggleLight,
      togglePause,
      restart() { if (!destroyed) reset(); },
      destroy() {
        if (destroyed) return; destroyed = true; release(); observer.disconnect();
        stage.removeEventListener('keydown', keydown); stage.removeEventListener('keyup', keyup); stage.removeEventListener('pointerdown', focus);
        stage.removeEventListener('focusout', focusout); window.removeEventListener('blur', blur);
        document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', motionChanged); dispose();
      },
    };
  } catch (error) { dispose(); throw error; }
}
