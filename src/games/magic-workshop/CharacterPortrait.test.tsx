// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CharacterPortrait } from './CharacterPortrait';
import { createCharacterScene, type CharacterScene } from './character-scene';

vi.mock('./character-scene', () => ({ createCharacterScene: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const scene = (): CharacterScene => ({ motion: vi.fn(), celebrate: vi.fn(), destroy: vi.fn() });
function media(reduced = false) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}

it('切換客人後遲到的載入只能清理，不能覆蓋新客人；離場清理場景', async () => {
  media();
  let resolveOld!: (value: CharacterScene) => void;
  const oldScene = scene(), nextScene = scene();
  vi.mocked(createCharacterScene).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(nextScene);
  const view = render(<CharacterPortrait art="rabbit" />);
  view.rerender(<CharacterPortrait art="deer" happy />);
  await act(async () => {});
  expect(view.container.querySelector('[data-character="deer"]')?.getAttribute('data-animated')).toBe('true');
  await act(async () => { resolveOld(oldScene); });
  expect(oldScene.destroy).toHaveBeenCalledOnce();
  expect(oldScene.motion).not.toHaveBeenCalled();
  expect(nextScene.celebrate).toHaveBeenCalledWith(true);
  view.unmount();
  expect(nextScene.destroy).toHaveBeenCalledOnce();
});

it('WebGL 失敗仍切換反應圖；反應圖失敗回退原角色', async () => {
  media(true);
  vi.mocked(createCharacterScene).mockRejectedValueOnce(new Error('WebGL unavailable'));
  const view = render(<CharacterPortrait art="fox" happy />);
  await act(async () => {});
  expect(view.container.querySelector('image')?.getAttribute('href')).toContain('visitor-fox-happy-v1.webp');
  fireEvent.error(view.container.querySelector('image')!);
  expect(view.container.querySelector('image')?.getAttribute('href')).toContain('forest-visitor-v3.webp');
});

it('減少動態偏好交給場景；載入失敗仍保留相同尺寸的靜態客人', async () => {
  media(true);
  const ready = scene();
  vi.mocked(createCharacterScene).mockResolvedValueOnce(ready).mockRejectedValueOnce(new Error('WebGL unavailable'));
  const view = render(<CharacterPortrait art="owl" />);
  await act(async () => {});
  expect(ready.motion).toHaveBeenCalledWith(true);
  view.rerender(<CharacterPortrait art="bear" />);
  await act(async () => {});
  expect(view.container.querySelector('.mw-character')?.getAttribute('data-animated')).toBe('false');
  expect(view.container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 240 260');
    expect(view.container.querySelector('image')?.getAttribute('href')).toContain('visitor-bear-artisan-v2.webp');
});
