import { cp } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function publish(source) {
  const path = relative(root, source).split(sep).join('/');
  // 素材庫可能合法包含 Markdown；只排除網站自身的開發素材。
  if (path.startsWith('assets/uploads/')) return !path.endsWith('/.gitkeep');
  return path !== 'assets/css' && !path.endsWith('.md');
}

// HTML is produced exclusively by Vite; only runtime/media and config are copied.
for (const path of ['config.json', 'assets', 'pages/firestore.rules.txt']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(`../dist/${path}`, import.meta.url), { recursive: true, filter: publish });
}
