import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
async function compare(path) {
  const entries = await readdir(new URL(path, root), { withFileTypes: true });
  for (const entry of entries) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) await compare(child);
    else assert.deepEqual(await readFile(new URL(child, root)), await readFile(new URL(`dist/${child}`, root)), child);
  }
}
for (const path of ['assets', 'pages']) await compare(path);
for (const path of ['index.html', 'config.json']) {
  assert.deepEqual(await readFile(new URL(path, root)), await readFile(new URL(`dist/${path}`, root)), path);
}
const html = await readFile(new URL('dist/next/index.html', root), 'utf8');
const base = process.env.VITE_BASE_PATH || '/';
for (const [, url] of html.matchAll(/(?:src|href)="([^"]*app-assets\/[^"]+)"/g)) {
  assert.ok(url.startsWith(base), `錯誤的 base: ${url}`);
  await readFile(new URL(`dist/${url.slice(base.length)}`, root));
}
console.log('舊站檔案完整保留；新版入口資源與 base 檢查通過。');
