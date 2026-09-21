import { readdir, readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const base = process.env.VITE_BASE_PATH || '/';
const entries = ['index.html', ...(await readdir(new URL('pages/', root))).filter(p => p.endsWith('.html')).map(p => 'pages/' + p)];
for (const entry of entries) {
  const html = await readFile(new URL('dist/' + entry, root), 'utf8');
  assert.match(html, /id="root"/, entry + ' 必須使用 React root');
  assert.match(html, /type="module"[^>]+app-assets\//, entry + ' 必須載入 Vite 模組');
  assert.doesNotMatch(html, /原版|舊版|\/next\//);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]*app-assets\/[^"#]+)"/g)) {
    assert.ok(url.startsWith(base), '錯誤的 base: ' + url);
    await access(new URL('dist/' + url.slice(base.length), root));
  }
}
for (const path of ['next', 'pages/turbo-museum.html', 'pages/word-sort.html', 'pages/quick-quiz.html', 'assets/js/theme.js', 'assets/js/math-rpg.js', 'assets/js/upload.js', 'assets/css', 'assets/vendor/README.md', 'assets/vendor/pixi.min.js']) {
  await assert.rejects(access(new URL('dist/' + path, root)), path + ' 不可再發布');
}
for (const path of ['config.json', 'assets/js/class-rpg.js', 'assets/js/detective/gate.js', 'assets/js/detective/admin.js', 'assets/vendor/pixi.esm.min.js', 'pages/firestore.rules.txt']) {
  assert.deepEqual(await readFile(new URL(path, root)), await readFile(new URL('dist/' + path, root)), path);
}
// 新數學勇者素材必須完整發布，取代舊版的整個目錄排除規則。
for (const file of await readdir(new URL('assets/images/math-rpg/', root), { recursive: true })) {
  if (!file.endsWith('.webp')) continue;
  const path = 'assets/images/math-rpg/' + file.replaceAll('\\', '/');
  assert.deepEqual(await readFile(new URL(path, root)), await readFile(new URL('dist/' + path, root)), path);
}
console.log(entries.length + ' 個 React 正式入口、base 與移除舊站檢查通過。');
