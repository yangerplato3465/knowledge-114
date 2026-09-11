// Parse project scripts and inline HTML scripts without running them.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
let count=0, failed=false;
function check(source, label, module=false) {
    const result=spawnSync(process.execPath,['--check',`--input-type=${module?'module':'commonjs'}`],{input:source,encoding:'utf8'});
    count++;
    if(result.status!==0) { failed=true; console.error(label, result.stderr || result.error); }
}
function walk(dir) {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
        const file=path.join(dir,entry.name);
        if(entry.isDirectory()) walk(file);
        else if(file.endsWith('.js')) check(fs.readFileSync(file,'utf8'),path.relative(root,file),true);
    }
}
walk(path.join(root,'assets/js'));
for(const file of [path.join(root,'index.html'),...fs.readdirSync(path.join(root,'pages')).filter(n=>n.endsWith('.html')).map(n=>path.join(root,'pages',n))]) {
    const html=fs.readFileSync(file,'utf8').replace(/<!--[\s\S]*?-->/g,'');
    for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        if(/\bsrc\s*=/i.test(match[1]) || !match[2].trim()) continue;
        const type=/\btype\s*=\s*["']([^"']+)/i.exec(match[1])?.[1];
        if(type && !['module','text/javascript','application/javascript'].includes(type)) continue;
        check(match[2],path.relative(root,file),type==='module');
    }
}
console.log(`${count} script blocks checked; ${failed?'FAILED':'passed'}`);
process.exitCode=failed?1:0;
