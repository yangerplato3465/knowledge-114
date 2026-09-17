import assert from 'node:assert/strict';

const input = process.argv[2];
if (!input) throw new Error('用法：node scripts/smoke-url.mjs <部署網址>');
const base = new URL(input.endsWith('/') ? input : `${input}/`);
const allowSpaFallback = process.argv.includes('--allow-spa-fallback');

async function request(path, init) {
  const response = await fetch(new URL(path, base), init);
  return response;
}

for (const path of ['next/index.html', 'next/math-rpg.html', 'next/class-rpg.html', 'next/detective-golden-owl.html']) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} 回傳 ${response.status}`);
  assert.match(response.headers.get('content-type') || '', /text\/html/i, `${path} MIME 錯誤`);
  const html = await response.text();
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"]*app-assets\/[^"]+)"/g)) {
    const assetResponse = await fetch(new URL(asset, base.origin));
    assert.equal(assetResponse.status, 200, `${asset} 回傳 ${assetResponse.status}`);
    if (asset.endsWith('.js')) assert.match(assetResponse.headers.get('content-type') || '', /javascript|ecmascript/i, `${asset} MIME 錯誤`);
  }
}

const missing = await request(`__smoke_missing_${Date.now()}.html`);
if (allowSpaFallback) assert.ok([200, 404].includes(missing.status), `本機未知路徑回傳 ${missing.status}`);
else assert.equal(missing.status, 404, `不存在路徑應回傳 404，目前為 ${missing.status}`);

const audio = await request('assets/audio/music.mp3', { headers: { Range: 'bytes=0-31' } });
assert.ok([200, 206].includes(audio.status), `音訊 Range 回傳 ${audio.status}`);
assert.match(audio.headers.get('content-type') || '', /audio|mpeg|octet-stream/i, '音訊 MIME 錯誤');
console.log(`部署 smoke test 通過：${base.href}`);
