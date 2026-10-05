import type { App, Label, Node, Pixi } from '../magic-workshop/scene-types';
import { advance, BODY, CHECKPOINTS, GOAL, initialState, PHYSICS, PLATFORMS, STARS, WORLD_WIDTH } from './model';

type Action = 'left' | 'right' | 'run' | 'jump';
export interface SceneStatus { paused: boolean; completed: boolean; stars: number; checkpoint: number; falls: number }
export interface SideScrollerScene {
  hold(action: Action, held: boolean, source: string): void;
  tap(action: Action): void;
  togglePause(): void;
  restart(): void;
  destroy(): void;
}
const C = { sky: 0x242743, paper: 0xffecc8, gold: 0xf4cb75, soil: 0x4d3949, edge: 0x8eb8a0, wood: 0x9c755e };
const HEIGHT = 600;

export async function createSideScroller(host: HTMLElement, signal: AbortSignal, onStatus: (status: SceneStatus) => void): Promise<SideScrollerScene> {
  const P = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Pixi;
  signal.throwIfAborted();
  const app: App = new P.Application();
  let initialized = false;
  try {
    await app.init({ width: 1067, height: HEIGHT, background: C.sky, antialias: true, autoStart: false,
      sharedTicker: false, preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    initialized = true;
    signal.throwIfAborted();
    const sky = new P.Container(), distant = new P.Container(), near = new P.Container(), world = new P.Container(), hud = new P.Container();
    [sky, distant, near, world, hud].forEach(layer => app.stage.addChild(layer));
    const skyPaint = new P.Graphics(); sky.addChild(skyPaint);
    const moon = new P.Graphics().circle(0, 0, 34).fill({ color: C.paper, alpha: 0.12 }).circle(0, 0, 23).fill(0xf5dfb7);
    moon.position.set(800, 135); sky.addChild(moon);

    const mountains = new P.Graphics(); distant.addChild(mountains);
    for (let x = -450; x < WORLD_WIDTH; x += 350) {
      mountains.poly([x, 480, x + 190, 245 + (x % 3) * 20, x + 440, 480]).fill(x % 2 ? 0x4b526d : 0x555971);
      mountains.poly([x, 480, x + 230, 330, x + 510, 480]).fill(0x3a4e5b);
    }
    const trees = new P.Graphics(); near.addChild(trees);
    for (let x = -100; x < WORLD_WIDTH; x += 155) {
      const high = 160 + ((x + 100) % 4) * 27;
      trees.rect(x + 45, high, 13, 320).fill(0x293d45);
      trees.ellipse(x + 52, high + 60, 73, 112).fill(0x344c51);
      trees.ellipse(x + 42, high + 35, 48, 85).fill({ color: 0x42615d, alpha: 0.55 });
    }
    const terrain = new P.Graphics(); world.addChild(terrain);
    for (const p of PLATFORMS) {
      if (p.kind === 'bridge') {
        terrain.rect(p.x, p.y + 6, p.w, p.h - 6).fill(0x644d48);
        for (let x = p.x; x < p.x + p.w; x += 28) terrain.roundRect(x + 1, p.y, Math.min(26, p.x + p.w - x - 1), 12, 3).fill(C.wood);
        terrain.rect(p.x + 14, p.y + 22, 8, 35).fill(0x604941);
        terrain.rect(p.x + p.w - 22, p.y + 22, 8, 35).fill(0x604941);
      } else {
        terrain.rect(p.x, p.y, p.w, p.h).fill(p.kind === 'ground' ? C.soil : 0x74616c);
        for (let y = p.y + 15; y < p.y + p.h; y += 32) {
          for (let x = p.x + ((y % 2) * 14); x < p.x + p.w; x += 55) {
            terrain.roundRect(x + 3, y, Math.min(49, p.x + p.w - x - 3), 26, 5).fill({ color: p.kind === 'ground' ? 0x614553 : 0x95817f, alpha: 0.5 });
          }
        }
        terrain.rect(p.x, p.y, p.w, 10).fill(C.edge);
        for (let x = p.x + 5; x < p.x + p.w - 5; x += 18) terrain.poly([x, p.y + 10, x + 5, p.y + 19, x + 11, p.y + 10]).fill(0x6d9d87);
      }
    }
    const decorations = new P.Graphics(); world.addChild(decorations);
    for (const p of PLATFORMS.filter(p => p.kind === 'ground')) {
      for (let x = p.x + 230; x < p.x + p.w - 80; x += 210) {
        decorations.moveTo(x, 480).lineTo(x - 8, 459).moveTo(x, 480).lineTo(x + 7, 453).stroke({ width: 3, color: 0xabc4a1 });
        decorations.circle(x + 7, 451, 4).fill(C.gold);
      }
    }
    const text = (value: string, x: number, y: number, size = 20, parent: Node = world, color = C.paper): Label => {
      const t = new P.Text({ text: value, style: { fontFamily: "'Microsoft JhengHei', sans-serif", fontSize: size, fontWeight: '700', fill: color } });
      t.position.set(x, y); parent.addChild(t); return t;
    };
    const sign = new P.Graphics().rect(255, 417, 7, 63).fill(C.wood).roundRect(204, 382, 114, 45, 8).fill(0x655055).stroke({ width: 2, color: C.gold });
    world.addChild(sign); text('往右試走 →', 212, 395, 15);
    const checkpointNodes = CHECKPOINTS.slice(1).map((x, index) => {
      const g = new P.Graphics().rect(x, 410, 6, 70).fill(C.wood).poly([x + 6, 412, x + 65, 426, x + 6, 441]).fill(0x857ca4);
      world.addChild(g); text(`路標 ${index + 1}`, x - 18, 491, 15); return g;
    });
    const goal = new P.Graphics(); world.addChild(goal);
    goal.rect(GOAL + 18, 309, 9, 171).fill(C.wood).moveTo(GOAL + 22, 310).quadraticCurveTo(GOAL - 14, 280, GOAL - 23, 324).stroke({ width: 7, color: C.wood });
    goal.roundRect(GOAL - 39, 322, 35, 47, 6).fill(C.gold).stroke({ color: 0xa88552, width: 4 });
    goal.circle(GOAL - 21, 345, 46).fill({ color: C.gold, alpha: 0.1 });
    text('星燈集合點', GOAL - 82, 493, 17);
    const starNodes = STARS.map(star => {
      const g = new P.Graphics().circle(0, 0, 18).fill({ color: C.gold, alpha: 0.13 })
        .poly([0, -12, 4, -4, 12, 0, 4, 4, 0, 12, -4, 4, -12, 0, -4, -4]).fill(C.gold);
      g.position.set(star.x, star.y); world.addChild(g); return g;
    });
    // Neutral collision-sized actor while the next character style is being designed.
    const player = new P.Graphics().roundRect(-BODY.half, -BODY.height, BODY.half * 2, BODY.height, 5).fill(0xc1c4d8)
      .poly([4, -53, 11, -47, 4, -41]).fill(C.sky);
    world.addChild(player);
    const progress = text('', 26, 24, 21, hud);
    const instruction = text('← → / A D 移動　空白鍵跳躍　Shift 跑步', 26, 57, 15, hud);
    const message = text('', 0, 130, 28, hud); message.anchor.set(0.5, 0);
    const messageDetail = text('', 0, 172, 18, hud); messageDetail.anchor.set(0.5, 0);
    let state = initialState(), previous = state, accumulator = 0, camera = 0, viewportWidth = 1067;
    player.position.set(state.x, state.y);
    let paused = false, destroyed = false, elapsed = 0, lastStatus = '', lastFalls = 0, respawnMessage = 0;
    const held = new Map<string, Action>();
    const timers = new Map<Action, number>();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches;
    const emit = () => {
      const status = { paused, completed: state.completed, stars: state.collected.length, checkpoint: state.checkpoint, falls: state.falls };
      const serialized = JSON.stringify(status);
      if (serialized !== lastStatus) { lastStatus = serialized; onStatus(status); }
    };
    const release = () => { held.clear(); for (const id of timers.values()) window.clearTimeout(id); timers.clear(); };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      viewportWidth = HEIGHT * bounds.width / Math.max(1, bounds.height);
      app.renderer.resize(viewportWidth, HEIGHT);
      // autoDensity rewrites inline canvas dimensions on every renderer resize.
      app.canvas.style.width = app.canvas.style.height = '100%';
      skyPaint.clear();
      const bands = [0x242743, 0x34354f, 0x45425c, 0x595067, 0x756271, 0x977b7a, 0xbb9c87];
      bands.forEach((color, i) => skyPaint.rect(0, i * 65, viewportWidth, 66).fill(color));
      skyPaint.rect(0, 455, viewportWidth, 145).fill(0x38444d);
      moon.x = viewportWidth - 130;
      instruction.text = viewportWidth < 700 ? '左右移動 · 跳躍 · 按住跑步' : '← → / A D 移動　空白鍵跳躍　Shift 跑步';
      message.x = messageDetail.x = viewportWidth / 2;
      camera = Math.max(0, Math.min(WORLD_WIDTH - viewportWidth, state.x - viewportWidth * 0.38));
      app.render();
    };
    const observer = new ResizeObserver(resize); observer.observe(host);
    const stage = host.parentElement!;
    const keyActions: Record<string, Action> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', ShiftLeft: 'run', ShiftRight: 'run' };
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('button,a,input,select')) return;
      const action = keyActions[event.code];
      if (action) { event.preventDefault(); if (!paused) held.set(event.code, action); }
      if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) { event.preventDefault(); paused = !paused; release(); accumulator = 0; emit(); }
    };
    const keyup = (event: KeyboardEvent) => { if (held.delete(event.code)) event.preventDefault(); };
    const focus = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest('button,a')) stage.focus({ preventScroll: true }); };
    const focusout = (event: FocusEvent) => { if (!stage.contains(event.relatedTarget as globalThis.Node | null)) release(); };
    const blur = () => { release(); paused = true; accumulator = 0; emit(); };
    const visibility = () => { if (document.hidden) blur(); };
    const motionChanged = () => { reduced = motion.matches; };
    stage.addEventListener('keydown', keydown); stage.addEventListener('keyup', keyup); stage.addEventListener('pointerdown', focus);
    stage.addEventListener('focusout', focusout);
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', motionChanged);
    const tick = (ticker: { deltaMS: number }) => {
      const dt = Math.min(0.1, ticker.deltaMS / 1000);
      if (!paused && !state.completed) {
        accumulator += dt;
        const actions = new Set(held.values());
        while (accumulator >= PHYSICS.step) {
          previous = state;
          state = advance(state, { axis: Number(actions.has('right')) - Number(actions.has('left')), jump: actions.has('jump'), run: actions.has('run') }, PHYSICS.step);
          accumulator -= PHYSICS.step;
        }
        elapsed += dt;
      }
      if (state.falls !== lastFalls) { lastFalls = state.falls; respawnMessage = 2; previous = state; camera = Math.max(0, state.x - viewportWidth * 0.38); }
      if (!paused) respawnMessage = Math.max(0, respawnMessage - dt);
      const mix = paused || state.completed ? 1 : accumulator / PHYSICS.step;
      const x = previous.x + (state.x - previous.x) * mix, y = previous.y + (state.y - previous.y) * mix;
      const desired = Math.max(0, Math.min(Math.max(0, WORLD_WIDTH - viewportWidth), x - viewportWidth * 0.38));
      if (!paused) camera += (desired - camera) * (reduced ? 1 : 1 - Math.exp(-7 * dt));
      world.x = -camera; distant.x = -camera * 0.22; near.x = -camera * 0.5;
      player.position.set(x, y); player.scale.x = state.facing;
      starNodes.forEach((node, i) => { node.visible = !state.collected.includes(i); node.y = STARS[i].y + (reduced ? 0 : Math.sin(elapsed * 2 + i) * 3); });
      checkpointNodes.forEach((node, i) => { node.alpha = state.checkpoint > i ? 1 : 0.58; });
      progress.text = `✦ 星光 ${state.collected.length} / ${STARS.length}　·　路標 ${state.checkpoint + 1}`;
      message.text = state.completed ? '抵達集合點！' : paused ? '已暫停' : respawnMessage ? '回到最近的路標，再試一次' : '';
      messageDetail.text = state.completed ? '可以重新試走，找找還沒拾起的星光。' : paused ? '按 P 或選「繼續」返回小徑' : '';
      emit();
    };
    app.canvas.style.width = app.canvas.style.height = '100%';
    host.append(app.canvas); resize(); app.ticker.add(tick); app.ticker.maxFPS = 60; app.start(); emit();
    return {
      hold(action, active, source) { if (destroyed) return; if (active && !paused) held.set(source, action); else held.delete(source); },
      tap(action) {
        if (destroyed || paused) return;
        const source = `tap-${action}`; held.set(source, action);
        const old = timers.get(action); if (old) window.clearTimeout(old);
        timers.set(action, window.setTimeout(() => { held.delete(source); timers.delete(action); }, action === 'jump' ? 120 : 240));
      },
      togglePause() { paused = !paused; release(); accumulator = 0; emit(); },
      restart() { release(); state = initialState(); previous = state; paused = false; camera = 0; accumulator = 0; lastFalls = 0; respawnMessage = 0; emit(); },
      destroy() {
        if (destroyed) return; destroyed = true; release(); observer.disconnect();
        stage.removeEventListener('keydown', keydown); stage.removeEventListener('keyup', keyup); stage.removeEventListener('pointerdown', focus);
        stage.removeEventListener('focusout', focusout);
        window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', motionChanged);
        app.destroy({ removeView: true }, { children: true });
      },
    };
  } catch (error) {
    if (initialized) app.destroy({ removeView: true }, { children: true });
    throw error;
  }
}
