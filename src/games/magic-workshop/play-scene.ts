import { ART, GUESTS, REACTIONS, artUrl, type ArtKey } from './art';
import { UI_ART, type UiArtKey } from './ui-art';
import { createPaintLayer, placeIllustration, type PaintLayer } from './sprite-paint';
import { GuestMotion } from './guest-motion';
import { loadCharacterImage } from './character-scene';
import { applyAction } from './rules';
import { currentPuzzle, performanceStars } from './session';
import { isSession, sceneDialogue, targetAction, type SceneControl, type SceneModel, type SceneSound } from './scene-model';
import type { Graphic, Label, Node, Pixi, Sprite, Texture } from './scene-types';

export interface PlayScene {
  update(model: SceneModel): void; focus(id: string | null): void; activate(id: string): void;
  cancel(): void; motion(reduced: boolean): void; destroy(): void;
}
interface Hooks {
  activate(id: string): void; controls(controls: SceneControl[]): void; sound(cue: SceneSound): void;
}
interface Bottle { node: Node; liquid: Sprite; surface: Sprite; liquidMask: Graphic; number: Label; x: number; y: number; w: number; h: number; amount: number; capacity: number }
interface Tween { elapsed: number; duration: number; step(t: number): void }
const C = { ink: 0x30233e, paper: 0xf4dda8, gold: 0xffd66b, teal: 0x65e0d0, lavender: 0xb79af4 };
const INTRO_KEY = 'knowledge114-workshop-demonstrated-v1';
const ease = (t: number) => 1 - (1 - t) ** 3;

/** One Pixi stage for the entire workshop. Pointer hit areas and assistive controls share coordinates. */
export async function createPlayScene(host: HTMLElement, initial: SceneModel, parentSignal: AbortSignal, hooks: Hooks): Promise<PlayScene> {
  const controller = new AbortController();
  const signal = controller.signal;
  const abort = () => controller.abort();
  parentSignal.addEventListener('abort', abort, { once: true });
  if (parentSignal.aborted) controller.abort();
  const P = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Pixi;
  signal.throwIfAborted();
  const app = new P.Application();
  const textures = new Map<string, Texture>();
  const releases: (() => void)[] = [() => parentSignal.removeEventListener('abort', abort)];
  let initialized = false, disposed = false;
  let model = initial, reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let controls: SceneControl[] = [], bottles: Bottle[] = [], tweens: Tween[] = [];
  let time = 0, W = 1200, H = 800, scale = 1, offsetX = 0, offsetY = 0;
  let focused: string | null = null, hovered: string | null = null;
  let drag: { index: number; pointer: number; startX: number; startY: number; moved: boolean } | null = null;
  let tutorialSeen = false, tutorial = false, demoBottle: Node | null = null;
  let glow: PaintLayer, effects: PaintLayer, focusRing: PaintLayer, foreground: Node, world: Node;
  let milo: Node | null = null, miloY = 0, celebration = 3;
  let font: FontFace | null = null;
  const guestMotion = new GuestMotion();
  let stars: Node[] = [], starDust: PaintLayer;
  let starChange: { from: number; to: number; elapsed: number } | null = null;
  let pendingDelivery = false;
  try { tutorialSeen = localStorage.getItem(INTRO_KEY) === '1'; } catch { /* Still show once per mount. */ }
  const destroy = () => {
    if (disposed) return;
    disposed = true; controller.abort(); tweens = []; releases.splice(0).forEach(fn => fn());
    if (initialized) app.destroy({ removeView: true }, { children: true });
    textures.forEach(t => t.destroy(true)); textures.clear();
    if (font) document.fonts.delete(font);
  };
  try {
    await app.init({ width: 1200, height: 800, background: C.ink, antialias: true, autoStart: false,
      preference: 'webgl', resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true });
    initialized = true; signal.throwIfAborted();
    // Own every texture; an aborted mount cannot unload the next mount's resources.
    const keys = Object.keys(ART) as ArtKey[];
    await Promise.all([
      ...Object.entries(UI_ART).map(async ([key, spec]) => {
        const image=await loadCharacterImage(artUrl(spec.file),signal);
        signal.throwIfAborted();textures.set(`ui:${key}`,P.Texture.from(image));
      }),
      ...keys.map(async key => {
        const image = await loadCharacterImage(artUrl(ART[key].file), signal);
        signal.throwIfAborted(); textures.set(key, P.Texture.from(image));
      }),
      ...GUESTS.flatMap(guest => Array.from({length:6}, (_, frame) => (async () => {
        const image = await loadCharacterImage(artUrl(`guest-${guest.art}-walk-v1-${frame}.png`), signal);
        signal.throwIfAborted(); textures.set(`${guest.art}:${frame}`, P.Texture.from(image));
      })())),
      (async () => {
        const image = await loadCharacterImage(artUrl('workbench-twilight-v1.png'), signal);
        signal.throwIfAborted(); textures.set('background', P.Texture.from(image));
      })(),
      (async () => {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}assets/fonts/workshop/workshop-rounded.woff2`, { signal });
          if (!response.ok) return;
          const loaded = await new FontFace('Workshop Rounded', await response.arrayBuffer()).load();
          if (signal.aborted || disposed) return;
          font = loaded; document.fonts.add(loaded);
        } catch { /* System Traditional Chinese font is a legible fallback. */ }
      })(),
    ]);
    signal.throwIfAborted();
    const background = app.stage.addChild(new P.Sprite(textures.get('background')!));
    world = app.stage.addChild(new P.Container());
    const actors = world.addChild(new P.Container());
    const visitor = actors.addChild(new P.Sprite(textures.get('rabbit:5')!));
    const visitorFront = actors.addChild(new P.Sprite(textures.get('rabbit:5')!));
    const hero = actors.addChild(new P.Container());
    visitor.anchor.set(.5, 448/512); visitorFront.anchor.set(.5, 448/512);
    const tabletop = world.addChild(new P.Sprite(textures.get('background')!));
    const tableMask = world.addChild(new P.Graphics()); tabletop.mask = tableMask;
    foreground = world.addChild(new P.Container());
    glow = world.addChild(createPaintLayer(P,textures));
    effects = world.addChild(createPaintLayer(P,textures));
    focusRing = world.addChild(createPaintLayer(P,textures));

    const illustration=(key:UiArtKey,x:number,y:number,w:number,h:number,parent=foreground,stretch=false)=>
      placeIllustration(parent.addChild(new P.Sprite(textures.get(`ui:${key}`)!)),key,textures,x,y,w,h,stretch);
    const graphic = (parent = foreground) => parent.addChild(new P.Graphics());
    const group = (x = 0, y = 0, parent = foreground) => { const node = parent.addChild(new P.Container()); node.position.set(x, y); return node; };
    const text = (value: string, x: number, y: number, size = 26, color = C.paper, parent = foreground, width?: number, heavy = false) => {
      const node = parent.addChild(new P.Text({ text: value, style: {
        fontFamily: ['Workshop Rounded', 'Microsoft JhengHei', 'sans-serif'], fontSize: size, fontWeight: heavy ? '900' : '400',
        fill: color, align: 'center', lineHeight: size * 1.35, ...(width ? { wordWrap: true, wordWrapWidth: width, breakWords: true } : {}),
        ...(heavy ? { stroke: { color: C.ink, width: size > 50 ? 7 : 4 }, dropShadow: { color: 0x170e22, alpha: .55, blur: 2, distance: 4, angle: Math.PI / 2 } } : {}),
      } }));
      node.anchor.set(.5, .5); node.position.set(x, y); return node;
    };
    const art = (key: ArtKey, x: number, y: number, width: number, height: number, parent = foreground) => {
      const texture = textures.get(key)!;
      const [left, top, right, bottom] = ART[key].bounds;
      const sprite = parent.addChild(new P.Sprite(texture));
      sprite.anchor.set((left + right) / 2 / 1254, bottom / 1254);
      sprite.scale.set(Math.min(width / (right - left), height / (bottom - top)) * 1254 / texture.width);
      sprite.position.set(x, y); return sprite;
    };
    const portraitArt = (key: ArtKey, x: number, y: number) => {
      const node=group(x,y), texture=textures.get(key)!, [l,t,r,b]=ART[key].bounds;
      illustration('bloom',0,0,95,95,node).alpha=.3;
      const sprite=node.addChild(new P.Sprite(texture));
      const face=key.startsWith('rabbit')?.4:key.startsWith('guide')?.36:.3;
      const centre=key.startsWith('rabbit')?.4:key.startsWith('fox')?.44:.5;
      sprite.anchor.set((l+(r-l)*centre)/1254,(t+(b-t)*face)/1254);
      sprite.scale.set(125/(r-l)*1254/texture.width);
      const mask=graphic(node).circle(0,0,40).fill(0xffffff);sprite.mask=mask;
    };
    const shadow = (x:number,y:number,radius:number) => { illustration('shadow',x+8,y+1,radius*2.2,24,foreground,true).alpha=.75; };
    const paper = (x:number,y:number,w:number,h:number,parent=foreground) => illustration('parchment',x,y,w,h,parent,true);
    const addControl = (id: string, label: string, x: number, y: number, w: number, h: number, disabled = false, selected = false) => {
      controls.push({ id, label, x: x-w/2, y: y-h/2, w, h, disabled, selected });
    };
    const woodSign = (id: string, label: string, x: number, y: number, width: number, selected = false, disabled = false) => {
      const node = group(x, y); node.alpha = disabled ? .4 : 1;
      illustration('wood',0,0,width,65,node,true);
      if(selected)illustration('halo',0,22,width+12,42,node,true).alpha=.4;
      text(label,0,0,25,C.paper,node,undefined,true);
      addControl(id,label,x,y,width+12,76,disabled,selected);
    };
    const ring = (x: number,y: number,w: number,color: number,alpha = 1) => {
      const sprite=glow.paint('halo',x,y,w+20,44,alpha,true);sprite.tint=color;
    };
    const tween = (duration: number, step: (t: number) => void) => {
      if (reduced || document.hidden) step(1);
      else { step(0); tweens.push({ elapsed:0,duration,step }); }
    };
    const makeBottle = (x: number,y: number,w: number,h: number,amount: number,capacity: number,parent = foreground): Bottle => {
      // Fit geometry to the artwork's visible aspect ratio, including on narrow four-bottle layouts.
      h=Math.min(h,w*851/560);w=h*560/851;
      const node = group(x,y,parent);
      // Existing glass artwork sits behind the measured liquid; its opaque center cannot hide the level.
      const glass=art('bottle',0,0,w,h,node);glass.alpha=.9;glass.tint=0xead8bd;
      const liquid=illustration('liquid',0,-h*.36,w*1.35,h*.9,node,true);
      const liquidMask=graphic(node);liquid.mask=liquidMask;
      const surface=illustration('surface',0,-h*.2,w*.83,12,node,true);
      const number = text(String(amount),0,-h*.4,48,0xf8fff5,node,undefined,true);
      text(`/ ${capacity}`,0,-h*.2,23,C.paper,node,undefined,true);
      return {node,liquid,surface,liquidMask,number,x,y,w,h,amount,capacity};
    };
    const liquidDraw = (b: Bottle, amount: number, phase = 0) => {
      b.liquidMask.clear();b.liquid.visible=b.surface.visible=amount>.001;if(amount<=.001)return;
      const fraction=Math.min(1,amount/b.capacity),bottom=-b.h*.085;
      const top=bottom-fraction*b.h*.55,half=b.w*.425;
      // Geometry only clips the generated liquid illustration; it never paints visible icons/effects.
      b.liquidMask.rect(-half,top,half*2,bottom-top).fill(0xffffff);
      b.surface.y=top+Math.sin(phase)*1.5;b.surface.rotation=Math.sin(phase)*.015;
    };
    const clearForeground = () => { foreground.removeChildren().forEach(n=>n.destroy({children:true})); hero.removeChildren().forEach(n=>n.destroy({children:true})); stars=[];bottles=[]; controls=[]; tweens=[]; glow.clear(); effects.clear(); focusRing.clear(); milo=null; demoBottle=null; tutorial=false; };
    const stopTutorial = () => {
      if (!tutorial) return;
      tutorial = false; tweens=[]; demoBottle?.destroy({children:true}); demoBottle=null; effects.clear();effects.alpha=1;
      bottles.forEach((b,i)=>{ b.node.alpha=1; liquidDraw(b,model.game.amounts[i]); });
    };
    const valid = (id: string, from = drag?.index ?? model.game.selected) => {
      if (from === null || model.game.screen !== 'playing') return false;
      const action=targetAction(from,id);
      return !!action && !!applyAction(currentPuzzle(model.game).capacities,model.game.amounts,action);
    };
    const highlight = () => {
      glow.clear(); focusRing.clear();
      if (isSession(model.game)) {
        const spring = controls.find(c=>c.id==='spring');
        if(spring)glow.paint('bloom',spring.x+spring.w/2,spring.y+spring.h*.73,190,150,.22);
        controls.forEach(c=>{
          if ((c.id==='spring'||c.id==='recycler'||c.id.startsWith('bottle:')) && (valid(c.id)||c.selected)) ring(c.x+c.w/2,c.y+c.h-8,c.w*.8,c.selected?C.gold:C.teal,hovered===c.id?1:.6);
        });
      }
      const c=controls.find(c=>c.id===(focused??hovered) && !c.disabled);
      if(c) {
        focusRing.paint('mote',c.x+7,c.y+c.h/2,32,32);
        focusRing.paint('mote',c.x+c.w-7,c.y+c.h/2,32,32);
      }
    };
    const drawProgress = (y: number) => {
      const g=model.game;
      for(let i=0;i<5;i++) {
        const x=W/2+(i-2)*52, lit=g.screen==='finished'||i<g.index||(!g.practice&&g.screen==='ready'&&i===g.index), current=isSession(g)&&!g.practice&&i===g.index;
        if(current)illustration('halo',x,y+18,52,26);
        const bottle=art('gift',x,y+28,39,57);bottle.alpha=lit||current?1:.4;bottle.tint=lit||current?0xffffff:0xa99dac;
      }
    };
    const bubble = (x: number,y: number,width: number,value: string) => {
      const lines=value.split('\n').length, height=Math.max(96,lines*35+28);
      illustration('speech',x,y+8,width+30,height+52,foreground,true);
      text(value,x,y-6,24,C.ink,foreground,width-35);
    };
    const drawMilo = () => {
      const happy=['ready','finished','practice-done'].includes(model.game.screen);
      const portrait=W===600;
      const x=portrait?494:939, y=portrait?606:553;
      milo=art(happy?'guideHappy':'guide',x,y,portrait?146:198,portrait?255:330,hero); miloY=y;
      text('米洛',x,portrait?557:450,19,C.paper,foreground,undefined,true);
      bubble(portrait?423:929,portrait?209:143,portrait?290:320,pendingDelivery?`${GUESTS[model.game.index].name}要出發了。\n下一份心意，也一起加油！`:sceneDialogue(model.game));
    };
    const drawGuest = () => {
      const index=guestMotion.index, pose=guestMotion.pose(), portrait=W===600;
      visitor.visible=visitorFront.visible=index!==null;
      if(index===null)return;
      const key=GUESTS[index].art, size=portrait?.8:1.055;
      const y=(portrait?623:551)+pose.bob;
      visitor.texture=textures.get(`${key}:${pose.frame}`)!;
      visitorFront.texture=textures.get(`${key}:5`)!;
      [visitor,visitorFront].forEach((sprite: Sprite)=>{sprite.position.set(W*pose.x,y);sprite.scale.set(size*pose.facing,size);});
      visitorFront.scale.x=size;
      visitor.alpha=pose.alpha*(1-pose.turnMix);visitorFront.alpha=pose.alpha*pose.turnMix;
      // Front-facing idle has a restrained breathing motion, with feet staying planted.
      if(guestMotion.phase==='idle')visitor.scale.y=size*(1+Math.sin(time*1.8)*.003);
    };
    const paintStars = () => {
      if(!stars.length)return;
      const count=performanceStars(model.game.history.length,currentPuzzle(model.game).minimumSteps);
      const t=starChange?Math.min(1,starChange.elapsed/700):1;
      starDust.clear();
      stars.forEach((star,i)=>{
        const before=starChange?i<starChange.from:i<count, after=i<count;
        star.alpha=after?1:0;star.scale.set(1);star.rotation=0;
        if(t<1&&before!==after){
          star.alpha=after?ease(t):1-ease(t);star.scale.set(1+Math.sin(t*Math.PI)*.35);star.rotation=(after?-1:1)*Math.sin(t*Math.PI)*.2;
          for(let j=0;j<7;j++){const a=j*2.399,r=12+t*35;starDust.paint('mote',star.x+Math.cos(a)*r,star.y+Math.sin(a)*r+t*t*24,12,12,1-t);}
        }
      });
    };
    const drawHome = () => {
      const portrait=W===600;
      text('暮光',W/2,portrait?76:90,25,C.gold,foreground,undefined,true);
      text('魔法工坊',W/2,portrait?130:152,portrait?62:78,C.paper,foreground,undefined,true);
      text('每一份剛剛好，都是小小的魔法',W/2,portrait?194:224,portrait?23:25,C.paper,foreground,undefined,true);
      // Illustrated spellbooks distinguish difficulty from the three performance crystals.
      const cy=portrait?623:526, paperW=portrait?530:560;
      paper(W/2,cy,paperW,portrait?414:390);
      text('今晚的委託',W/2,cy-139,32,C.ink);
      [3,4,5].forEach((level,i)=>{
        const x=W/2+(i-1)*(portrait?151:157), selected=model.difficulty===level;
        if(selected)illustration('halo',x,cy-37,122,45);
        illustration((['book-beginner','book-advanced','book-master'] as const)[i],x,cy-62,100,96);
        text(['初階','進階','大師'][i],x,cy+2,24,C.ink);
        addControl(`difficulty:${level}`,`${['初階','進階','大師'][i]}委託`,x,cy-52,136,124,false,selected);
      });
      woodSign('start','開始五關委託',W/2,cy+72,300);
      text('操作練習',W/2-113,cy+141,23,0x544030); addControl('practice','先做操作練習',W/2-113,cy+141,174,76);
      text('重玩代碼',W/2+113,cy+141,23,0x544030); addControl('code','輸入重玩代碼',W/2+113,cy+141,174,76);
      if(!portrait) { shadow(963,670,90); milo=art('guide',963,670,215,320); miloY=670; bubble(900,300,310,'我是米洛。\n今晚，也讓魔法發光吧！'); }
      else { milo=art('guide',454,426,130,185); miloY=426; }
    };
    const drawEnding = () => {
      const g=model.game, portrait=W===600, practice=g.screen==='practice-done';
      text(practice?'第一束魔法，亮了！':'森林因你而閃耀',W/2,portrait?90:105,portrait?42:55,C.paper,foreground,undefined,true);
      drawProgress(portrait?155:172);
      const cy=portrait?477:464;
      paper(portrait?260:495,cy,portrait?455:610,practice?270:400);
      if(practice) text('練習完成\n準備迎接第一位客人吧',portrait?260:495,cy-30,32,C.ink);
      else {
        text('今日的魔力結晶',portrait?260:495,cy-150,32,C.ink);
        g.results.forEach((r,i)=>{
          const cx=portrait?260:495,y=cy-88+i*47;
          text(`第 ${i+1} 份`,cx-165,y,22,C.ink);
          for(let j=0;j<3;j++)illustration(j<performanceStars(r.steps,r.minimumSteps)?'crystal-lit':'crystal-dim',cx-85+j*31,y,26,36);
          text(`${r.steps} 步 · 最短 ${r.minimumSteps}`,cx+95,y,portrait?19:23,C.ink);
        });
        text(`重玩代碼  ${g.seed}  ·  ${['初階','進階','大師'][g.difficulty-3]}`,portrait?260:495,cy+159,21,0x665044);
      }
      milo=art('guideHappy',portrait?495:973,portrait?710:640,portrait?144:230,portrait?220:340); miloY=portrait?710:640;
      if(!portrait) bubble(940,275,310,'五份心意，都送到了！\n謝謝你的魔法。');
      const y=portrait?800:713;
      woodSign('start',practice?'開始五關委託':'接新委託',portrait?W/2:W/2+130,y,250);
      if(!practice) woodSign('replay','再挑戰一次',portrait?W/2:W/2-170,portrait?889:y,250);
      text('回到工坊',W/2,portrait?965:775,22,C.paper,foreground,undefined,true);addControl('home','回到工坊首頁',W/2,portrait?955:768,190,64);
    };
    const drawSession = (animate: boolean) => {
      const g=model.game, p=currentPuzzle(g), portrait=W===600;
      text('魔法工坊',portrait?110:155,portrait?44:49,portrait?26:32,C.paper,foreground,undefined,true);
      drawProgress(portrait?97:60);
      const px=portrait?135:226, py=portrait?319:266, pw=portrait?232:260;
      paper(px,py,pw,298);
      const guest=g.practice?null:GUESTS[g.index];
      text(guest?`${guest.name}的訂單`:'米洛的小委託',px,py-112,23,C.ink);
      const portraitKey=guest?.art??'guide';
      portraitArt(g.screen==='ready'?(REACTIONS[portraitKey]??portraitKey):portraitKey,px-65,py-30);
      text(String(p.target),px+31,py-28,78,C.paper,foreground,undefined,true);
      text('單位魔力液',px+27,py+27,20,0x5c443c);
      text(g.practice?'練習':`${['初階','進階','大師'][g.difficulty-3]}委託`,px,py+59,17,0x795842);
      if(!g.practice){
        for(let i=0;i<3;i++){
          const x=px+(i-1)*43,y=py+92;
          illustration('crystal-dim',x,y,30,40);
          const crystal=group(x,y);illustration('crystal-lit',0,0,30,40,crystal);stars.push(crystal);
        }
        starDust=foreground.addChild(createPaintLayer(P,textures));text(`全亮：${p.minimumSteps} 步內`,px,py+127,20,0x624934);
        paintStars();
      }
      drawMilo();
      const by=portrait?801:635, count=p.capacities.length;
      const bw=portrait?(count===4?92:110):(count===4?110:130), bh=portrait?(count===4?184:205):206;
      const span=portrait?430:610;
      const sx=portrait?82:139, rx=portrait?514:1061, sy=portrait?652:605;
      shadow(sx,sy,portrait?40:59); shadow(rx,sy,portrait?53:77);
      const spring=art('spring',sx,sy,portrait?115:155,portrait?176:229);spring.tint=0xd5d6bd;
      const recycler=art('recycler',rx,sy,portrait?145:198,portrait?118:161);recycler.tint=0xd2beb2;
      addControl('spring','魔力泉，補滿選取的瓶子',sx,sy-(portrait?88:114),portrait?130:175,portrait?192:246,g.screen!=='playing');
      addControl('recycler','回收釜，倒空選取的瓶子',rx,sy-(portrait?57:78),portrait?157:214,portrait?140:185,g.screen!=='playing');
      p.capacities.forEach((capacity,i)=>{
        const x=W/2+(i-(count-1)/2)*Math.min(span/count,portrait?172:231);
        shadow(x,by,bw*.52);
        const b=makeBottle(x,by,bw,bh,g.amounts[i],capacity);bottles.push(b);
        text(`${i+1}`,x,by+27,20,C.paper,foreground,undefined,true);
        addControl(`bottle:${i}`,`第 ${i+1} 瓶，容量 ${capacity} 單位，目前 ${g.amounts[i]} 單位`,x,by-b.h/2,b.w+18,b.h+16,g.screen!=='playing',g.selected===i);
        const before=animate?g.history.at(-1)?.before[i]:undefined;
        if(before!==undefined && before!==g.amounts[i]) tween(550,t=>{ b.amount=before+(g.amounts[i]-before)*ease(t);liquidDraw(b,b.amount,t*14); });
        else liquidDraw(b,b.amount);
        if(g.selected===i)tween(180,t=>{b.node.scale.set(1+.04*Math.sin(t*Math.PI),1-.04*Math.sin(t*Math.PI));});
      });
      const bottom=portrait?910:743;
      text(`${g.history.length} 步`,portrait?80:168,portrait?853:699,26,0xf3e8d0);
      woodSign('undo','復原',portrait?100:180,bottom,portrait?151:173,false,!g.history.length);
      woodSign('restart','重試',portrait?300:405,bottom,portrait?151:173,false,!g.history.length);
      woodSign('hint','靈感',portrait?500:630,bottom,portrait?151:173,false,g.screen!=='playing'||g.hintLevel===2);
      text('回到工坊',portrait?450:1031,portrait?975:748,21,C.paper,foreground,undefined,true);addControl('home','回到工坊首頁',portrait?450:1031,portrait?964:747,165,65);
      if(g.screen==='ready') {
        const x=portrait?300:857, y=portrait?508:681;
        art('gift',x-100,y+22,48,68);
        woodSign('deliver',pendingDelivery?'客人正在道別…':g.practice?'完成練習':g.index===4?'交付 · 看成果':'交付這份魔法',x+12,y,portrait?271:258,true,pendingDelivery);
      }
    };
    const drawCode = () => {
      foreground.removeChildren().forEach(n=>n.destroy({children:true})); controls=[];bottles=[];tweens=[];milo=null;
      const veil=foreground.addChild(new P.Sprite(textures.get('background')!));veil.width=W;veil.height=H;veil.tint=0x30233e;veil.alpha=.92;
      const cy=H/2;paper(W/2,cy,Math.min(540,W-30),700);
      text('重逢的魔法密碼',W/2,cy-285,32,C.ink);
      text(model.seed||'—',W/2,cy-210,40,C.ink);
      const startY=cy-116;
      ['1','2','3','4','5','6','7','8','9','⌫','0','清除'].forEach((value,i)=>{
        const x=W/2+(i%3-1)*140,y=startY+Math.floor(i/3)*82;
        illustration('wood',x,y,92,65,foreground,true);text(value==='⌫'?'刪除':value,x,y,27,C.paper);
        addControl(`key:${value}`,value==='⌫'?'刪除一位':value,x,y,100,76);
      });
      woodSign('code-start','開啟相同委託',W/2,cy+238,310,false,model.seed===''||Number(model.seed)>4294967295);
      text('返回',W/2,cy+310,23,C.ink);addControl('code','返回工坊',W/2,cy+310,180,64);
    };
    const rebuild = (animate = false) => {
      clearForeground();
      // The painting covers the physical viewport; only interactive composition uses a safe fit.
      tabletop.scale.set(background.scale.x/scale);tabletop.position.set((background.x-offsetX)/scale,(background.y-offsetY)/scale);
      tableMask.clear().rect(0,H*.555,W,H*.445).fill(0xffffff);
      if(model.game.screen==='home')drawHome();else if(isSession(model.game))drawSession(animate);else drawEnding();
      if(model.codeOpen)drawCode();
      if(pendingDelivery)controls=controls.map(c=>({...c,disabled:c.id!=='home'}));
      if(model.fullscreen){illustration('door',W-44,44,40,52);addControl('fullscreen','退出全螢幕',W-44,44,72,76);}
      drawGuest();highlight();hooks.controls(controls);app.render();
    };
    const cancel = () => {
      if(drag){ const b=bottles[drag.index]; if(b){ b.node.position.set(b.x,b.y);b.node.scale.set(1);b.node.rotation=0; } }
      const pointer=drag?.pointer;drag=null;
      if(pointer!==undefined&&app.canvas.hasPointerCapture(pointer))app.canvas.releasePointerCapture(pointer);
      delete app.canvas.dataset.pressed;hovered=null;stopTutorial();highlight();app.render();
    };
    const shake = (index: number) => { const b=bottles[index];if(!b)return;tween(220,t=>{b.node.x=b.x+Math.sin(t*Math.PI*6)*(1-t)*12;}); };
    const activate = (id: string) => {
      stopTutorial();
      const c=controls.find(c=>c.id===id); if(!c||c.disabled)return;
      if(id==='deliver'&&!model.game.practice&&!reduced&&!document.hidden){
        pendingDelivery=true;guestMotion.request(null);rebuild();return;
      }
      const from=model.game.selected;
      if(from!==null && targetAction(from,id) && id!==`bottle:${from}` && !valid(id,from)){shake(from);return;}
      if(id.startsWith('bottle:')&&from===null)hooks.sound('pickup');
      hooks.activate(id);
    };
    const locate = (event: PointerEvent) => {
      const rect=app.canvas.getBoundingClientRect();
      return {x:((event.clientX-rect.left)*host.clientWidth/rect.width-offsetX)/scale,y:((event.clientY-rect.top)*host.clientHeight/rect.height-offsetY)/scale};
    };
    const hit = (x: number,y: number) => [...controls].reverse().find(c=>!c.disabled&&x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h);
    const pointerDown = (e: PointerEvent) => {
      if(e.button!==0||drag)return;stopTutorial();focused=null;
      tweens.forEach(t=>t.step(1));tweens=[];
      const point=locate(e), c=hit(point.x,point.y);if(!c)return;
      if(c.id.startsWith('bottle:')) {
        const index=Number(c.id.split(':')[1]);drag={index,pointer:e.pointerId,startX:point.x,startY:point.y,moved:false};
        app.canvas.setPointerCapture(e.pointerId);hooks.sound('pickup');
        const b=bottles[index];foreground.addChild(b.node);
        tween(130,t=>{if(drag?.index===index)b.node.scale.set(1-.04*Math.sin(t*Math.PI),1+.07*Math.sin(t*Math.PI));});
      }
      app.canvas.dataset.pressed=c.id;
    };
    const pointerMove = (e: PointerEvent) => {
      const point=locate(e), c=hit(point.x,point.y);hovered=c?.id??null;
      app.canvas.style.cursor=c?'pointer':'default';
      if(drag&&drag.pointer===e.pointerId){
        if(Math.hypot(point.x-drag.startX,point.y-drag.startY)>9)drag.moved=true;
        if(drag.moved){const b=bottles[drag.index];b.node.position.set(b.x+point.x-drag.startX,b.y+point.y-drag.startY-18);b.node.rotation=.06;}
      }
      highlight();app.render();
    };
    const pointerUp = (e: PointerEvent) => {
      if(drag&&drag.pointer!==e.pointerId)return;
      const point=locate(e),c=hit(point.x,point.y),previous=drag;
      drag=null;if(app.canvas.hasPointerCapture(e.pointerId))app.canvas.releasePointerCapture(e.pointerId);
      if(previous){
        const b=bottles[previous.index];b.node.position.set(b.x,b.y);b.node.rotation=0;b.node.scale.set(1);
        if(previous.moved){
          if(c&&valid(c.id,previous.index))hooks.activate(`drop:${previous.index}:${c.id}`);
          else if(c&&c.id!==`bottle:${previous.index}`)shake(previous.index);
          else tween(180,t=>b.node.scale.set(1+.07*Math.sin(t*Math.PI),1-.07*Math.sin(t*Math.PI)));
        } else activate(`bottle:${previous.index}`);
      }else if(c&&c.id===app.canvas.dataset.pressed)activate(c.id);
      delete app.canvas.dataset.pressed;highlight();app.render();
    };
    const resize = () => {
      if(disposed)return;cancel();
      const width=host.clientWidth||1200,height=host.clientHeight||800;
      W=width/height<.85?600:1200;H=W===600?1000:800;
      scale=Math.min(width/W,height/H);offsetX=(width-W*scale)/2;offsetY=(height-H*scale)/2;
      app.renderer.resize(width,height,Math.min(devicePixelRatio||1,2));world.scale.set(scale);world.position.set(offsetX,offsetY);
      background.scale.set(Math.max(width/background.texture.width,height/background.texture.height));background.position.set((width-background.width)/2,(height-background.height)/2);rebuild();
    };
    const startTutorial = () => {
      if(tutorialSeen||!isSession(model.game)||reduced||document.hidden||model.game.history.length)return;
      tutorialSeen=true;tutorial=true;
      try{localStorage.setItem(INTRO_KEY,'1');}catch{/* In-memory fallback. */}
      const b=bottles[0], target=controls.find(c=>c.id==='spring')!;
      const clone=makeBottle(b.x,b.y,b.w,b.h,0,b.capacity);demoBottle=clone.node;clone.node.alpha=.7;
      const endX=target.x+target.w/2+25,endY=target.y+target.h*.65;
      b.node.alpha=.4;
      tween(2800,t=>{
        if(!tutorial)return;
        const travel=ease(Math.min(1,Math.max(0,(t-.18)/.4)));
        clone.node.position.set(b.x+(endX-b.x)*travel,b.y+(endY-b.y)*travel-Math.sin(travel*Math.PI)*50);
        liquidDraw(clone,Math.max(0,(t-.62)/.18)*b.capacity);
        const x=clone.node.x+24,y=clone.node.y-70;
        effects.clear().paint('hand',x,y,70,86,.7);
        if(t>.8){clone.node.alpha=(1-t)*3.5;effects.alpha=(1-t)*5;}
        if(t===1){tutorial=false;clone.node.destroy({children:true});demoBottle=null;b.node.alpha=1;effects.clear();effects.alpha=1;}
      });
    };
    const pourEffect = () => {
      const g=model.game,a=g.lastAction;if(!a||a==='deliver')return;
      const b=bottles[a.from];if(!b)return;
      const dest=a.kind==='pour'?bottles[a.to!]:null;
      const station=controls.find(c=>c.id===(a.kind==='fill'?'spring':'recycler'));
      const start=a.kind==='fill'?{x:station!.x+station!.w/2,y:station!.y+station!.h*.27}:{x:b.x,y:b.y-b.h*.93};
      const end=dest?{x:dest.x,y:dest.y-dest.h*.93}:a.kind==='fill'?{x:b.x,y:b.y-b.h*.93}:{x:station!.x+station!.w/2,y:station!.y+station!.h*.35};
      hooks.sound('pour');
      tween(620,t=>{
        effects.clear();if(t===1){b.node.rotation=0;b.node.scale.set(1);return;}
        const alpha=Math.sin(t*Math.PI),midX=(start.x+end.x)/2,midY=Math.min(start.y,end.y)-90;
        if(a.kind!=='fill')b.node.rotation=Math.sin(t*Math.PI)*(end.x>start.x?.14:-.14);
        b.node.scale.set(1+.035*alpha,1-.035*alpha);
        for(let i=0;i<30;i++){
          const u=(i/30+t*.25)%1,v=1-u,x=v*v*start.x+2*v*u*midX+u*u*end.x,y=v*v*start.y+2*v*u*midY+u*u*end.y;
          const drop=effects.paint('drop',x,y,9,22,alpha,true);
          drop.rotation=Math.atan2(2*v*(midY-start.y)+2*u*(end.y-midY),2*v*(midX-start.x)+2*u*(end.x-midX))-Math.PI/2;
        }
        for(let i=0;i<10;i++){const phase=(t*2+i*.17)%1;effects.paint('drop',end.x+Math.sin(i*2.4)*phase*34,end.y-phase*45+phase*phase*50,6+i%3,10+i%3,(1-phase)*alpha);}
      });
      if(g.amounts.some((n,i)=>n===currentPuzzle(g).capacities[i]&&g.history.at(-1)?.before[i]!==n))hooks.sound('full');
    };
    const keydown = (e: KeyboardEvent) => {if(e.key==='Escape')cancel();};
    const finishDelivery=()=>{if(pendingDelivery&&!disposed){pendingDelivery=false;hooks.activate('deliver');}};
    const visibility=()=>{cancel();tweens.forEach(t=>t.step(1));tweens=[];effects.clear();celebration=3;guestMotion.settle();drawGuest();starChange=null;paintStars();finishDelivery();app.render();if(document.hidden)app.stop();else if(!reduced)app.start();};
    app.canvas.setAttribute('aria-hidden','true');app.canvas.style.touchAction='none';host.append(app.canvas);
    const listen = <K extends keyof HTMLElementEventMap>(name: K, fn: (event: HTMLElementEventMap[K])=>void) => {
      app.canvas.addEventListener(name,fn);releases.push(()=>app.canvas.removeEventListener(name,fn));
    };
    listen('pointerdown',pointerDown);listen('pointermove',pointerMove);listen('pointerup',pointerUp);
    listen('pointercancel',cancel);listen('lostpointercapture',()=>{if(drag)cancel();});listen('pointerleave',()=>{if(!drag){hovered=null;highlight();app.render();}});
    window.addEventListener('blur',cancel);window.addEventListener('keydown',keydown);document.addEventListener('visibilitychange',visibility);
    releases.push(()=>window.removeEventListener('blur',cancel),()=>window.removeEventListener('keydown',keydown),()=>document.removeEventListener('visibilitychange',visibility));
    const observer=new ResizeObserver(resize);observer.observe(host);releases.push(()=>observer.disconnect());
    app.ticker.maxFPS=45;
    const sparkle=world.addChild(createPaintLayer(P,textures));
    app.ticker.add(({deltaMS})=>{
      const dt=Math.min(deltaMS,50);time+=dt/1000;celebration+=dt/1000;glow.alpha=.88+Math.sin(time*1.8)*.12;
      guestMotion.advance(dt);drawGuest();
      if(guestMotion.index===null)finishDelivery();
      if(starChange){starChange.elapsed+=dt;paintStars();if(starChange.elapsed>=700)starChange=null;}
      const running=tweens;tweens=[];
      running.forEach(t=>{t.elapsed=Math.min(t.duration,t.elapsed+dt);t.step(t.elapsed/t.duration);if(t.elapsed<t.duration)tweens.push(t);});
      if(!tutorial)bottles.forEach(b=>liquidDraw(b,b.amount,time*2));
      if(milo){milo.rotation=Math.sin(time*1.5)*.007;milo.y=miloY-(celebration<1.1?Math.abs(Math.sin(celebration/1.1*Math.PI*3))*22*(1-celebration/1.1):0);}
      sparkle.clear();
      if(celebration<1.3){const t=celebration/1.3;for(let i=0;i<32;i++){const a=i*2.399,r=50+t*(95+i%6*24),x=W/2+Math.cos(a)*r,y=H*.38+Math.sin(a)*r+t*t*85;const z=(1-t)*(16+i%4*3);sparkle.paint(i%3?'mote':'star',x,y,z,z,1-t);}}
      else for(let i=0;i<14;i++)sparkle.paint('mote',30+(i*83)%W+Math.sin(time+i)*8,H*.12+(i*47)%(H*.5)+Math.sin(time*.6+i)*13,10,10,.18+Math.sin(time+i)*.12);
    });
    guestMotion.request(isSession(model.game)&&!model.game.practice?model.game.index:null,reduced||document.hidden);
    resize();if(!reduced&&!document.hidden)app.start();
    return {
      update(next){if(disposed)return;const prior=model;cancel();model=next;
        if(pendingDelivery&&(next.game.screen!=='ready'||next.game.index!==prior.game.index))pendingDelivery=false;
        guestMotion.request(!pendingDelivery&&isSession(next.game)&&!next.game.practice?next.game.index:null,reduced||document.hidden);
        if(isSession(next.game)&&isSession(prior.game)&&!next.game.practice&&currentPuzzle(next.game).id===currentPuzzle(prior.game).id){
          const from=performanceStars(prior.game.history.length,currentPuzzle(prior.game).minimumSteps),to=performanceStars(next.game.history.length,currentPuzzle(next.game).minimumSteps);
          if(from!==to)starChange=reduced||document.hidden?null:{from,to,elapsed:0};
        }else starChange=null;
        const changed=next.game.effectVersion!==prior.game.effectVersion;
        const operation=changed&&!!next.game.lastAction&&next.game.lastAction!=='deliver';
        rebuild(operation);
        if(operation)pourEffect();
        if(next.game.screen==='ready'&&prior.game.screen!=='ready'){celebration=0;hooks.sound('success');}
        if(next.game.screen==='playing'&&prior.game.screen==='home')startTutorial();
        if(reduced){tweens=[];bottles.forEach(b=>liquidDraw(b,b.amount));app.render();}
      },
      focus(id){focused=id;highlight();app.render();},activate,cancel,
      motion(value){reduced=value;cancel();tweens.forEach(t=>t.step(1));tweens=[];effects.clear();effects.alpha=1;sparkle.clear();celebration=3;guestMotion.settle();drawGuest();starChange=null;paintStars();finishDelivery();if(milo){milo.y=miloY;milo.rotation=0;}app.render();if(value||document.hidden)app.stop();else app.start();},
      destroy,
    };
  } catch(error){destroy();throw error;}
}


