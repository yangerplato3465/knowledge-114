import {describe,it,expect} from 'vitest';
import {createBattle,STAGES,BATTLE_RULES} from './battle-model';
const next=()=>({q:'1＋1＝？',a:['1','2','3'],correct:1,hint:'把一個與一個合起來是兩個。'});
describe('五關戰鬥',()=>{
  it('準備與暫停時不計時，答對壓回蓄力且阻擋連點／舊題回呼',()=>{
    const b=createBattle(next,4);b.tick(100000);expect(b.state.charge).toBe(0);b.start();b.tick(10000);
    expect(b.state.charge).toBe(.5);b.pause(true);expect(b.answer(1,1)).toBe(false);b.tick(90000);expect(b.state.charge).toBe(.5);
    b.pause(false);expect(b.answer(1,1)).toBe(true);expect(b.state.enemyHp).toBe(9);expect(b.state.charge).toBeCloseTo(.08);
    expect(b.answer(1,1)).toBe(false);b.tick(BATTLE_RULES.resolveMs);expect(b.state.turn).toBe(2);expect(b.answer(1,1)).toBe(false);
  });
  it('錯答只扣一次並留下提示，閱讀時不計時，繼續才換題',()=>{
    const b=createBattle(next);b.start();b.answer(1,0);expect(b.state.heroHp).toBe(5);b.tick(BATTLE_RULES.resolveMs);
    expect(b.state.phase).toBe('review');expect(b.state.explanation).toContain('正解：2');expect(b.state.explanation).toContain('合起來');
    b.tick(100000);expect(b.state.heroHp).toBe(5);expect(b.state.turn).toBe(1);b.continue();expect(b.state.phase).toBe('playing');expect(b.state.turn).toBe(2);
  });
  it('時間滿會受擊，結算期間不累積攻擊，不以低 FPS 或長停頓連扣生命',()=>{
    const b=createBattle(next,4);b.start();b.tick(STAGES[4].chargeMs*8);
    expect(b.state.event).toBe('timeout');expect(b.state.heroHp).toBe(5);b.tick(100000);expect(b.state.phase).toBe('review');expect(b.state.heroHp).toBe(5);
  });
  it('五關可依序過關；換關補一點生命，魔王關沒有第六關或未定獎勵',()=>{
    const b=createBattle(next);
    for(let s=0;s<5;s++){
      expect(b.state.stage).toBe(s);b.start();
      for(let i=0;i<STAGES[s].hp;i++){b.answer(b.state.turn,1);b.tick(BATTLE_RULES.resolveMs);}
      expect(b.state.phase).toBe('cleared');expect(b.state.enemyHp).toBe(0);
      expect(b.nextStage()).toBe(s<4);
    }
  });
  it('生命歸零可重試同關，無效關卡與無效選項拒絕',()=>{
    expect(()=>createBattle(next,5)).toThrow();const b=createBattle(next,3);b.start();expect(b.answer(1,-1)).toBe(false);expect(b.answer(1,NaN)).toBe(false);
    for(let i=0;i<6;i++){b.answer(b.state.turn,0);b.tick(BATTLE_RULES.resolveMs);b.continue();}
    expect(b.state.phase).toBe('defeated');b.retry();expect(b.state.heroHp).toBe(6);expect(b.state.stage).toBe(3);expect(b.state.phase).toBe('ready');
  });
  it('同樣的遊玩秒數在不同更新頻率下得到相同蓄力',()=>{
    const a=createBattle(next,4),b=createBattle(next,4);a.start();b.start();for(let i=0;i<600;i++)a.tick(1000/60);for(let i=0;i<300;i++)b.tick(1000/30);
    expect(a.state.charge).toBeCloseTo(b.state.charge,8);
  });
});
