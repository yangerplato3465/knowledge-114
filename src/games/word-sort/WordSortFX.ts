import type { GameController } from '../core/GameController';
import type { GameCommand } from '../core/game-events';
import type { Suffix } from './model';

// 本地 UMD 沒有型別宣告，僅在此 adapter 描述實際使用的 API。
interface Particle { x: number; y: number; rotation: number; alpha: number }
interface Texture { destroy(source: boolean): void }
interface Particles { addParticle(p: Particle): void; removeParticle(p: Particle): void }
interface App {
  canvas: HTMLCanvasElement;
  init(options: Record<string, unknown>): Promise<void>;
  stage: { addChild(child: Particles): void };
  ticker: { add(fn: () => void): void; remove(fn: () => void): void };
  renderer: { resize(w: number, h: number): void };
  start(): void; stop(): void;
  destroy(options: Record<string, boolean>, children: Record<string, boolean>): void;
}
interface Pixi {
  Application: new () => App;
  ParticleContainer: new (options: Record<string, unknown>) => Particles;
  Particle: new (options: Record<string, unknown>) => Particle;
  Texture: { from(canvas: HTMLCanvasElement): Texture };
}
let loading: Promise<Pixi> | undefined;
function loadPixi(): Promise<Pixi> {
  const current = () => (window as Window & { PIXI?: Pixi }).PIXI;
  if (current()) return Promise.resolve(current()!);
  if (!loading) loading = new Promise<Pixi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${import.meta.env.BASE_URL}assets/vendor/pixi.min.js`;
    const timeout = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timeout); script.remove(); reject(new Error('特效載入失敗')); };
    script.onload = () => { clearTimeout(timeout); current() ? resolve(current()!) : fail(); };
    script.onerror = fail;
    document.head.append(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export class WordSortFX implements GameController {
  private app?: App;
  private pixi?: Pixi;
  private container?: Particles;
  private texture?: Texture;
  private particles: { p: Particle; vx: number; vy: number; vr: number; life: number }[] = [];
  private reduced = true;
  private paused = true;
  private destroyed = false;
  private initialized = false;
  async mount(host: HTMLElement) {
    // 缺少 GPU 或 vendor 時仍可玩，特效不能阻擋 DOM 遊戲。
    try {
      const pixi = this.pixi = await loadPixi();
      if (this.destroyed || !host.isConnected) return;
      const app = this.app = new pixi.Application();
      await app.init({ backgroundAlpha: 0, antialias: true, autoDensity: true, autoStart: false,
        resolution: window.devicePixelRatio || 1, width: innerWidth, height: innerHeight });
      this.initialized = true;
      if (this.destroyed || !host.isConnected) { this.dispose(); return; }
      app.canvas.setAttribute('aria-hidden', 'true');
      host.append(app.canvas);
      const canvas = document.createElement('canvas'); canvas.width = 12; canvas.height = 18;
      const context = canvas.getContext('2d');
      if (!context) { this.dispose(); return; }
      context.fillStyle = '#fff'; context.beginPath(); context.roundRect(0, 0, 12, 18, 3); context.fill();
      this.texture = pixi.Texture.from(canvas);
      this.container = new pixi.ParticleContainer({ dynamicProperties: { position: true, rotation: true, color: true } });
      app.stage.addChild(this.container); app.ticker.add(this.step);
      window.addEventListener('resize', this.resize);
    } catch { this.dispose(); }
  }
  private step = () => {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const item = this.particles[i];
      item.vy += .28; item.vx *= .992;
      item.p.x += item.vx; item.p.y += item.vy; item.p.rotation += item.vr; item.life--;
      if (item.life < 90 * .35) item.p.alpha = Math.max(0, item.life / (90 * .35));
      if (item.life <= 0 || item.p.y > innerHeight + 60) {
        this.container?.removeParticle(item.p); this.particles.splice(i, 1);
      }
    }
  };
  burst(x: number, y: number, suffix: Suffix, count = 55, angle = -Math.PI / 2) {
    if (this.destroyed || this.reduced || this.paused || !this.texture || !this.container || !this.pixi) return;
    const colors = suffix === 'ful' ? [0xd98026, 0xe8c34a, 0xf0a35a, 0xffffff] : [0x3f7fb5, 0x7fb2dc, 0x2e8b5e, 0xffffff];
    for (let i = 0; i < count && this.particles.length < 900; i++) {
      const a = angle + (Math.random() - .5) * Math.PI * .9;
      const speed = 14 * (.35 + Math.random() * .85);
      const p = new this.pixi.Particle({ texture: this.texture, x: x + (Math.random() - .5) * 30,
        y: y + (Math.random() - .5) * 30, anchorX: .5, anchorY: .5,
        scaleX: .5 + Math.random() * .75, scaleY: .5 + Math.random() * .75,
        rotation: Math.random() * Math.PI * 2, tint: colors[Math.floor(Math.random() * colors.length)] });
      this.container.addParticle(p);
      this.particles.push({ p, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        vr: (Math.random() - .5) * .34, life: 90 * (.7 + Math.random() * .5) });
    }
  }
  resize = () => { if (this.initialized) this.app?.renderer.resize(innerWidth, innerHeight); };
  pause() { this.paused = true; if (this.initialized) this.app?.stop(); }
  resume() { this.paused = false; if (this.initialized && !this.reduced) this.app?.start(); }
  dispatch(command: GameCommand) {
    if (command.type === 'pause') this.pause();
    if (command.type === 'resume') this.resume();
    if (command.type === 'set-reduced-motion') {
      this.reduced = command.enabled;
      if (this.reduced) { this.clear(); if (this.initialized) this.app?.stop(); }
      else if (!this.paused && this.initialized) this.app?.start();
    }
  }
  clear() { this.particles.forEach(item => this.container?.removeParticle(item.p)); this.particles = []; }
  private dispose() {
    window.removeEventListener('resize', this.resize);
    this.clear();
    // 只釋放本實例的資源；不能清空其他仍在初始化的 StrictMode 實例的全域池。
    if (this.app?.renderer) {
      // init 失敗也可能已配置 renderer；盡力釋放部分資源。
      try {
        this.app.ticker?.remove(this.step);
        this.app.destroy({ removeView: true }, { children: true });
      } catch { /* 部分初始化的 plugin 可能尚未具備 destroy 前置條件 */ }
    }
    this.texture?.destroy(true); this.texture = undefined;
    this.initialized = false; this.app = undefined; this.container = undefined;
  }
  destroy() { this.destroyed = true; this.dispose(); }
}
