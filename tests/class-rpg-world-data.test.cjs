const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
 let authCallback; const watches=[], rosters=[], statuses=[];
 const select={value:'',replaceChildren(){},addEventListener(_,f){this.change=f;},removeEventListener(){}};
 const context=vm.createContext({db:{},auth:{},location:{search:'?class=foreign'},URLSearchParams,
  Option:function(name,value){this.value=value;this.text=name;},
  onAuthStateChanged:(_,f)=>{authCallback=f;return()=>{};},
  collection:(_, ...p)=>p.join('/'),query:r=>r,where:()=>{},
  onSnapshot:(ref,...args)=>{const entry={ref,success:args[args.length-2],error:args[args.length-1],stopped:false};watches.push(entry);return()=>entry.stopped=true;}
 });
 const source=fs.readFileSync(path.join(__dirname,'../assets/js/class-rpg-world-data.js'),'utf8').replace(/^import .*;\s*/gm,'').replace(/^export /gm,'');
 vm.runInContext(source+'\nglobalThis.connect=connectWorld;',context);
 context.connect({select,onStudents:s=>rosters.push(s),onStatus:s=>statuses.push(s)});
 const snapshot=(records)=>({docs:records.map(([id,data])=>({id,data:()=>data})),metadata:{fromCache:false}});
 return {auth:u=>authCallback(u),watches,rosters,statuses,select,snapshot};
}
test('世界只接受老師擁有的班級，切班清空並忽略舊名冊回呼',()=>{
 const t=setup();t.auth({uid:'u'});t.watches[0].success(t.snapshot([['own',{name:'班一'}],['other',{name:'班二'}]]));
 assert.equal(t.watches[1].ref,'classes/own/students');
 t.watches[1].success(t.snapshot([['s1',{name:'甲'}]]));assert.equal(t.rosters.at(-1).length,1);
 t.select.value='other';t.select.change();assert.equal(t.rosters.at(-1).length,0);assert.equal(t.watches[1].stopped,true);
 t.watches[1].success(t.snapshot([['s1',{name:'舊甲'}]]));assert.equal(t.rosters.at(-1).length,0);
});
test('登出清除角色，過期班級回呼不能再次訂閱',()=>{
 const t=setup();t.auth({uid:'u'});const old=t.watches[0];old.success(t.snapshot([['own',{}]]));
 t.auth(null);const count=t.watches.length;old.success(t.snapshot([['own',{}]]));
 assert.equal(t.watches.length,count);assert.equal(t.rosters.at(-1).length,0);assert.equal(t.select.disabled,true);
});
