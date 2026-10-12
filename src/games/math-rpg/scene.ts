import type { App, Graphic, Label, Node, Pixi, Texture } from '../magic-workshop/scene-types';
import { loadCharacterImage } from '../magic-workshop/image-loader';
import { COVER_ART, coverArtUrl } from './cover-art';
import { actorMesh, deformActor, smoothPointer } from './cover-motion';
import { CURRICULUM, isUnitReady } from './question-deck';
import { loadBattleArt, type BattlePixi } from './battle-art';
import { createBattleView, type BattleView } from './battle-view';
import { STAGES } from './battle-model';

export const LAYERS = ['background', 'actors', 'effects', 'interface'] as const;
export interface Viewport { width: number; height: number; scale: number; x: number; y: number }
export interface SceneControl { id: string; label: string; disabled?: boolean; selected?: boolean }
export interface SceneHooks { controls?(controls: SceneControl[]): void; announce?(message: string): void; requestFullscreen?(): void }
export interface GameScene {
  layers: Record<typeof LAYERS[number], Node>; readonly viewport: Viewport;
  render(): void; activate(id: string): void; focus(id: string | null): void; fullscreen(value: boolean): void; destroy(): void;
}
interface Interactive extends Node {
  eventMode: string; cursor: string; interactiveChildren: boolean;
  hitArea: { contains(x: number, y: number): boolean };
  on(event: string, callback: () => void): void;
}
interface SceneAssets { background: HTMLImageElement; liwei: HTMLImageElement; heen: HTMLImageElement }
export interface SceneLoaders { pixi(): Promise<Pixi>; assets(signal: AbortSignal): Promise<SceneAssets> }
const loadLocalPixi = async () => await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Pixi;
const loadAssets = async (signal: AbortSignal): Promise<SceneAssets> => {
  const entries = await Promise.all(Object.entries(COVER_ART).map(async ([key, art]) =>
    [key, await loadCharacterImage(coverArtUrl(art.file), signal)] as const));
  return Object.fromEntries(entries) as unknown as SceneAssets;
};
const C = { ink: 0x11192f, paper: 0xffe6ae, gold: 0xdfad60, stone: 0x25304b, teal: 0x72b9b0 };

export function fitViewport(width: number, height: number): Viewport {
  const portrait = height > width;
  const w = portrait ? 720 : 1280, h = portrait ? 1280 : 720;
  const scale = Math.min(width / w, height / h);
  return { width: w, height: h, scale, x: (width - w * scale) / 2, y: (height - h * scale) / 2 };
}

/** Own images, textures and ticker; late loads cannot attach to a newer mount. */
export async function createGameScene(host: HTMLElement, parentSignal: AbortSignal,
  loaders: SceneLoaders = { pixi: loadLocalPixi, assets: loadAssets }, hooks: SceneHooks = {}): Promise<GameScene> {
  parentSignal.throwIfAborted();
  const controller = new AbortController(), signal = controller.signal;
  const abort = () => controller.abort(); parentSignal.addEventListener('abort', abort, { once: true });
  let app: App | undefined, initialized = false, disposed = false, appDestroyed = false;
  let observer: ResizeObserver | undefined, font: FontFace | undefined;
  let battleView: BattleView | undefined, battleController: AbortController | undefined;
  const textures: Texture[] = [], releases: (() => void)[] = [];
  const destroy = () => {
    if (!disposed) {
      disposed = true; controller.abort(); observer?.disconnect();
      parentSignal.removeEventListener('abort', abort); signal.removeEventListener('abort', destroy);
      releases.splice(0).forEach(release => release());
      battleController?.abort(); battleView?.destroy(); battleView = undefined;
    }
    // Also dispose an init that finished after cancellation.
    if (initialized && !appDestroyed && app) {
      appDestroyed = true; app.stop(); app.destroy({ removeView: true }, { children: true });
    }
    textures.splice(0).forEach(texture => texture.destroy(true));
    if (font) { document.fonts.delete(font); font = undefined; }
  };
  signal.addEventListener('abort', destroy, { once: true });
  try {
    const P = await loaders.pixi(); signal.throwIfAborted(); app = new P.Application();
    await app.init({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight),
      background: C.ink, antialias: true, autoStart: false, sharedTicker: false, preference: 'webgl',
      resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    initialized = true; signal.throwIfAborted();
    const images = await loaders.assets(signal); signal.throwIfAborted();
    const owned = (image: HTMLImageElement) => { const texture = P.Texture.from(image); textures.push(texture); return texture; };
    const backgroundTexture = owned(images.background);
    const actorTextures = { liwei: owned(images.liwei), heen: owned(images.heen) };
    if (typeof FontFace !== 'undefined' && document.fonts) {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/fonts/workshop/workshop-rounded.woff2`, { signal });
        if (response.ok) {
          const loaded = await new FontFace('Math Cover UI', await response.arrayBuffer()).load();
          signal.throwIfAborted(); font = loaded; document.fonts.add(loaded);
        }
      } catch { signal.throwIfAborted(); /* System CJK font fallback. */ }
    }
    signal.throwIfAborted();
    const root = app.stage.addChild(new P.Container()), layers = {} as GameScene['layers'];
    for (const key of LAYERS) layers[key] = root.addChild(new P.Container());
    const background = layers.background.addChild(new P.Sprite(backgroundTexture)); background.anchor.set(.5);
    const shade = layers.background.addChild(new P.Graphics());
    const actors = (['liwei', 'heen'] as const).map((key, index) => {
      const texture = actorTextures[key], spec = COVER_ART[key], geometry = actorMesh(texture.width, texture.height);
      const shadow = layers.actors.addChild(new P.Graphics());
      const mesh = layers.actors.addChild(new P.MeshSimple({ texture, vertices: geometry.vertices, uvs: geometry.uvs, indices: geometry.indices }));
      mesh.pivot.set((spec.bounds[0] + spec.bounds[2]) / 2, spec.foot);
      return { key, index, mesh, shadow, geometry, texture, x: 0, y: 0 };
    });
    let viewport = fitViewport(1, 1), screen: 'cover' | 'units' | 'stages' | 'battle' | 'battle-loading' | 'battle-error' = 'cover', grade = '五上', selected: string | null = null;
    let selectedStage=4, fullscreen=false;
    let time = 0, pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, focused: string | null = null;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'); let reduced = media.matches;
    const buttons = new Map<string, { control: SceneControl; ring: Graphic; face: Graphic }>();
    let currentControls: SceneControl[] = [];
    const render = () => { if (!disposed) app!.render(); };
    const label = (value: string, x: number, y: number, size: number, parent = layers.interface, serif = false, width?: number): Label => {
      const text = parent.addChild(new P.Text({ text: value, style: {
        fontFamily: serif ? ['DFKai-SB', 'KaiTi', 'Noto Serif TC', 'serif'] : ['Math Cover UI', 'Microsoft JhengHei', 'sans-serif'],
        fontSize: size, fontWeight: serif ? '900' : '600', fill: C.paper, align: 'center', lineHeight: size * 1.35,
        stroke: { color: C.ink, width: serif && size > 70 ? 10 : 3 },
        dropShadow: { color: 0x0a1020, alpha: .65, blur: 2, distance: 3, angle: Math.PI / 2 },
        ...(width ? { wordWrap: true, wordWrapWidth: width, breakWords: true } : {}),
      } }));
      text.anchor.set(.5); text.position.set(x, y); return text;
    };
    const activate = (id: string) => {
      if(disposed)return;
      if(screen==='battle'){battleView?.activate(id);return;}
      if(id==='back' && (screen==='stages'||screen==='battle-loading'||screen==='battle-error'))id='units';
      if (disposed || !buttons.has(id) || buttons.get(id)!.control.disabled) return;
      if(id==='fullscreen'){hooks.requestFullscreen?.();return;}
      if (id === 'start') { screen = 'units'; selected = null; }
      else if (id === 'back') { screen = 'cover'; selected = null; }
      else if (id.startsWith('grade:')) { grade = id.slice(6); selected = null; }
      else if (id.startsWith('unit:')) {selected = id.slice(5);screen='stages';}
      else if(id==='units'){battleController?.abort();screen='units';}
      else if(id.startsWith('stage:')){selectedStage=Number(id.slice(6));void enterBattle();return;}
      else if(id==='reload-battle'){void enterBattle();return;}
      focused = null; layout(); syncTicker();
      hooks.announce?.(screen === 'cover' ? '數學勇者封面。' : screen==='stages' ? `${selected}，選擇關卡。第五關面對赫恩。` : '選擇冒險單元。');
    };
    const leaveBattle=()=>{
      battleController?.abort();battleView?.destroy();battleView=undefined;root.visible=true;screen='stages';layout();syncTicker();
      hooks.announce?.(`${selected}，已返回選關。第五關面對赫恩。`);
    };
    const enterBattle=async()=>{
      if(!selected||!isUnitReady(grade,selected))return;
      battleController?.abort();battleController=new AbortController();const own=battleController;
      screen='battle-loading';layout();syncTicker();hooks.announce?.('正在載入像素戰鬥素材。');
      const timeout=window.setTimeout(()=>{
        if(disposed||battleController!==own||screen!=='battle-loading')return;
        own.abort();screen='battle-error';layout();hooks.announce?.('戰鬥素材載入逾時，可重試。');
      },20000);
      const cancelTimeout=()=>window.clearTimeout(timeout);own.signal.addEventListener('abort',cancelTimeout,{once:true});
      let art:Awaited<ReturnType<typeof loadBattleArt>>|undefined;
      try {
        art=await loadBattleArt(P as BattlePixi,own.signal);
        if(disposed||own.signal.aborted||battleController!==own){art.destroy();return;}
        battleView=createBattleView(P as BattlePixi,app!,art,grade,selected,selectedStage,hooks,leaveBattle);
        screen='battle';root.visible=false;battleView.resize(viewport);battleView.setFullscreen(fullscreen);battleView.setReduced(reduced);syncTicker();
      }catch{
        art?.destroy();if(disposed||own.signal.aborted||battleController!==own)return;
        screen='battle-error';layout();hooks.announce?.('戰鬥素材載入失敗，可重試或返回單元。');
      }finally{cancelTimeout();own.signal.removeEventListener('abort',cancelTimeout);}
    };
    const button = (control: SceneControl, x: number, y: number, w: number, h: number, size: number, display = control.label) => {
      const node = layers.interface.addChild(new P.Container()) as Interactive; node.position.set(x, y);
      const face = node.addChild(new P.Graphics());
      face.poly([-w/2+16,-h/2,w/2-16,-h/2,w/2,-h/2+14,w/2,h/2-14,w/2-16,h/2,-w/2+16,h/2,-w/2,h/2-14,-w/2,-h/2+14])
        .fill(control.selected ? 0x304d59 : C.stone).stroke({ color: control.selected ? C.teal : C.gold, width: 2 });
      face.moveTo(-w/2+19,-h/2+5).lineTo(w/2-19,-h/2+5).stroke({ color: C.paper, width: 2, alpha: .35 });
      label(display, 0, 0, size, node, control.id === 'start', w - 28);
      const ring = node.addChild(new P.Graphics()).roundRect(-w/2-6,-h/2-6,w+12,h+12,15).stroke({ color: 0xfff2cb, width: 3 }); ring.visible = false;
      node.alpha = control.disabled ? .43 : 1; node.eventMode = control.disabled ? 'none' : 'static';
      node.cursor = control.disabled ? 'default' : 'pointer'; node.interactiveChildren = false;
      node.hitArea = { contains: (px, py) => Math.abs(px) <= w/2 && Math.abs(py) <= h/2 };
      node.on('pointertap', () => activate(control.id));
      node.on('pointerover', () => { face.alpha = .8; render(); });
      node.on('pointerout', () => { face.alpha = 1; render(); });
      currentControls.push(control); buttons.set(control.id, { control, ring, face });
    };
    const updateMotion = (deltaMS: number) => {
      const active = !reduced && screen === 'cover';
      if (active) time += Math.min(deltaMS, 50) / 1000;
      pointerX = active ? smoothPointer(pointerX, targetX, deltaMS) : 0;
      pointerY = active ? smoothPointer(pointerY, targetY, deltaMS) : 0;
      background.position.set(viewport.width/2-pointerX*2.8, viewport.height/2-pointerY*1.5);
      actors.forEach(actor => {
        deformActor(actor.geometry.vertices, actor.geometry.rest, actor.texture.width, actor.texture.height, time, actor.index * 1.7, pointerX, pointerY, !active);
        actor.mesh.x = actor.x+pointerX*(actor.index === 0 ? 3 : 4); actor.shadow.x = actor.mesh.x+3;
      });
    };
    const layout = () => {
      if(screen==='battle'){battleView?.resize(viewport);return;}
      const { width: W, height: H } = viewport, portrait = H > W;
      background.scale.set(Math.max(W/backgroundTexture.width,H/backgroundTexture.height)*1.025);
      background.position.set(W/2,H/2);
      shade.clear().rect(0,0,W,H).fill({ color: C.ink, alpha: screen === 'cover' ? .06 : .7 });
      layers.interface.removeChildren().forEach(node => node.destroy({ children: true })); currentControls = []; buttons.clear();
      actors.forEach(actor => {
        const spec = COVER_ART[actor.key], height = portrait ? 480 : actor.index === 0 ? 570 : 595;
        actor.x = portrait ? (actor.index === 0 ? 190 : 527) : (actor.index === 0 ? 264 : 1030);
        actor.y = portrait ? 915 : 661; actor.mesh.scale.set(height/(spec.bounds[3]-spec.bounds[1]));
        actor.mesh.position.set(actor.x,actor.y); actor.mesh.alpha = screen === 'cover' ? 1 : .18;
        actor.shadow.clear().ellipse(0,0,portrait ? 105 : 130,12).fill({ color: 0x080e1b, alpha: screen === 'cover' ? .38 : .08 });
        actor.shadow.position.set(actor.x+3,actor.y+2);
      });
      if (screen === 'cover') {
        const title = label('數學勇者',W/2,portrait ? 188 : 178,portrait ? 112 : 110,layers.interface,true);
        if (title.width > (portrait ? 630 : 520)) title.scale.set((portrait ? 630 : 520)/title.width);
        label('算出答案，迎戰傳說',W/2,portrait ? 315 : 295,portrait ? 36 : 31,layers.interface,true);
        button({ id:'start',label:'開始冒險' },W/2,portrait ? 1042 : 546,portrait ? 422 : 300,portrait ? 104 : 74,portrait ? 48 : 38);
      } else if(screen==='stages') {
        label('選擇關卡',W/2,portrait?160:112,portrait?64:50,layers.interface,true);
        label(selected!,W/2,portrait?245:180,portrait?29:25);
        STAGES.forEach((stage,i)=>button({id:`stage:${i}`,label:`${stage.name}\n${stage.enemy}`},W/2, (portrait?387:267)+i*(portrait?137:77),portrait?580:700,portrait?110:64,portrait?32:26));
        button({id:'units',label:'返回單元'},W/2,portrait?1158:685,portrait?350:230,portrait?86:46,portrait?32:25);
      } else if(screen==='battle-loading'||screen==='battle-error') {
        label(screen==='battle-loading'?'正在準備決戰場…':'戰鬥素材載入失敗',W/2,H*.45,portrait?42:36);
        if(screen==='battle-error')button({id:'reload-battle',label:'重新載入'},W/2,H*.6,portrait?450:350,portrait?90:66,32);
        button({id:'units',label:'返回單元'},W/2,H*.78,portrait?350:270,portrait?80:58,28);
      } else {
        label('選擇冒險單元',W/2,portrait ? 180 : 78,portrait ? 60 : 46,layers.interface,true);
        label('選擇已開放的題庫，進入五關挑戰',W/2,portrait ? 244 : 139,portrait ? 28 : 23);
        for (const [i,name] of ['五上','六上'].entries()) button({ id:`grade:${name}`,label:name,selected:grade===name },W/2+(i-.5)*(portrait ? 240 : 200),portrait ? 324 : 199,portrait ? 200 : 170,portrait ? 86 : 52,portrait ? 38 : 28);
        CURRICULUM[grade].forEach((unit,i) => {
          const ready = isUnitReady(grade,unit.name), number = unit.endNumber ? `${unit.number}–${unit.endNumber}` : String(unit.number);
          button({ id:`unit:${unit.name}`,label:`${number} ${unit.name}${ready ? '' : '（尚未開放）'}`,disabled:!ready,selected:selected===unit.name },
            W/2+(i%2-.5)*(portrait ? 344 : 470),(portrait ? 446 : 277)+Math.floor(i/2)*(portrait ? 121 : 63),
            portrait ? 320 : 440,portrait ? 108 : 54,portrait ? (ready ? 29 : 25) : 25,
            portrait && !ready ? `${number} ${unit.name}\n尚未開放` : `${number} ${unit.name}${ready ? '' : '（尚未開放）'}`);
        });
        label('答對出劍並壓回敵人蓄力\n答錯或敵人蓄力滿時受到攻擊',W/2,portrait ? 1032 : 609,portrait ? 30 : 24,layers.interface,false,portrait ? 650 : 1100);
        button({ id:'back',label:'返回封面' },W/2,portrait ? 1176 : 681,portrait ? 360 : 250,portrait ? 88 : 54,portrait ? 34 : 27);
      }
      const fullHeight=Math.max(portrait?64:48,44/viewport.scale);
      button({id:'fullscreen',label:fullscreen?'退出全螢幕':'全螢幕'},W-(portrait?118:109),Math.max(portrait?48:44,fullHeight/2+12),portrait?202:190,fullHeight,portrait?29:25);
      if (focused && buttons.has(focused)) buttons.get(focused)!.ring.visible = true;
      hooks.controls?.(currentControls); updateMotion(0); render();
    };
    const syncTicker = () => {
      if (disposed) return;
      app!.ticker.maxFPS=screen==='battle'?60:40;
      if (document.hidden || (screen !== 'battle' && (reduced || screen !== 'cover'))) { app!.stop(); updateMotion(0); render(); } else app!.start();
    };
    const resize = () => {
      if (disposed) return;
      const width = Math.max(1,host.clientWidth), height = Math.max(1,host.clientHeight);
      app!.renderer.resize(width,height,Math.min(window.devicePixelRatio || 1,2));
      viewport = fitViewport(width,height); root.scale.set(viewport.scale); root.position.set(viewport.x,viewport.y); layout(); syncTicker();
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced) return;
      const box = app!.canvas.getBoundingClientRect();
      targetX = Math.max(-1,Math.min(1,(event.clientX-box.left)/Math.max(1,box.width)*2-1));
      targetY = Math.max(-1,Math.min(1,(event.clientY-box.top)/Math.max(1,box.height)*2-1));
    };
    const pointerLeave = () => { targetX = targetY = 0; };
    const motionChanged = () => { reduced = media.matches; pointerLeave(); battleView?.setReduced(reduced);syncTicker(); };
    const visibility = () => { pointerLeave();if(document.hidden)battleView?.hide();syncTicker(); };
    const canvas = app.canvas; canvas.setAttribute('aria-hidden','true'); host.append(canvas);
    canvas.addEventListener('pointermove',pointerMove); canvas.addEventListener('pointerleave',pointerLeave);
    media.addEventListener('change',motionChanged); document.addEventListener('visibilitychange',visibility);
    releases.push(() => canvas.removeEventListener('pointermove',pointerMove),() => canvas.removeEventListener('pointerleave',pointerLeave),
      () => media.removeEventListener('change',motionChanged),() => document.removeEventListener('visibilitychange',visibility));
    app.ticker.maxFPS = 40; app.ticker.add(ticker => { if (!disposed){if(screen==='battle')battleView?.update(ticker.deltaMS);else updateMotion(ticker.deltaMS);} });
    observer = new ResizeObserver(resize); observer.observe(host); resize();
    return { layers,get viewport() { return viewport; },render,activate,
      fullscreen(value){if(disposed||fullscreen===value)return;fullscreen=value;if(screen==='battle')battleView?.setFullscreen(value);else layout();},
      focus(id) { if(screen==='battle'){battleView?.focus(id);return;}focused = id; buttons.forEach((item,key) => { item.ring.visible = key === id; }); render(); },destroy };
  } catch (error) {
    destroy();
    if (!initialized && app?.renderer) (app.renderer as App['renderer'] & { destroy(options: { removeView: boolean }): void }).destroy({ removeView:true });
    throw error;
  }
}
