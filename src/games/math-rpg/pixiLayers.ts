import { MathRpgRenderer, type RendererApplication, type RendererLayer, type RendererScope } from './renderer';
import type { BattleSnapshot } from './session';
import { BattleMotion, type Side } from './motion';

interface Texture { width: number; height: number }
interface Node { x: number; y: number; width: number; height: number; alpha: number; visible: boolean; tint: number; rotation: number;
  anchor: { set(x: number, y?: number): void }; texture: Texture; text: string; destroy(): void }
interface App extends RendererApplication {
  stage: RendererApplication['stage'] & { addChild(node: Node): void };
  ticker: { add(callback: () => void): void; remove(callback: () => void): void };
}
export interface PixiRuntime {
  Application: new () => App;
  Sprite: new (options: { texture: Texture }) => Node;
  Text: new (options: { text: string; style: Record<string, unknown> }) => Node;
  Assets: { load(url: string): Promise<Texture> };
}
let loading: Promise<PixiRuntime> | undefined;
/** Only the local vendor script is shared; Application instances never are. */
export function loadMathPixi(): Promise<PixiRuntime> {
  const current = () => (window as Window & { PIXI?: PixiRuntime }).PIXI;
  if (current()) return Promise.resolve(current()!);
  return loading ??= new Promise<PixiRuntime>((resolve, reject) => {
    const script = document.createElement('script');
    const finish = (error?: Error) => {
      clearTimeout(timeout); script.onload = script.onerror = null;
      if (error) { script.remove(); reject(error); } else resolve(current()!);
    };
    const timeout = setTimeout(() => finish(new Error('Pixi 載入逾時')), 15000);
    script.src = `${import.meta.env.BASE_URL}assets/vendor/pixi.min.js`;
    script.onload = () => finish(current() ? undefined : new Error('Pixi 未就緒'));
    script.onerror = () => finish(new Error('Pixi 載入失敗'));
    document.head.append(script);
  }).catch(error => { loading = undefined; throw error; });
}

export function createBattleGraphics(targets: { battle: HTMLElement; overlay: HTMLElement; hero: HTMLElement; enemy: HTMLElement }, load = loadMathPixi) {
  let pixi: PixiRuntime;
  let hero: Node | undefined, enemy: Node | undefined, label: Node | undefined;
  let slash: Node | undefined;
  let battleApp: RendererApplication | undefined, uiApp: RendererApplication | undefined;
  let uiScope: RendererScope | undefined;
  let textures: Texture[] = [];
  let reduced = false;
  let last: BattleSnapshot | undefined;
  let labelTarget: HTMLElement = targets.enemy;
  let particles: Node[] = [];
  let overlaySize = { width: 0, height: 0 };
  let battleWidth = 0;
  let burst: { start: number; victory: boolean; x: number; y: number } | undefined;
  const motion = new BattleMotion();
  const animateOverlay = () => {
    if (!burst) return;
    const t = (motion.time() - burst.start) / (burst.victory ? 2600 : 650);
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      particle.visible = !reduced && t < 1;
      particle.alpha = Math.max(0, 1 - t);
      particle.rotation = t * (i % 2 ? 5 : -5);
      if (burst.victory) {
        particle.x = overlaySize.width * (i + .5) / particles.length + Math.sin(t * 9 + i) * 20;
        particle.y = t * overlaySize.height * (.5 + (i % 5) / 10);
      } else {
        const angle = i * Math.PI * 2 / particles.length;
        particle.x = burst.x + Math.cos(angle) * t * (35 + i % 4 * 10);
        particle.y = burst.y + Math.sin(angle) * t * 60 + t * t * 35;
      }
    }
    if (t >= 1) burst = undefined;
  };
  const bases: Record<Side, { x: number; y: number }> = { hero: { x: 0, y: 0 }, enemy: { x: 0, y: 0 } };
  const animate = () => {
    const progress = motion.attackProgress('hero');
    if (hero && textures.length > 8) hero.texture = textures[progress < .16 || progress >= 1 ? 0 : progress < .34 ? 7 : 8];
    if (slash) {
      slash.visible = !reduced && progress >= .26 && progress < 1;
      slash.texture = textures[last?.hit?.critical ? 12 : 9 + ((last?.questionId ?? 0) % 3)];
      slash.x = bases.hero.x + (bases.enemy.x - bases.hero.x) * Math.min(1, (progress - .26) / .51);
      slash.y = bases.enemy.y;
      slash.width = Math.min(140, battleWidth * .28); slash.height = slash.width;
      slash.alpha = Math.min(1, (1 - progress) * 4);
    }
    for (const side of ['hero', 'enemy'] as const) {
      const node = side === 'hero' ? hero : enemy;
      if (!node) continue;
      const pose = motion.pose(side);
      node.x = bases[side].x + pose.x * Math.min(42, node.width * .25);
      node.y = bases[side].y + pose.y * node.height;
      node.rotation = pose.rotation; node.alpha = pose.alpha; node.tint = pose.tint;
    }
  };
  const fit = (node: Node | undefined, element: HTMLElement, host: HTMLElement) => {
    if (!node) return;
    const box = element.getBoundingClientRect(), base = host.getBoundingClientRect();
    const scale = Math.min(box.width / node.texture.width, box.height / node.texture.height);
    node.width = node.texture.width * scale; node.height = node.texture.height * scale;
    node.x = box.left - base.left + box.width / 2; node.y = box.top - base.top + box.height / 2;
  };
  const positionLabel = () => {
    if (!label) return;
    const box = labelTarget.getBoundingClientRect(), base = targets.overlay.getBoundingClientRect();
    label.x = box.left - base.left + box.width / 2; label.y = box.top - base.top + 24;
  };
  const battle: RendererLayer = {
    async setup(app, scope) {
      battleApp = app;
      // Bounded shared Assets entries; no per-question texture allocation.
      textures = await Promise.all(['hero', ...Array.from({ length: 6 }, (_, i) => `enemy${i + 1}`), 'hero-atk1', 'hero-atk2', 'slash-wide', 'slash-arc', 'slash-thrust', 'slash-cross']
        .map(name => pixi.Assets.load(`${import.meta.env.BASE_URL}assets/images/math-rpg/${name}.webp`)));
      if (scope.disposed) return;
      hero = new pixi.Sprite({ texture: textures[0] }); enemy = new pixi.Sprite({ texture: textures[1] });
      for (const node of [hero, enemy]) { node.anchor.set(.5); (app as App).stage.addChild(node); }
      slash = new pixi.Sprite({ texture: textures[9] }); slash.anchor.set(.5); slash.visible = false; (app as App).stage.addChild(slash);
      (app as App).ticker.add(animate);
      scope.own(() => { (app as App).ticker.remove(animate); motion.reset(); });
      scope.own(() => { hero = undefined; enemy = undefined; slash = undefined; battleApp = undefined; });
      battle.resize?.();
    },
    resize() {
      battleWidth = targets.battle.clientWidth;
      fit(hero, targets.hero, targets.battle); fit(enemy, targets.enemy, targets.battle);
      if (hero) bases.hero = { x: hero.x, y: hero.y };
      if (enemy) bases.enemy = { x: enemy.x, y: enemy.y };
      animate();
    },
    setReducedMotion(enabled) { motion.setReducedMotion(enabled); animate(); },
    reset() { motion.reset(); animate(); },
  };
  const overlay: RendererLayer = {
    setup(app, scope) {
      uiApp = app; uiScope = scope;
      label = new pixi.Text({ text: '', style: { fontFamily: 'sans-serif', fontSize: 28, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x182030, width: 5 } } });
      label.anchor.set(.5); label.visible = false; (app as App).stage.addChild(label);
      particles = Array.from({ length: 24 }, (_, i) => {
        const node = new pixi.Text({ text: '◆', style: { fontFamily: 'sans-serif', fontSize: 10, fill: [0xffce57, 0x71dcff, 0xff9fc9][i % 3] } });
        node.anchor.set(.5); node.visible = false; (app as App).stage.addChild(node); return node;
      });
      (app as App).ticker.add(animateOverlay);
      scope.own(() => { (app as App).ticker.remove(animateOverlay); particles = []; burst = undefined; label = undefined; uiApp = undefined; uiScope = undefined; });
    },
    resize() { overlaySize = { width: targets.overlay.clientWidth, height: targets.overlay.clientHeight }; positionLabel(); },
    setReducedMotion(enabled) { reduced = enabled; if (enabled) { if (label) label.visible = false; burst = undefined; particles.forEach(node => { node.visible = false; }); } },
    reset() { if (label) label.visible = false; burst = undefined; particles.forEach(node => { node.visible = false; }); },
  };
  const renderer = new MathRpgRenderer(async () => { pixi = await load(); return pixi; }, { battle, overlay });
  return {
    mount: () => renderer.mount(targets),
    destroy: () => renderer.destroy(),
    update(snapshot: BattleSnapshot) {
      if (!hero || !enemy || !label) return;
      if (last === snapshot) return;
      motion.setPaused(!!snapshot.paused);
      if (snapshot.paused) renderer.pause(); else renderer.resume();
      if (!last || snapshot.questionId !== last.questionId) renderer.reset();
      enemy.texture = textures[snapshot.state.enemyIndex + 1];
      motion.update(snapshot);
      if (!reduced && snapshot.cue === 'impact' && snapshot.hit && (last?.cue !== snapshot.cue || last.questionId !== snapshot.questionId)) {
        labelTarget = snapshot.state.combo > 0 ? targets.enemy : targets.hero;
        label.text = snapshot.hit.blocked ? '護盾擋下！' : `${snapshot.hit.critical ? '爆擊 ' : ''}−${snapshot.hit.damage}`;
        label.visible = true; positionLabel();
        burst = { start: motion.time(), victory: false, x: label.x, y: label.y + 60 };
        uiScope?.cancelEffects();
        uiScope?.later(() => { if (label) label.visible = false; }, 900);
      }
      if (!reduced && snapshot.phase === 'victory' && last?.phase !== 'victory') burst = { start: motion.time(), victory: true, x: 0, y: 0 };
      if (!reduced && last && snapshot.state.playerHP > last.state.playerHP) {
        labelTarget = targets.hero; label.text = `+${snapshot.state.playerHP - last.state.playerHP} 回復`;
        label.visible = true; positionLabel(); uiScope?.cancelEffects();
        uiScope?.later(() => { if (label) label.visible = false; }, 900);
      }
      if (!reduced && last?.cue !== snapshot.cue && snapshot.cue === 'status-tick' && last && snapshot.state.playerHP < last.state.playerHP) {
        labelTarget = targets.hero; label.text = `流血 −${last.state.playerHP - snapshot.state.playerHP}`;
        label.visible = true; positionLabel(); uiScope?.cancelEffects();
        uiScope?.later(() => { if (label) label.visible = false; }, 900);
      }
      last = snapshot;
      battle.resize?.(); battleApp?.render(); uiApp?.render();
    },
  };
}
