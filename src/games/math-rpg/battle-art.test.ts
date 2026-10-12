import { expect, test, vi } from 'vitest';
import { animationFrames, BATTLE_FILES, loadBattleArt, type BattlePixi, type Sheet } from './battle-art';

function fixture() {
  const Assets={load:vi.fn(async(_input:unknown)=>({})),unload:vi.fn(async(_url:string)=>{})};
  return {P:{Assets} as unknown as BattlePixi,Assets};
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

test('共同素材只載入一次，舊場景釋放不會卸載新場景正在用的圖集',async()=>{
  const {P,Assets}=fixture();
  const first=await loadBattleArt(P,new AbortController().signal);
  const second=await loadBattleArt(P,new AbortController().signal);
  expect(Assets.load).toHaveBeenCalledTimes(BATTLE_FILES.length);
  expect(Assets.load.mock.calls).toEqual(expect.arrayContaining([
    [expect.objectContaining({src:expect.stringContaining('liwei-idle.json'),data:{textureOptions:{scaleMode:'nearest'}}})],
  ]));
  first.destroy();await flush();expect(Assets.unload).not.toHaveBeenCalled();
  second.destroy();second.destroy();await flush();expect(Assets.unload).toHaveBeenCalledTimes(BATTLE_FILES.length);
});

test('載入中離場，晚到素材全數釋放且不能回傳可用場景',async()=>{
  const {P,Assets}=fixture(),controller=new AbortController();
  let finish!:()=>void;const pendingAsset=new Promise<object>(resolve=>{finish=()=>resolve({});});
  Assets.load.mockImplementation(()=>pendingAsset);
  const pending=loadBattleArt(P,controller.signal);
  const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'});
  await flush();controller.abort();finish();await rejected;await flush();
  expect(Assets.unload).toHaveBeenCalledTimes(BATTLE_FILES.length);
});

test('上一輪正在卸載時，新場景等待後重新載入，不沿用已銷毀圖集',async()=>{
  const {P,Assets}=fixture();let finish!:()=>void;
  const unloading=new Promise<void>(resolve=>{finish=resolve;});Assets.unload.mockImplementation(()=>unloading);
  const first=await loadBattleArt(P,new AbortController().signal);first.destroy();await flush();
  const next=loadBattleArt(P,new AbortController().signal);await flush();expect(Assets.load).toHaveBeenCalledTimes(BATTLE_FILES.length);
  finish();const second=await next;expect(Assets.load).toHaveBeenCalledTimes(BATTLE_FILES.length*2);
  second.destroy();await flush();
});

test('播放順序及每幀時間取自圖集，不用固定幀率猜測',()=>{
  const textures=[{id:2},{id:1}];
  const sheet={animations:{play:textures},data:{animations:{play:['windup','strike']},frames:{windup:{duration:120},strike:{duration:80}}}} as unknown as Sheet;
  expect(animationFrames(sheet)).toEqual([{texture:textures[0],time:120},{texture:textures[1],time:80}]);
});
