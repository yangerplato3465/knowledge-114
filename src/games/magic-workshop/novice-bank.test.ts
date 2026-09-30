import { expect, it } from 'vitest';
import {createDeck,stagePool,verifyPuzzle} from './puzzles';
import {shortestPathAudit} from './rules';
import {NOVICE_ROWS} from './novice-bank';

it('見習生全部四步、兩瓶；三種思路及兩題雙最短解經 BFS 驗證',()=>{
  expect(NOVICE_ROWS).toHaveLength(49);
  expect(NOVICE_ROWS.filter(r=>r[3]===2)).toHaveLength(2);
  for(const [capacities,target,,count] of NOVICE_ROWS){
    const audit=shortestPathAudit({capacities,target})!;
    expect(audit.steps).toBe(4);expect(audit.count).toBe(count);
  }
  expect(new Set(NOVICE_ROWS.map(r=>r[2]))).toEqual(new Set(['accumulate','remainder','subtract','compare']));
});
it('五關各有四步題，不重複且相鄰關卡變換思路，重玩代碼可重現',()=>{
  expect(stagePool(2,1)).toHaveLength(49);
  for(let seed=0;seed<100;seed++){
    const deck=createDeck(seed,2);
    expect(deck.every(verifyPuzzle)).toBe(true);
    expect(deck.map(p=>p.minimumSteps)).toEqual([4,4,4,4,4]);
    expect(new Set(deck.map(p=>p.id)).size).toBe(5);
    expect(deck.every((p,i)=>!i||p.signature!==deck[i-1].signature)).toBe(true);
    expect(createDeck(seed,2)).toEqual(deck);
  }
});
