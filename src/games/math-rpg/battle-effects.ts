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
  function makeClip(file:'liwei-sword-sweep-v3.json'|'heen-magic-bolt-v1.json'|'hit-shards-v1.json',scale:number) {
    const frames=animationFrames(art.values[file] as Sheet);
    const sprite=root.addChild(new P.AnimatedSprite({textures:frames,autoUpdate:false,loop:false}));
    sprite.anchor.set(.5);sprite.scale.set(scale);sprite.visible=false;
    return {sprite,frames};
  }
  // A single restrained afterimage uses the same authored pixels, never a new shape.
  const echo=makeClip('liwei-sword-sweep-v3.json',2.7);
  const slash=makeClip('liwei-sword-sweep-v3.json',3);
  const bolt=makeClip('heen-magic-bolt-v1.json',2);
  const hit=makeClip('hit-shards-v1.json',2.2);
  echo.sprite.alpha=.28;
  function seek(clip:ReturnType<typeof makeClip>,elapsed:number) {
    const frame=animationFrameAt(clip.frames,elapsed);
    clip.sprite.visible=frame!==null;
    if(frame!==null)clip.sprite.gotoAndStop(frame);
  }
  function clear(){root.visible=false;[echo,slash,bolt,hit].forEach(clip=>{clip.sprite.visible=false;clip.sprite.stop();});}
  clear();
  return {clear,render(event:BattleEvent,elapsed:number,source:Point,target:Point,reduced:boolean) {
    const sample=attackPresentation(event,elapsed,reduced);
    if(!sample.active){clear();return;}
    root.visible=true;
    const correct=event==='correct';
    slash.sprite.visible=bolt.sprite.visible=echo.sprite.visible=false;
    const projectile=correct?slash:bolt;
    if(!reduced) {
      seek(projectile,sample.projectileElapsed);
      const gather=!correct&&elapsed<500;
      projectile.sprite.position.set(gather?source.x+44*(1-sample.gather):source.x+(target.x-source.x)*sample.flight,
        gather?source.y+100*(1-sample.gather):source.y+(target.y-source.y)*sample.flight);
      if(correct) {
        const lag=attackPresentation(event,elapsed-80,false);
        seek(echo,lag.projectileElapsed);
        echo.sprite.position.set(source.x+(target.x-source.x)*lag.flight,source.y+(target.y-source.y)*lag.flight+8);
      }
    }
    seek(hit,sample.impactElapsed);
    hit.sprite.position.set(target.x,target.y);
  }};
}
