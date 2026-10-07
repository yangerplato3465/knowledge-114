// Audit by default; --write replaces only smaller, pixel-equivalent runtime images.
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const sharp = createRequire(import.meta.url)('sharp');
const root = fileURLToPath(new URL('../assets/images/side-scroller/', import.meta.url));
const write = process.argv.includes('--write');
const report = [];
for (const file of (await readdir(root, { recursive: true })).filter(file => /\.(png|webp)$/.test(file))) {
  const input = path.resolve(root, file), output = input.replace(/\.png$/, '.webp');
  assert(input.startsWith(root) && output.startsWith(root), 'Image must stay in the runtime directory');
  const original = await readFile(input);
  const before = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const encoded = await sharp(before.data, { raw: before.info }).webp({ lossless: true, effort: 6 }).toBuffer();
  const after = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(after.info.width, before.info.width); assert.equal(after.info.height, before.info.height);
  for (let i = 0; i < before.data.length; i += 4) {
    assert.equal(after.data[i + 3], before.data[i + 3], `${file}: alpha changed`);
    if (before.data[i + 3]) assert(before.data.subarray(i, i + 3).equals(after.data.subarray(i, i + 3)), `${file}: visible pixel changed`);
  }
  const smaller = encoded.length < original.length;
  if (write && smaller) {
    if (input !== output) await access(output).then(() => { throw new Error(`Already exists: ${output}`); }, error => { if (error.code !== 'ENOENT') throw error; });
    await writeFile(output, encoded);
    if (input !== output) await unlink(input);
  }
  report.push({ file, before: original.length, after: smaller ? encoded.length : original.length, replaced: write && smaller });
}
console.log(JSON.stringify({ write, before: report.reduce((sum, row) => sum + row.before, 0), after: report.reduce((sum, row) => sum + row.after, 0), images: report }, null, 2));
