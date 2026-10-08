import type { Pixi, Sprite, Texture } from '../magic-workshop/scene-types';
export interface Sheet { animations: Record<string, Texture[]>; data: { frames: Record<string,{duration:number}>; animations: Record<string,string[]> } }
export interface AnimatedActor extends Sprite {
  textures: {texture:Texture;time:number}[]; loop:boolean; playing:boolean; currentFrame:number;
  onComplete:(() => void)|null; play():void; stop():void; gotoAndPlay(frame:number):void; gotoAndStop(frame:number):void;
  update(ticker:{deltaTime:number;deltaMS:number}):void;
}
export interface BattlePixi extends Pixi {
  Assets:{ load<T>(input:{src:string;data:Record<string,unknown>}):Promise<T>; unload(url:string):Promise<void> };
  AnimatedSprite:new(options:{textures:{texture:Texture;time:number}[];autoUpdate:boolean;loop:boolean})=>AnimatedActor;
}
export const BATTLE_FILES = ['battle-court-v1.webp','liwei-idle.json','liwei-attack.json','liwei-hurt.json',
  'heen-idle.json','heen-attack.json','heen-hurt.json','liwei-sword-sweep-v3.json','heen-magic-bolt-v1.json','hit-shards-v1.json'] as const;
interface Lease { refs:number; promise:Promise<unknown>; unloading?:Promise<void> }
const leases=new Map<string,Lease>();
/** Shared Assets cache needs leases: an old scene must not unload a newer scene. */
async function acquire(P:BattlePixi,url:string) {
  let lease=leases.get(url);
  if (lease?.unloading) { await lease.unloading; return acquire(P,url); }
  if (!lease) {
    lease={refs:0,promise:P.Assets.load({src:url,data:url.endsWith('.json')?{textureOptions:{scaleMode:'nearest'}}:{scaleMode:'nearest'}})};
    leases.set(url,lease);
  }
  lease.refs++; const held=lease; let released=false;
  const release=()=>{
    if(released)return; released=true; held.refs--;
    void held.promise.then(()=>{
      if(held.refs===0 && !held.unloading && leases.get(url)===held) {
        held.unloading=P.Assets.unload(url).catch(()=>{}).then(()=>{if(leases.get(url)===held)leases.delete(url);});
      }
    },()=>{if(held.refs===0 && leases.get(url)===held)leases.delete(url);});
  };
  return {promise:held.promise,release};
}
export async function loadBattleArt(P:BattlePixi,signal:AbortSignal) {
  signal.throwIfAborted(); const releases:(()=>void)[]=[]; let disposed=false;
  const destroy=()=>{disposed=true;releases.splice(0).forEach(release=>release());};
  signal.addEventListener('abort',destroy,{once:true});
  try {
    const entries=await Promise.all(BATTLE_FILES.map(async file=>{
      const hold=await acquire(P,`${import.meta.env.BASE_URL}assets/images/math-rpg/battle/${file}`);
      if(disposed){hold.release();throw new DOMException('已取消','AbortError');}
      releases.push(hold.release); const value=await hold.promise; signal.throwIfAborted(); return [file,value] as const;
    }));
    signal.throwIfAborted();
    return { values:Object.fromEntries(entries) as Record<typeof BATTLE_FILES[number],Sheet|Texture>,
      destroy(){signal.removeEventListener('abort',destroy);destroy();} };
  } catch(error){signal.removeEventListener('abort',destroy);destroy();throw error;}
}
export type BattleArt=Awaited<ReturnType<typeof loadBattleArt>>;
export function animationFrames(sheet:Sheet) {
  return sheet.animations.play.map((texture,i)=>({texture,time:sheet.data.frames[sheet.data.animations.play[i]].duration}));
}
/** Seek authored durations on the battle clock; pausing/resizing cannot restart a clip. */
export function animationFrameAt(frames:{time:number}[],elapsed:number):number|null {
  if(elapsed<0)return null;
  for(let i=0;i<frames.length;i++){if(elapsed<frames[i].time)return i;elapsed-=frames[i].time;}
  return null;
}
