// Deterministic fixed-grid export. Requires Sharp (installed or supplied via NODE_PATH).
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const sharp = createRequire(import.meta.url)('sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = path.join(root, 'docs/world/art/manifests/side-scroller-sprites-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const preview = path.join(root, '.art-output/side-scroller/animation');
await mkdir(preview, { recursive: true });
const size = 256;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const blank = (width, height) => sharp({ create: { width, height, channels: 4, background: transparent } });
async function clean(file) {
  const { data, info } = await sharp(path.join(root, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] < 24) data.fill(0, i, i + 4);
  return { data, info };
}
function bounds(data, width, height, threshold = 1) {
  let left = width, top = height, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < threshold) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  return [left, top, right, bottom];
}
async function extract(source, frame, columns, rows) {
  const { data, info } = source;
  const left = Math.round((frame % columns) * info.width / columns);
  const top = Math.round(Math.floor(frame / columns) * info.height / rows);
  const width = Math.round((frame % columns + 1) * info.width / columns) - left;
  const height = Math.round((Math.floor(frame / columns) + 1) * info.height / rows) - top;
  const cell = sharp(data, { raw: info }).extract({ left, top, width, height });
  const pixels = await cell.clone().raw().toBuffer();
  const b = bounds(pixels, width, height, 32);
  assert(b[0] > 0 && b[1] > 0 && b[2] < width && b[3] < height, `Source frame ${frame} crosses its cell: ${b}`);
  return cell;
}
// Explicit anatomical registration in source-cell pixels: torso x, virtual foot y.
// Run flight retains raised feet; no per-frame bounding-box crop or scale.
const registration = {
  run: [[205,356],[196,357],[206,353],[207,353],[207,343],[205,344],[204,344],[201,344],[203,332],[209,334],[208,335],[207,333]],
  jump: [[245,433],[243,433],[242,433],[244,433],[245,419],[244,419],[245,419],[248,419]],
};
manifest.processing.registration = registration;
const cellResize = { run: 200, jump: 192 };
manifest.processing.cellResize = cellResize;
manifest.sources.runFlight = 'docs/world/art/characters/milo/milo-platformer-run-flight-source-v1.png';
manifest.processing.runFlight = 'Frame 9 from original run pass preserves the correct near-arm-back phase. Identical fixed source grid, shared scale and explicit root registration.';
const frameSets = {};
const reports = {};
for (const name of ['run', 'jump']) {
  const spec = manifest.animations[name];
  const source = await clean(manifest.sources[name]);
  const flight = name === 'run' ? await clean(manifest.sources.runFlight) : null;
  spec.sourceSize = [source.info.width, source.info.height];
  const frames = [];
  for (let i = 0; i < spec.frames; i++) {
    const cell = await extract(i === 9 && flight ? flight : source, i, spec.columns, spec.rows);
    const [rx, ry] = registration[name][i];
    const resized = cellResize[name];
    const scale = resized / (source.info.width / spec.columns);
    const x = Math.round(128 - rx * scale), y = Math.round(216 - ry * scale);
    const input = await cell.resize(resized, resized, { fit: 'fill' }).png().toBuffer();
    frames.push(await blank(size, size).composite([{ input, left: x, top: y }]).png().toBuffer());
  }
  frameSets[name] = frames;
}
const portal = await clean(manifest.masters.portal);
// One fixed padded square around the approved portal, centered on (627,621).
const portalBase = await sharp(portal.data, { raw: portal.info })
  .extract({ left: 192, top: 186, width: 870, height: 870 })
  .png().toBuffer();
frameSets.portal = [];
for (const angle of manifest.animations.portal.anglesDegrees) {
  const rotated = await sharp(portalBase).rotate(angle, { background: transparent }).png().toBuffer({ resolveWithObject: true });
  const { data, info } = await sharp(rotated.data).resize(Math.round(rotated.info.width * 188 / 870), Math.round(rotated.info.height * 188 / 870)).png().toBuffer({ resolveWithObject: true });
  // Rotation's bounding canvas may exceed 256, but all visible art fits the safe circle.
  const padded = await blank(320, 320).composite([{ input: data, left: Math.floor((320 - info.width) / 2), top: Math.floor((320 - info.height) / 2) }]).png().toBuffer();
  frameSets.portal.push(await sharp(padded).extract({ left: 32, top: 32, width: size, height: size }).png().toBuffer());
}
for (const [name, frames] of Object.entries(frameSets)) {
  const spec = manifest.animations[name];
  reports[name] = [];
  const cells = [];
  for (let i = 0; i < frames.length; i++) {
    const pixels = await sharp(frames[i]).raw().toBuffer();
    const b = bounds(pixels, size, size);
    assert(b[0] >= 32 && b[1] >= 32 && b[2] <= 224 && b[3] <= 224, `${name}:${i} violates safe padding: ${b}`);
    reports[name].push({ frame: i, bounds: b });
    await writeFile(path.join(preview, `${name}-${i}.png`), frames[i]);
    cells.push({ input: frames[i], left: i % spec.columns * size, top: Math.floor(i / spec.columns) * size });
  }
  await blank(spec.columns * size, spec.rows * size).composite(cells).png().toFile(path.join(root, spec.file));
  spec.size = [spec.columns * size, spec.rows * size];
  spec.anchor = name === 'portal' ? [128, 128] : [128, 216];
  const rawFrames = await Promise.all(frames.map(frame => sharp(frame).flatten({ background: '#dceeff' }).raw().toBuffer()));
  await sharp(Buffer.concat(rawFrames), { raw: { width: size, height: size * frames.length, channels: 3, pageHeight: size } })
    .gif({ loop: 0, delay: spec.durationsMs }).toFile(path.join(preview, `${name}-preview.gif`));
}
manifest.processing.portal = 'Fixed approved-master region [192,186,870,870], shared188px scale, exact45deg clockwise rotations; no per-frame redraw.';
manifest.review.frameBounds = reports;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(root, 'assets/images/side-scroller/sprites-v1.json'), JSON.stringify({ cell: [256, 256], order: 'row-major', animations: manifest.animations }, null, 2) + '\n');
const template = await readFile(path.join(root, 'scripts/side-scroller-sprite-preview.html'), 'utf8');
await writeFile(path.join(preview, 'preview.html'), template.replace('/* SPRITE_SPEC */', JSON.stringify(manifest.animations)));
console.log(JSON.stringify({ exports: Object.values(manifest.animations).map(a => a.file), frames: reports }, null, 2));
