const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// 在隔離的 Firebase 替身中執行實際教師端，驗證整批成功或整批失敗。
function setup() {
    const elements = new Map();
    const el = id => {
        if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', style: {}, disabled: false,
            addEventListener() {}, querySelectorAll: () => [], classList: {add(){},remove(){}} });
        return elements.get(id);
    };
    el('selectionMode').value = 'all'; el('rewardAmount').value = '10'; el('rewardReason').value = '專心投入';
    const database = {'classes/c': {ownerId:'u'}, 'classes/c/students/a': {name:'甲',exp:20}, 'classes/c/students/b':{name:'乙',exp:0}};
    let fail = false, calls = 0;
    const context = vm.createContext({ console: {error(){}}, document: {getElementById:el}, window:{addEventListener(){}}, navigator:{onLine:true},
        db:{}, auth:{}, crypto: require('node:crypto').webcrypto, setTimeout:()=>0, clearTimeout(){},
        initializeApp:()=>({}), getFirestore:()=>({}), getAuth:()=>({}), onAuthStateChanged(){},
        doc:(_, ...parts)=>parts.join('/'),
        runTransaction:async (_, work) => {
            calls++;
            const writes=[];
            await work({ get:async ref=>({exists:()=>Boolean(database[ref]),data:()=>structuredClone(database[ref])}), update:(ref,data)=>writes.push([ref,data]) });
            if(fail) throw Error('網路失敗');
            for(const [ref,data] of writes) Object.assign(database[ref],data);
        }
    });
    let source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/class-rpg.js'),'utf8').replace(/^import [\s\S]*?from "[^"]+";\s*/gm,'');
    source += `\ncurrentClassId='c'; currentUser={uid:'u'}; rosterReady=true; roster=[{id:'a',name:'甲'},{id:'b',name:'乙'}]; globalThis.api={grantReward,undoReward,sync:d=>classData=d};`;
    const model = fs.readFileSync(require('node:path').join(__dirname,'../assets/js/class-rpg-model.js'),'utf8').replace(/^export /gm,'');
    vm.runInContext(model + '\n' + source,context);
    return {api:context.api, database, el, context, calls:()=>calls, fail:()=>fail=true, sync:()=>context.api.sync(database['classes/c'])};
}
test('批次獎勵與紀錄一致，重複點擊只送出一次',async()=>{
    const t=setup(); await Promise.all([t.api.grantReward(),t.api.grantReward()]);
    assert.equal(t.calls(),1); assert.equal(t.database['classes/c/students/a'].exp,30); assert.equal(t.database['classes/c/students/b'].exp,10);
    assert.equal(t.database['classes/c'].rewardHistory.length,1);
});
test('交易失敗不留下部分學生獎勵或成功紀錄',async()=>{
    const t=setup();t.fail(); await t.api.grantReward();
    assert.equal(t.database['classes/c/students/a'].exp,20); assert.equal(t.database['classes/c'].rewardHistory,undefined);
});
test('連續獎勵可依序復原，重複復原不扣第二次',async()=>{
    const t=setup();await t.api.grantReward(); await t.api.grantReward();t.sync();
    await t.api.undoReward();t.sync();await t.api.undoReward();t.sync();await t.api.undoReward();
    assert.equal(t.database['classes/c/students/a'].exp,20);assert.equal(t.database['classes/c/students/b'].exp,0);
});
test('復原遇到其他裝置變更時整批拒絕',async()=>{
    const t=setup();await t.api.grantReward();t.sync();t.database['classes/c/students/b'].exp=50;
    await t.api.undoReward();assert.equal(t.database['classes/c/students/a'].exp,30);assert.equal(t.database['classes/c/students/b'].exp,50);
    assert.equal(t.database['classes/c'].rewardHistory[0].undone,false);
});
test('離線或不合法經驗值不發出交易',async()=>{
    const t=setup();t.el('rewardAmount').value='-1';await t.api.grantReward();t.el('rewardAmount').value='10';t.context.navigator.onLine=false;await t.api.grantReward();assert.equal(t.calls(),0);
});
test('名冊刪除一人時不部分發送',async()=>{
    const t=setup();delete t.database['classes/c/students/b'];await t.api.grantReward();assert.equal(t.database['classes/c/students/a'].exp,20);
});

test('獎勵跨級時同步寫入等級，復原後恢復原級',async()=>{
    const t=setup();t.database['classes/c/students/a'].exp=95;
    await t.api.grantReward();assert.equal(t.database['classes/c/students/a'].level,2);
    t.sync();await t.api.undoReward();assert.equal(t.database['classes/c/students/a'].level,1);
});
test('舊生補值只建立一次，連續獎勵不推高補值',async()=>{
    const t=setup();Object.assign(t.database['classes/c/students/a'],{level:5,exp:20});
    await t.api.grantReward();const offset=t.database['classes/c/students/a'].expOffset;
    await t.api.grantReward();assert.equal(t.database['classes/c/students/a'].expOffset,offset);
    t.sync();await t.api.undoReward();assert.equal(t.database['classes/c/students/a'].level,5);
});
