const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = file => import('data:text/javascript;base64,' + fs.readFileSync(path.join(__dirname,'../assets/js/',file)).toString('base64'));
test('升級門檻、跨多級、滿級與負值防護', async () => {
    const {growthOf,expForLevel} = await load('class-rpg-model.js');
    assert.equal(growthOf({exp:99}).level,1); assert.equal(growthOf({exp:100}).level,2);
    assert.equal(growthOf({exp:219}).level,2); assert.equal(growthOf({exp:220}).level,3);
    for(let level=1;level<=50;level++) assert.equal(growthOf({exp:expForLevel(level)}).level,level);
    assert.equal(growthOf({exp:999999}).remaining,0); assert.equal(growthOf({exp:-10}).level,1);
});
test('既有等級轉成固定補值，獎勵與復原保留原始進度',async()=>{
    const {growthOf,growthFields} = await load('class-rpg-model.js');
    const legacy={level:5,exp:20}; const initial=growthOf(legacy);
    const updated=growthFields(legacy,200);
    assert.equal(updated.expOffset,initial.expOffset);assert.equal(updated.level,6);
    const undo=growthFields(updated,20);assert.equal(undo.level,5);assert.equal(undo.expOffset,initial.expOffset);
});
test('各武器、防具的屬性使用相同公式；未知名稱無加成',async()=>{
    const {statsOf} = await load('class-rpg-model.js');
    const plain=statsOf({});assert.equal(plain.hp,100);assert.equal(plain.atk,12);assert.equal(plain.def,5);
    const hammer=statsOf({weapon:'槌',equipment:'鐵甲'});assert.equal(hammer.atk,19);assert.equal(hammer.def,8);
    assert.equal(statsOf({weapon:'木劍'}).atk,15);assert.equal(statsOf({weapon:'自訂神器'}).atk,12);
    assert.equal(statsOf({weapon:'自訂神器'}).unknownEquipment,true);
});
test('30 位角色都能散步，長時間執行保持邊界，掉幀不瞬移',async()=>{
    const {spawnPosition,stepWalker} = await load('class-rpg-wander.js');
    const actors=Array.from({length:30},(_,i)=>({...spawnPosition(i,30,1200,700),speed:30,wait:0,facing:'down'}));
    const initial=actors.map(a=>({...a}));
    for(let frame=0;frame<600;frame++) for(const a of actors) stepWalker(a,1/30,1200,700,()=>0.7);
    actors.forEach((a,i)=>{assert.ok(a.x>=48&&a.x<=1152&&a.y>=64&&a.y<=652);assert.notEqual(a.x,initial[i].x);});
    const a={x:100,y:100,speed:30,wait:0,target:{x:1000,y:600}};
    stepWalker(a,100,1200,700);assert.ok(Math.hypot(a.x-100,a.y-100)<=1.51);
});
