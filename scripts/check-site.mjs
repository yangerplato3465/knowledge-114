import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const walk = dir => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const name = `${dir}/${entry.name}`;
  return entry.isDirectory() ? walk(name) : [name];
});
const errors = [];
let checked = 0;
function check(source, url) {
  if (!url || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(url) || url.includes('${')) return;
  const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!pathname) return;
  const target = pathname.startsWith('/') ? path.join(root, pathname.slice(1)) : path.resolve(root, path.dirname(source), pathname);
  checked++;
  if (!existsSync(target)) errors.push(`${source}: missing ${url}`);
}

const pages = ['index.html', ...walk('pages').filter(file => file.endsWith('.html'))];
for (const file of pages) {
  const dom = new JSDOM(read(file));
  const document = dom.window.document;
  const ids = new Set();
  for (const node of document.querySelectorAll('[id]')) {
    if (ids.has(node.id)) errors.push(`${file}: duplicate id ${node.id}`);
    ids.add(node.id);
  }
  if (!ids.has('root')) errors.push(`${file}: missing React root`);
  for (const node of document.querySelectorAll('[src],[href],[poster]')) {
    for (const attribute of ['src', 'href', 'poster']) check(file, node.getAttribute(attribute));
  }
  dom.window.close();
}
for (const file of [...walk('assets/css'), ...walk('src')].filter(file => file.endsWith('.css'))) {
  for (const [, url] of read(file).matchAll(/url\(\s*['"]?([^'"\)]+)/g)) check(file, url.trim());
}
for (const file of walk('assets/js').filter(file => file.endsWith('.js'))) {
  for (const [, url] of read(file).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"\n]+)['"]/g)) check(file, url);
}
const docs = [...readdirSync(root).filter(file => file.endsWith('.md')), ...walk('docs'), ...walk('assets/vendor'), ...walk('assets/images')].filter(file => file.endsWith('.md'));
for (const file of docs) {
  for (const [, url] of read(file).matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) check(file, url);
}
const config = JSON.parse(read('config.json'));
assert.match(config.version, /^\d+\.\d+\.\d+$/);
errors.forEach(error => console.error(error));
console.log(`${pages.length} pages, ${docs.length} documents, ${checked} references, ${errors.length} errors`);
process.exitCode = errors.length ? 1 : 0;
