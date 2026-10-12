// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { clearImageCache, imageUrl, loadImage, worldImageUrl, WORLD_IMAGES } from './assets';
import { CONTROL_IMAGES } from './controls';
import { createSpriteArt, SPRITES, type ArtPixi } from './art';

afterEach(() => { clearImageCache(); vi.unstubAllGlobals(); });

it('分類後所有執行圖片都被引用，動畫 metadata 與製作來源相符', () => {
  const directory = 'assets/images/side-scroller/';
  const expected = [
    ...WORLD_IMAGES.map(worldImageUrl), ...CONTROL_IMAGES.map(name => imageUrl(`ui/controls/${name}.webp`)),
    imageUrl('ui/difficulty-star-v1.webp'), imageUrl('ui/manual-frame-v1.webp'),
    ...Object.values(SPRITES).map(spec => `/${spec.file}`),
  ].map(url => url.replace(`/${directory}`, '')).sort();
  const actual = readdirSync(directory, { recursive: true }).map(String).filter(file => file.endsWith('.webp')).map(file => file.replaceAll('\\', '/')).sort();
  expect(actual).toEqual(expected);
  const source = JSON.parse(readFileSync('docs/world/art/side-scroller/manifests/sprites-manifest.json', 'utf8'));
  expect(SPRITES).toEqual(source.animations);
});

it('已載入圖片不再建立 Image；取消、失敗與離場不污染快取', async () => {
  const images: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null }> = [];
  vi.stubGlobal('Image', class {
    src = ''; onload = null; onerror = null;
    constructor() { images.push(this); }
  });
  const signal = new AbortController().signal;
  const first = loadImage('/milo.webp', signal); images[0].onload!();
  const loaded = await first;
  expect(await loadImage('/milo.webp', signal)).toBe(loaded); expect(images).toHaveLength(1);
  const cancelled = new AbortController();
  const pending = loadImage('/cancel.webp', cancelled.signal); cancelled.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(images[1].src).toBe(''); expect(images[1].onload).toBeNull();
  const failed = loadImage('/retry.webp', signal); images[2].onerror!();
  await expect(failed).rejects.toThrow('素材載入失敗');
  const retry = loadImage('/retry.webp', signal); images[3].onload!(); await retry;
  const late = loadImage('/late.webp', signal); clearImageCache(); images[4].onload!(); await late;
  const reload = loadImage('/late.webp', signal); expect(images).toHaveLength(6); images[5].onload!(); await reload;
});

it('兩個場景使用同張已解碼圖片，仍建立獨立的紋理來源', () => {
  const sources: Array<{ source: object; destroy: ReturnType<typeof vi.fn> }> = [];
  class Texture {
    width = 256; height = 256; destroy = vi.fn();
    constructor(public options?: unknown) {}
    static from = vi.fn((_image: HTMLImageElement, skipCache: boolean) => {
      expect(skipCache).toBe(true);
      const texture = { source: {}, destroy: vi.fn() }; sources.push(texture); return texture;
    });
  }
  const P = { Texture, Rectangle: class {} } as unknown as ArtPixi;
  const image = new Image();
  const first = createSpriteArt(P, { run: image }), second = createSpriteArt(P, { run: image });
  expect(sources[0].source).not.toBe(sources[1].source);
  first.destroy(); expect(sources[0].destroy).toHaveBeenCalledWith(true); expect(sources[1].destroy).not.toHaveBeenCalled();
  second.destroy();
});
