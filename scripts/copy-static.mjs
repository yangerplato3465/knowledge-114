import { cp } from 'node:fs/promises';

// HTML is produced exclusively by Vite; only runtime/media and config are copied.
for (const path of ['config.json', 'assets', 'pages/firestore.rules.txt']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(`../dist/${path}`, import.meta.url), { recursive: true });
}
