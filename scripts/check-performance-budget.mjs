import { readdir, readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = new URL('../dist/app-assets/', import.meta.url);
const entries = await readdir(assets);
const js = entries.filter(name => name.endsWith('.js'));
const sizes = Object.fromEntries(await Promise.all(js.map(async name => [name, (await stat(new URL(name, assets))).size])));

const home = js.find(name => name.startsWith('index-'));
assert.ok(home, '找不到首頁 JavaScript chunk');
assert.ok(sizes[home] <= 12_000, `首頁功能 chunk 超過 12 KB：${sizes[home]} bytes`);

const shell = js.find(name => name.startsWith('ErrorBoundary-'));
assert.ok(shell, '找不到共用 React shell chunk');
assert.ok(sizes[shell] <= 240_000, `共用 React shell 超過 240 KB：${sizes[shell]} bytes`);

const homeHtml = await readFile(new URL('../dist/next/index.html', import.meta.url), 'utf8');
assert.doesNotMatch(homeHtml, /pixi|firebase|class-rpg|detective/i, '首頁 HTML 不得直接載入 Pixi、Firebase 或大型遊戲');
assert.equal(js.filter(name => /pixi/i.test(name)).length, 0, 'Pixi vendor 應維持按遊戲載入，不得進入 Vite 初始 chunks');

const total = Object.values(sizes).reduce((sum, value) => sum + value, 0);
console.log(`效能預算通過：首頁 ${sizes[home]} B，共用 shell ${sizes[shell]} B，Vite JS 合計 ${total} B。`);
