// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { loadCharacterImage } from './image-loader';

afterEach(() => vi.unstubAllGlobals());

function stubImage() {
  const image = { src: '', onload: null as (() => void) | null, onerror: null as (() => void) | null };
  vi.stubGlobal('Image', class { constructor() { return image; } });
  return image;
}

it('離場取消載入，晚到的完成回呼不能恢復圖片', async () => {
  const image = stubImage(), controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const pending = loadCharacterImage('/test.webp', controller.signal);
  const lateLoad = image.onload;
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  lateLoad?.();
  await rejected;
  expect(image.src).toBe('');
  expect(image.onload).toBeNull();
  expect(image.onerror).toBeNull();
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});

it('成功或失敗皆清除監聽，已取消的請求不開始載入', async () => {
  const image = stubImage(), controller = new AbortController();
  const loaded = loadCharacterImage('/test.webp', controller.signal);
  image.onload?.();
  await expect(loaded).resolves.toBe(image);
  controller.abort();
  expect(image.src).toBe('/test.webp');
  const failed = loadCharacterImage('/missing.webp', new AbortController().signal);
  image.onerror?.();
  await expect(failed).rejects.toThrow('Character image unavailable');
  expect(image.onload).toBeNull();
  expect(image.onerror).toBeNull();
  await expect(loadCharacterImage('/never.webp', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(image.src).toBe('/missing.webp');
});
