import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

const input = process.argv[2];
if (!input) throw new Error('用法：node scripts/smoke-url.mjs <部署網址>');
const base = new URL(input.endsWith('/') ? input : `${input}/`);
const allowSpaFallback = process.argv.includes('--allow-spa-fallback');

const request = (path, init) => fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(20_000) });
const assets = new Set();
const pages = (await readdir(new URL('../pages/', import.meta.url))).filter(file => file.endsWith('.html'));

for (const path of ['index.html', ...pages.map(file => `pages/${file}`)]) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} 回傳 ${response.status}`);
  assert.match(response.headers.get('content-type') || '', /text\/html/i, `${path} MIME 錯誤`);
  const html = await response.text();
  assert.match(html, /id="root"/, `${path} 缺少 React root`);
  assert.match(html, /app-assets\//, `${path} 缺少建置模組`);
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"]*app-assets\/[^"]+)"/g)) {
    if (assets.has(asset)) continue;
    assets.add(asset);
    const assetResponse = await request(asset);
    assert.equal(assetResponse.status, 200, `${asset} 回傳 ${assetResponse.status}`);
    if (asset.endsWith('.js')) assert.match(assetResponse.headers.get('content-type') || '', /javascript|ecmascript/i, `${asset} MIME 錯誤`);
    await assetResponse.body?.cancel();
  }
}

const missing = await request(`__smoke_missing_${Date.now()}.html`);
if (allowSpaFallback) assert.ok([200, 404].includes(missing.status), `本機未知路徑回傳 ${missing.status}`);
else assert.equal(missing.status, 404, `不存在路徑應回傳 404，目前為 ${missing.status}`);

const audio = await request('assets/audio/music.mp3', { headers: { Range: 'bytes=0-31' } });
assert.ok([200, 206].includes(audio.status), `音訊 Range 回傳 ${audio.status}`);
assert.match(audio.headers.get('content-type') || '', /audio|mpeg|octet-stream/i, '音訊 MIME 錯誤');
await audio.body?.cancel();
console.log(`部署 smoke test 通過：${pages.length + 1} 個入口、${assets.size} 個共用資源；${base.href}`);
