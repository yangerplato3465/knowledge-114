const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

class Element {
    constructor() { this.attrs = {}; this.events = {}; this.children = []; this.nodes = {}; this.value = ''; }
    set innerHTML(value) { this.html = value; this.children = []; this.nodes = {}; }
    get innerHTML() { return this.html || ''; }
    querySelector(selector) { return this.nodes[selector] ||= new Element(); }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, handler) { this.events[name] = handler; }
    setAttribute(name, value) { this.attrs[name] = value; }
    getAttribute(name) { return this.attrs[name] ?? null; }
    removeAttribute(name) { delete this.attrs[name]; }
}
const response = items => ({ok:true, status:200, json:async()=>items, headers:{get:()=>null}});
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup(file, overrides={}) {
    const elements = {};
    const body = new Element();
    const root = new Element();
    const media = {matches:false, addEventListener(name, fn) { this[name] = fn; }};
    const window = {events:{}, matchMedia:()=>media, addEventListener(name, fn) { this.events[name] = fn; }};
    const context = vm.createContext({
        document:{documentElement:root, body, readyState:'complete', querySelector:()=>null,
            getElementById:id=>elements[id] ||= new Element(), createElement:()=>new Element()},
        window, localStorage:{getItem:()=>null, setItem(){}, removeItem(){}},
        fetch:async()=>response([]), console, ...overrides
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js',file),'utf8'), context);
    return {context, elements, body, root, window, media};
}

test('theme toggles twice even when storage is blocked', () => {
    const blocked = () => { throw Error('blocked'); };
    const {body,root} = setup('theme.js', {localStorage:{getItem:blocked,setItem:blocked}});
    const btn = body.children[0];
    btn.events.click();
    assert.equal(root.getAttribute('data-theme'),'dark');
    assert.equal(btn.attrs['aria-label'],'切換到淺色模式');
    btn.events.click();
    assert.equal(root.getAttribute('data-theme'),'light');
});

test('theme button follows system and other tabs', () => {
    let stored = null;
    const {body,root,media,window} = setup('theme.js', {localStorage:{getItem:()=>stored}});
    media.matches = true;
    media.change();
    assert.equal(body.children[0].attrs['aria-label'],'切換到淺色模式');
    stored = 'light';
    window.events.storage({key:'knowledge114-theme'});
    assert.equal(root.getAttribute('data-theme'),'light');
});

test('download filenames remain text and URLs encode special characters', async () => {
    const name = '<img onerror=alert(1)> & #教材.sb3';
    const {elements} = setup('downloads.js', {fetch:async()=>response([{type:'file',name,size:10,download_url:'javascript:alert(1)'}])});
    await settle();
    const row = elements.list.children[0];
    assert.equal(row.querySelector('.file-name').textContent,name);
    assert.ok(!row.innerHTML.includes(name));
    assert.ok(row.querySelector('.dl-btn').href.endsWith(encodeURIComponent(name)));
    assert.ok(row.querySelector('.dl-btn').href.startsWith('https://raw.githubusercontent.com/'));
});

test('malformed download response shows a recoverable error', async () => {
    const {elements} = setup('downloads.js', {fetch:async()=>response({})});
    await settle();
    assert.match(elements.list.innerHTML,/格式有誤/);
});

test('upload works with blocked storage and ignores repeated submission', async () => {
    const blocked = () => { throw Error('blocked'); };
    const {context,elements} = setup('upload.js',{localStorage:{getItem:blocked,setItem:blocked,removeItem:blocked}});
    await settle();
    elements.token.value = 'test-only';
    vm.runInContext("setFiles([{name:'<b>教材</b>'}]); var release; var calls=0; uploadOne=()=>{ calls++; return new Promise(r=>release=r); };",context);
    const first = elements.uploadBtn.events.click();
    await elements.uploadBtn.events.click();
    vm.runInContext("setFiles([{name:'changed'}])",context);
    elements.token.events.input();
    assert.equal(elements.uploadBtn.disabled,true);
    assert.equal(vm.runInContext('calls',context),1);
    assert.equal(vm.runInContext('selectedFiles[0].name',context),'<b>教材</b>');
    assert.equal(elements.results.children[0].querySelector('.r-name').textContent,'<b>教材</b>');
    vm.runInContext("release('完成')",context);
    await first;
    assert.equal(elements.fileInput.disabled,false);
    assert.equal(elements.uploadBtn.disabled,false);
});

test('failed existing-file lookup never starts an upload', async () => {
    const {context} = setup('upload.js');
    await settle();
    let calls=0;
    context.fetch=async()=>{ calls++; return {status:403}; };
    await assert.rejects(vm.runInContext("uploadOne({name:'test.txt'},'test-only')",context),/HTTP 403/);
    assert.equal(calls,1);
});

test('an older management response cannot overwrite a newer list', async () => {
    const {context,elements} = setup('upload.js');
    await settle();
    let release;
    context.fetch=()=>new Promise(resolve=>release=resolve);
    const old=vm.runInContext('loadManage()',context);
    context.fetch=async()=>response([{type:'file',name:'latest',size:1,sha:'x'}]);
    await vm.runInContext('loadManage()',context);
    release(response([]));
    await old;
    assert.equal(elements.manageList.children[0].querySelector('.m-name').textContent,'latest');
});
