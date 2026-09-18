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

const homeHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const homeCssFiles = [...new Set([...homeHtml.matchAll(/href="[^"]*app-assets\/([^"/]+\.css)"/g)].map(match => match[1]))];
const homeCss = await Promise.all(homeCssFiles.map(name => readFile(new URL(name, assets), 'utf8')));
const cssBytes = homeCss.reduce((sum, css) => sum + Buffer.byteLength(css), 0);
assert.ok(cssBytes <= 12_000, `首頁 CSS 超過 12 KB：${cssBytes} bytes`);
assert.doesNotMatch(homeCss.join('\n'), /\.(?:admin-shell|mr-card|game-shell|material-row|water-lesson|magic-ink-lesson|resource-list)\b/, '首頁不得載入功能頁或目錄專用樣式');
// Shared chunk names vary with Rollup's dependency graph; inspect actual preloads.
const shared = [...homeHtml.matchAll(/rel="modulepreload"[^>]+href="[^"]*app-assets\/([^"/]+\.js)"/g)].map(match => match[1]);
const shell = shared.sort((a, b) => sizes[b] - sizes[a])[0];
assert.ok(shell, '找不到共用 React shell chunk');
assert.ok(sizes[shell] <= 240_000, `共用 React shell 超過 240 KB：${sizes[shell]} bytes`);

assert.doesNotMatch(homeHtml, /pixi|firebase|class-rpg|detective/i, '首頁 HTML 不得直接載入 Pixi、Firebase 或大型遊戲');
assert.equal(js.filter(name => /pixi/i.test(name)).length, 0, 'Pixi vendor 應維持按遊戲載入，不得進入 Vite 初始 chunks');

const total = Object.values(sizes).reduce((sum, value) => sum + value, 0);
console.log(`效能預算通過：首頁功能 JS ${sizes[home]} B，首頁 CSS ${cssBytes} B，共用 shell ${sizes[shell]} B，Vite JS 合計 ${total} B。`);
