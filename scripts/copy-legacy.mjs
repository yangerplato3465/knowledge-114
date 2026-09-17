import { cp } from 'node:fs/promises';

// 舊頁面保持位元組等價，不讓打包器改寫驗證後才載入的遊戲模組。
for (const path of ['index.html', 'config.json', 'pages', 'assets']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(`../dist/${path}`, import.meta.url), { recursive: true });
}
