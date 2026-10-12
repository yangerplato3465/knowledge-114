import type { Node } from '../magic-workshop/scene-types';
import { animationFrameAt, animationFrames, type BattleArt, type BattlePixi, type Sheet } from './battle-art';
import { BATTLE_RULES, type BattleEvent } from './battle-model';

interface Point { x:number; y:number }
const clamp=(value:number)=>Math.max(0,Math.min(1,value));

/** One clock for release, contact, authored FX frames and the defender's hurt pose. */
export function attackPresentation(event:BattleEvent,elapsed:number,reduced:boolean) {
  const correct=event==='correct', hitAt=correct?620:700;
  const active=!!event&&elapsed>=0&&elapsed<BATTLE_RULES.resolveMs;
  const projectileStart=correct?340:300, release=correct?340:500;
  return {active,hitAt,
    projectileElapsed:reduced?-1:elapsed-projectileStart,
    impactElapsed:reduced?130:elapsed-hitAt,
    flight:clamp((elapsed-release)/(hitAt-release)),
    gather:correct?1:clamp((elapsed-projectileStart)/120)};
}

export function createBattleEffects(P:BattlePixi,parent:Node,art:BattleArt) {
  const root=parent.addChild(new P.Container());
  function makeClip(file:'liwei-sword-sweep-v4.json'|'heen-magic-bolt-v1.json'|'hit-shards-v1.json',scale:number) {
    const frames=animationFrames(art.values[file] as Sheet);
    const sprite=root.addChild(new P.AnimatedSprite({textures:frames,autoUpdate:false,loop:false}));
    sprite.anchor.set(.5);sprite.scale.set(scale);sprite.visible=false;
    return {sprite,frames};
  }
  const echoFar=makeClip('liwei-sword-sweep-v4.json',2.45);
  const echo=makeClip('liwei-sword-sweep-v4.json',2.75);
  const slash=makeClip('liwei-sword-sweep-v4.json',3);
  const bolt=makeClip('heen-magic-bolt-v1.json',2);
  const glint=makeClip('hit-shards-v1.json',.8);
  const hitCyan=makeClip('hit-shards-v1.json',2.65);
  const hit=makeClip('hit-shards-v1.json',2.2);
  const ring=root.addChild(new P.Graphics());
  echoFar.sprite.alpha=.13;echo.sprite.alpha=.28;
  hitCyan.sprite.alpha=.72;hitCyan.sprite.tint=0x55d7ef;
  [echoFar,echo,slash,glint,hitCyan].forEach(clip=>{clip.sprite.blendMode='add';});
  function seek(clip:ReturnType<typeof makeClip>,elapsed:number) {
    const frame=animationFrameAt(clip.frames,elapsed);
    clip.sprite.visible=frame!==null;
    if(frame!==null)clip.sprite.gotoAndStop(frame);
  }
  const clips=[echoFar,echo,slash,bolt,glint,hitCyan,hit];
  function clear(){root.visible=false;ring.visible=false;clips.forEach(clip=>{clip.sprite.visible=false;clip.sprite.stop();});}
  clear();
  return {clear,render(event:BattleEvent,elapsed:number,source:Point,target:Point,reduced:boolean) {
    const sample=attackPresentation(event,elapsed,reduced);
    if(!sample.active){clear();return;}
    root.visible=true;
    const correct=event==='correct';
    clips.forEach(clip=>{clip.sprite.visible=false;});ring.visible=false;
    const projectile=correct?slash:bolt;
    if(!reduced) {
      seek(projectile,sample.projectileElapsed);
      const gather=!correct&&elapsed<500;
      projectile.sprite.position.set(gather?source.x+44*(1-sample.gather):source.x+(target.x-source.x)*sample.flight,
        gather?source.y+100*(1-sample.gather):source.y+(target.y-source.y)*sample.flight);
      if(correct) {
        for(const [clip,delay,offset] of [[echo,65,7],[echoFar,130,14]] as const) {
          const lag=attackPresentation(event,elapsed-delay,false);
          seek(clip,lag.projectileElapsed);
          clip.sprite.position.set(source.x+(target.x-source.x)*lag.flight,
            source.y+(target.y-source.y)*lag.flight+offset);
        }
        const glintTime=elapsed-265;
        if(glintTime>=0&&glintTime<115)seek(glint,glintTime);
        glint.sprite.position.set(source.x-25,source.y+16);
      }
    }
    seek(hit,sample.impactElapsed);
    hit.sprite.position.set(target.x,target.y);
    if(correct) {
      seek(hitCyan,sample.impactElapsed);
      hitCyan.sprite.position.set(target.x,target.y);
      const impactTime=elapsed-sample.hitAt;
      if(!reduced&&impactTime>=0&&impactTime<190) {
        const progress=impactTime/190,radius=Math.round(27+65*progress);
        const points:number[]=[];
        for(let i=0;i<8;i++){
          const angle=(i-.5)*Math.PI/4;
          points.push(Math.round(Math.cos(angle)*radius),Math.round(Math.sin(angle)*radius));
        }
        ring.clear().poly(points).stroke({color:0x8cf3f1,alpha:.7*(1-progress),width:Math.max(2,5-3*progress)});
        ring.position.set(target.x,target.y);ring.visible=true;
      }
    }
  }};
}
