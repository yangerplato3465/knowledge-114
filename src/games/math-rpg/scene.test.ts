// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createGameScene, fitViewport, type SceneLoaders } from './scene';
import type { Pixi } from '../magic-workshop/scene-types';
import { BATTLE_RULES } from './battle-model';
import { createQuestionDeck } from './question-deck';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function fixture(init = async () => {}) {
  class Container {
    children: Container[] = []; x = 0; y = 0; alpha = 1; width = 100; height = 100; visible = true;
    scale = { x:1, y:1, set: vi.fn((x:number,y=x) => { this.scale.x=x; this.scale.y=y; }) };
    position = { set: vi.fn((x:number,y:number) => { this.x=x; this.y=y; }) }; pivot = { set: vi.fn() };
    events = new Map<string, () => void>(); on(event:string, callback:()=>void) { this.events.set(event,callback); }
    addChild<T extends Container>(child:T) { this.children.push(child); return child; }
    removeChildren() { return this.children.splice(0); } destroy = vi.fn();
  }
  class Graphics extends Container {
    clear(){return this;} rect(){return this;} ellipse(){return this;} poly(){return this;}
    stroke(){return this;} fill(){return this;} moveTo(){return this;} lineTo(){return this;} roundRect(){return this;}
  }
  class Sprite extends Container { anchor={set:vi.fn()}; constructor(public texture:unknown){super();} }
  const animated: AnimatedSprite[]=[];
  class AnimatedSprite extends Sprite {
    playing=false;currentFrame=0;loop=true;onComplete:(()=>void)|null=null;textures:unknown[];
    constructor(options:{textures:unknown[];loop:boolean}){super(null);this.textures=options.textures;this.loop=options.loop;animated.push(this);}
    play(){this.playing=true;}stop(){this.playing=false;}
    gotoAndPlay(frame:number){this.currentFrame=frame;this.play();}gotoAndStop(frame:number){this.currentFrame=frame;this.stop();}
    update=vi.fn();
  }
  class Text extends Sprite { constructor(public options:{text:string;style:{fontSize:number}}){ super(null); this.width=options.text.length*options.style.fontSize; } }
  class Mesh extends Container { constructor(public options:{vertices:Float32Array}){super();} }
  const canvas = document.createElement('canvas'), tick = vi.fn();
  let frame: (ticker:{deltaMS:number})=>void = () => {};
  const app = { init:vi.fn(init),stage:new Container(),canvas,renderer:{resize:vi.fn(),destroy:vi.fn()},
    ticker:{maxFPS:0,add:vi.fn(fn=>{frame=fn;})},render:vi.fn(),start:vi.fn(),stop:vi.fn(),destroy:vi.fn(()=>canvas.remove()) };
  let resize=()=>{}, reduced=false;
  const disconnect=vi.fn(), events=new EventTarget();
  const media={get matches(){return reduced;},addEventListener:vi.fn(events.addEventListener.bind(events)),removeEventListener:vi.fn(events.removeEventListener.bind(events))};
  vi.stubGlobal('matchMedia',()=>media); vi.spyOn(document,'hidden','get').mockReturnValue(false);
  vi.stubGlobal('ResizeObserver',class {constructor(callback:()=>void){resize=callback;} observe=vi.fn();disconnect=disconnect;});
  const textureDestroy=vi.fn();
  const Assets={load:vi.fn(async(input:{src:string})=>input.src.endsWith('.webp')?{width:640,height:360}: {
    animations:{play:[{},{},{},{}]},data:{frames:{a:{duration:230},b:{duration:230},c:{duration:230},d:{duration:230}},animations:{play:['a','b','c','d']}}}),unload:vi.fn(async()=>{})};
  const pixi=vi.fn(async()=>({Application:class {constructor(){return app;}},Container,Graphics,Sprite,AnimatedSprite,Assets,Text,MeshSimple:Mesh,
    Texture:{from:(image:HTMLImageElement)=>({width:image.width,height:image.height,destroy:textureDestroy})}}) as unknown as Pixi);
  const image=(w:number,h:number)=>Object.assign(document.createElement('img'),{width:w,height:h});
  const assets=vi.fn(async()=>({background:image(1672,941),liwei:image(1024,1536),heen:image(1024,1536)}));
  const loaders:SceneLoaders={pixi,assets};
  const host=document.createElement('div');let width=1440,height=900;
  Object.defineProperties(host,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
  return {host,app,loaders,assets,pixi,disconnect,textureDestroy,tick,Assets,animated,
    frame(ms:number){frame({deltaMS:ms});},motion(value:boolean){reduced=value;events.dispatchEvent(new Event('change'));},
    resize(w:number,h:number){width=w;height=h;resize();}};
}

test('橫直向邏輯畫布等比置中，不裁切',()=>{
  for(const [w,h] of [[1440,900],[390,844],[844,390],[320,568]]){
    const v=fitViewport(w,h);expect(v.x).toBeGreaterThanOrEqual(0);expect(v.y).toBeGreaterThanOrEqual(0);
    expect(v.width*v.scale+v.x*2).toBeCloseTo(w);expect(v.height*v.scale+v.y*2).toBeCloseTo(h);
  }
});

test('封面分層、圖像成功載入才附加，取消釋放自己的材質與監聽',async()=>{
  const f=fixture(),controller=new AbortController();const scene=await createGameScene(f.host,controller.signal,f.loaders);
  expect(f.host.querySelectorAll('canvas')).toHaveLength(1);expect(Object.keys(scene.layers)).toEqual(['background','actors','effects','interface']);
  expect(f.app.init).toHaveBeenCalledWith(expect.objectContaining({autoStart:false,sharedTicker:false}));
  expect(f.app.start).toHaveBeenCalled();f.resize(390,844);expect(scene.viewport).toMatchObject({width:720,height:1280});
  controller.abort();scene.destroy();expect(f.app.destroy).toHaveBeenCalledTimes(1);expect(f.textureDestroy).toHaveBeenCalledTimes(3);
  expect(f.disconnect).toHaveBeenCalledTimes(1);expect(f.host.childNodes).toHaveLength(0);
  const count=f.app.render.mock.calls.length;f.frame(25);f.resize(800,600);scene.render();scene.activate('start');
  expect(f.app.render).toHaveBeenCalledTimes(count);
});

test('減少動態即刻回復靜止，隱藏頁停止 ticker，返回封面才恢復',async()=>{
  const f=fixture(),controller=new AbortController();const controls=vi.fn();const scene=await createGameScene(f.host,controller.signal,f.loaders,{controls});
  f.motion(true);expect(f.app.stop).toHaveBeenCalled();const starts=f.app.start.mock.calls.length;
  scene.activate('start');expect(f.app.start).toHaveBeenCalledTimes(starts);
  const entries=controls.mock.calls.at(-1)![0];expect(entries.filter((c:{id:string;disabled?:boolean})=>c.id.startsWith('unit:')&&!c.disabled)).toHaveLength(4);
  f.motion(false);expect(f.app.start).toHaveBeenCalledTimes(starts);
  scene.activate('back');expect(f.app.start.mock.calls.length).toBeGreaterThan(starts);
  vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));expect(f.app.stop).toHaveBeenCalled();scene.destroy();
});

test('尚未開放單元不能啟用，六上不借用五上題庫',async()=>{
  const f=fixture(),controls=vi.fn(),announce=vi.fn();const scene=await createGameScene(f.host,new AbortController().signal,f.loaders,{controls,announce});
  scene.activate('start');const locked=controls.mock.calls.at(-1)![0].find((c:{disabled?:boolean})=>c.disabled);
  const calls=announce.mock.calls.length;scene.activate(locked.id);expect(announce).toHaveBeenCalledTimes(calls);
  scene.activate('grade:六上');expect(controls.mock.calls.at(-1)![0].filter((c:{id:string;disabled?:boolean})=>c.id.startsWith('unit:')).every((c:{disabled:boolean})=>c.disabled)).toBe(true);scene.destroy();
});

test('引擎匯入未完成便取消，不建立 Application',async()=>{
  const f=fixture(),controller=new AbortController();let finish!:(pixi:Pixi)=>void;
  const pending=createGameScene(f.host,controller.signal,{...f.loaders,pixi:()=>new Promise(resolve=>{finish=resolve;})});
  controller.abort();finish(await f.pixi());await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(f.app.init).not.toHaveBeenCalled();
});

test('初始化途中取消，晚到的 renderer 仍銷毀且不附加',async()=>{
  let finish!:()=>void;const f=fixture(()=>new Promise<void>(resolve=>{finish=resolve;})),controller=new AbortController();
  const pending=createGameScene(f.host,controller.signal,f.loaders);await vi.waitFor(()=>expect(f.app.init).toHaveBeenCalled());
  controller.abort();finish();await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(f.app.destroy).toHaveBeenCalledTimes(1);expect(f.host.childNodes).toHaveLength(0);
});

test('圖像讀取中取消，晚到素材不能建立材質或畫布',async()=>{
  const f=fixture(),controller=new AbortController();let finish!:(images:Awaited<ReturnType<SceneLoaders['assets']>>)=>void;
  const pending=createGameScene(f.host,controller.signal,{...f.loaders,assets:()=>new Promise(resolve=>{finish=resolve;})});
  await vi.waitFor(()=>expect(f.app.init).toHaveBeenCalled());controller.abort();finish(await f.assets());
  await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(f.textureDestroy).not.toHaveBeenCalled();expect(f.host.childNodes).toHaveLength(0);
});

test('初始化失敗也釋放 renderer',async()=>{
  const f=fixture(async()=>{throw new Error('renderer unavailable');});
  await expect(createGameScene(f.host,new AbortController().signal,f.loaders)).rejects.toThrow('renderer unavailable');
  expect(f.app.renderer.destroy).toHaveBeenCalledTimes(1);expect(f.app.destroy).not.toHaveBeenCalled();
});

test('第五關接入私人 ticker，降動態仍計時，錯題解說、暫停與離場完整切換',async()=>{
  const f=fixture(),controls=vi.fn(),announce=vi.fn();
  const scene=await createGameScene(f.host,new AbortController().signal,f.loaders,{controls,announce});
  scene.activate('start');scene.activate('unit:多位小數與加減');scene.activate('stage:4');
  await vi.waitFor(()=>expect(controls.mock.calls.at(-1)![0]).toEqual(expect.arrayContaining([expect.objectContaining({id:'fight'})])));
  expect(f.animated).toHaveLength(4);scene.activate('fight');f.frame(100);
  expect(f.animated[0].update).toHaveBeenCalledWith({deltaMS:100,deltaTime:6});
  scene.activate('pause');const updates=f.animated[0].update.mock.calls.length;f.frame(30000);
  expect(f.animated[0].update).toHaveBeenCalledTimes(updates);expect(announce.mock.calls.at(-1)![0]).toContain('已暫停');
  scene.activate('resume');f.motion(true);f.frame(20000);f.frame(700);
  expect(f.animated[3].visible).toBe(true);
  expect(f.animated[3].playing).toBe(false);
  expect(f.animated[3].scale.x).toBeGreaterThan(4);
  f.frame(BATTLE_RULES.resolveMs-700);
  expect(f.animated[3].update).not.toHaveBeenCalled();
  expect(announce.mock.calls.at(-1)![0]).toContain('正解');
  expect(controls.mock.calls.at(-1)![0]).toEqual(expect.arrayContaining([expect.objectContaining({id:'continue'})]));
  scene.activate('continue');expect(announce.mock.calls.at(-1)![0]).toContain('黎薇生命 5');
  vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));
  expect(announce.mock.calls.at(-1)![0]).toContain('已暫停');
  scene.activate('back');expect(controls.mock.calls.at(-1)![0]).toEqual(expect.arrayContaining([expect.objectContaining({id:'stage:4'})]));
  expect(announce.mock.calls.at(-1)![0]).toContain('已返回選關');
  scene.activate('back');expect(controls.mock.calls.at(-1)![0]).toEqual(expect.arrayContaining([expect.objectContaining({id:'unit:多位小數與加減'})]));
  scene.destroy();await vi.waitFor(()=>expect(f.Assets.unload).toHaveBeenCalledTimes(7));
});

test('戰鬥素材載入時返回單元，晚到圖集不會蓋掉選單或建立角色',async()=>{
  const f=fixture(),controls=vi.fn();let finish!:(value:Awaited<ReturnType<typeof f.Assets.load>>)=>void;
  const pending=new Promise<Awaited<ReturnType<typeof f.Assets.load>>>(resolve=>{finish=resolve;});f.Assets.load.mockImplementation(()=>pending);
  const scene=await createGameScene(f.host,new AbortController().signal,f.loaders,{controls});
  scene.activate('start');scene.activate('unit:多位小數與加減');scene.activate('stage:4');scene.activate('back');
  finish({width:640,height:360});await vi.waitFor(()=>expect(f.Assets.unload).toHaveBeenCalledTimes(7));
  expect(f.animated).toHaveLength(0);expect(controls.mock.calls.at(-1)![0]).toEqual(expect.arrayContaining([expect.objectContaining({id:'unit:多位小數與加減'})]));
  scene.destroy();
});

test('答對有移向敵人的劍弧與命中，答錯攻擊勇者；暫停、結算與離場清除正確',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(1720000000000);
  const question=createQuestionDeck('五上','多位小數與加減',Date.now()>>>0)();
  const f=fixture(),controls=vi.fn(),requestFullscreen=vi.fn();
  const scene=await createGameScene(f.host,new AbortController().signal,f.loaders,{controls,requestFullscreen});
  scene.activate('fullscreen');expect(requestFullscreen).toHaveBeenCalledTimes(1);
  scene.fullscreen(true);expect(controls.mock.calls.at(-1)![0]).toContainEqual(expect.objectContaining({id:'fullscreen',label:'退出全螢幕'}));
  scene.activate('start');scene.activate('unit:多位小數與加減');scene.activate('stage:4');
  await vi.waitFor(()=>expect(f.animated).toHaveLength(4));
  scene.activate('fight');scene.activate(`answer:1:${question.correct}`);f.frame(300);
  const [hero,king,slash,spark]=f.animated;
  expect(slash.visible).toBe(true);expect(slash.x).toBeGreaterThan(hero.x+105);expect(slash.x).toBeLessThan(king.x);
  expect(slash.scale.x).toBeGreaterThan(3);f.frame(300);
  expect(spark.visible).toBe(true);expect(spark.x).toBe(king.x-25);
  scene.activate('pause');const position=slash.x;f.frame(600);expect(slash.x).toBe(position);expect(spark.visible).toBe(true);
  scene.activate('fullscreen');expect(requestFullscreen).toHaveBeenCalledTimes(2);
  scene.activate('resume');f.frame(BATTLE_RULES.resolveMs-600);expect(spark.visible).toBe(false);
  f.frame(20000);f.frame(1000);expect(spark.visible).toBe(true);expect(spark.x).toBe(hero.x+25);
  scene.activate('back');expect(spark.visible).toBe(false);expect(controls.mock.calls.at(-1)![0]).toContainEqual(expect.objectContaining({id:'stage:4'}));
  scene.destroy();await vi.waitFor(()=>expect(f.Assets.unload).toHaveBeenCalledTimes(7));
});
