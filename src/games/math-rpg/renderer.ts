/** Minimal boundary for the bundled Pixi v8 runtime. Neither layer owns shared Assets. */
export interface RendererApplication {
  canvas: HTMLCanvasElement;
  renderer?: { resize(width: number, height: number): void };
  stage: { destroy(options: { children: boolean }): void };
  init(options: Record<string, unknown>): Promise<void>;
  start(): void;
  stop(): void;
  render(): void;
  destroy(view: { removeView: boolean }, stage: { children: boolean }): void;
}
export interface RendererRuntime { Application: new () => RendererApplication }
export interface RendererLayer {
  /** Register ticker callbacks and create scene-local resources here. */
  setup(app: RendererApplication, scope: RendererScope): void | Promise<void>;
  /** Clear decorative effects, not essential battle state. */
  setReducedMotion(enabled: boolean): void;
  reset(): void;
}
export interface RendererTargets { battle: HTMLElement; overlay: HTMLElement }

/** Owns delayed effects and explicit scene resources (filters, private textures).
 * Assets cache entries must be managed separately, never destroyed by a layer.
 */
export class RendererScope {
  private closed = false;
  private epoch = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private releases: (() => void)[] = [];
  get disposed() { return this.closed; }
  own(release: () => void) {
    if (this.closed) release();
    else this.releases.push(release);
  }
  later(callback: () => void, delay: number) {
    if (this.closed) return;
    const epoch = this.epoch;
    const handle = setTimeout(() => {
      this.timers.delete(handle);
      if (!this.closed && epoch === this.epoch) callback();
    }, delay);
    this.timers.add(handle);
  }
  cancelEffects() {
    this.epoch++;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.cancelEffects();
    // One faulty cleanup must not strand the other canvas/resources.
    const errors: unknown[] = [];
    for (const release of this.releases.splice(0).reverse()) {
      try { release(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, '場景資源清理失敗');
  }
}

interface Slot { app: RendererApplication; scope: RendererScope; layer: RendererLayer; ready: boolean; released: boolean }

/** One instance per mounted game; two canvases commit together only after setup.
 * This boundary intentionally does not import legacy singletons or battle rules.
 */
export class MathRpgRenderer {
  private slots: Slot[] = [];
  private destroyed = false;
  private mounted = false;
  private ready = false;
  private paused = false;
  private reduced = false;
  private targets?: RendererTargets;
  private observer?: ResizeObserver;
  private media?: MediaQueryList;
  constructor(private readonly load: () => Promise<RendererRuntime>,
    private readonly layers: { battle: RendererLayer; overlay: RendererLayer },
    private readonly onCleanupError: (error: unknown) => void = error => console.error(error)) {}

  async mount(targets: RendererTargets): Promise<boolean> {
    if (this.mounted || this.destroyed) return false;
    this.mounted = true;
    this.targets = targets;
    try {
      const runtime = await this.load();
      if (!this.live()) { this.destroy(); return false; }
      for (const name of ['battle', 'overlay'] as const) {
        const app = new runtime.Application();
        const slot: Slot = { app, scope: new RendererScope(), layer: this.layers[name], ready: false, released: false };
        this.slots.push(slot);
        try {
          await app.init({ width: Math.max(1, targets[name].clientWidth), height: Math.max(1, targets[name].clientHeight),
            backgroundAlpha: 0, antialias: true, autoDensity: true, autoStart: false, sharedTicker: false,
            preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2) });
          if (this.live()) await slot.layer.setup(app, slot.scope);
        } finally {
          // Wait for both init and scene setup before releasing their resources.
          slot.ready = true;
        }
        if (!this.live()) { this.release(slot); this.destroy(); return false; }
      }
      this.media = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.media.matches;
      this.slots.forEach(slot => slot.layer.setReducedMotion(this.reduced));
      this.slots.forEach((slot, index) => {
        const canvas = slot.app.canvas;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        canvas.dataset.mathRpgLayer = index === 0 ? 'battle' : 'overlay';
        (index === 0 ? targets.battle : targets.overlay).append(canvas);
      });
      this.ready = true;
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(targets.battle);
      this.observer.observe(targets.overlay);
      document.addEventListener('visibilitychange', this.sync);
      this.media.addEventListener('change', this.motionChanged);
      this.resize(); this.sync();
      return true;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  private live() { return !this.destroyed && !!this.targets?.battle.isConnected && !!this.targets.overlay.isConnected; }
  private motionChanged = () => this.setReducedMotion(this.media!.matches);
  private sync = () => {
    if (!this.ready || this.destroyed) return;
    for (const slot of this.slots) {
      if (this.paused || document.hidden) slot.app.stop();
      else slot.app.start();
    }
  };
  pause() { this.paused = true; this.sync(); }
  resume() { this.paused = false; this.sync(); }
  setReducedMotion(enabled: boolean) {
    this.reduced = enabled;
    if (!this.ready || this.destroyed) return;
    // Keep rendering essential characters/HUD; layers disable only decoration.
    for (const slot of this.slots) {
      if (enabled) slot.scope.cancelEffects();
      slot.layer.setReducedMotion(enabled);
    }
  }
  reset() {
    if (!this.ready || this.destroyed) return;
    for (const slot of this.slots) { slot.scope.cancelEffects(); slot.layer.reset(); }
  }
  resize() {
    if (!this.ready || !this.live()) return;
    this.slots.forEach((slot, index) => {
      const host = index === 0 ? this.targets!.battle : this.targets!.overlay;
      slot.app.renderer!.resize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
      slot.app.render();
    });
  }
  private release(slot: Slot) {
    if (!slot.ready || slot.released) return;
    slot.released = true;
    const clean = (run: () => void) => { try { run(); } catch (error) { try { this.onCleanupError(error); } catch { /* finish remaining cleanup */ } } };
    clean(() => slot.scope.dispose());
    // init can reject before it creates a renderer; Application.destroy needs one.
    if (slot.app.renderer) {
      const canvas = slot.app.canvas;
      clean(() => slot.app.stop());
      clean(() => slot.app.destroy({ removeView: true }, { children: true }));
      clean(() => canvas.remove());
    } else clean(() => slot.app.stage.destroy({ children: true }));
    // No releaseGlobalResources or texture:true: sibling instances may share caches.
  }
  destroy() {
    this.destroyed = true;
    this.ready = false;
    this.observer?.disconnect(); this.observer = undefined;
    document.removeEventListener('visibilitychange', this.sync);
    this.media?.removeEventListener('change', this.motionChanged); this.media = undefined;
    for (const slot of this.slots) {
      if (!slot.ready) {
        try { slot.scope.dispose(); } catch (error) { try { this.onCleanupError(error); } catch { /* keep cleaning */ } }
      }
      this.release(slot);
    }
  }
}
