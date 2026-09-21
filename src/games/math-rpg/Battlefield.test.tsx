// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Battlefield } from './Battlefield';
import { createBattle } from './battle';
import { createScene, type Scene } from './battle-scene';

vi.mock('./battle-scene', () => ({ createScene: vi.fn() }));
const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('matchMedia', vi.fn(() => media)); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const scene = (): Scene => ({ update: vi.fn(), motion: vi.fn(), destroy: vi.fn() });
test('late scene completion after leaving is destroyed and cannot mark a new game ready', async () => {
  let resolve!: (value: Scene) => void;
  vi.mocked(createScene).mockReturnValue(new Promise(r => { resolve = r; }));
  const ready = vi.fn(), view = render(<Battlefield state={createBattle(1)} onReady={ready} />);
  view.unmount();
  const late = scene();
  await act(async () => { resolve(late); });
  expect(late.destroy).toHaveBeenCalledOnce();
  expect(ready).toHaveBeenCalledExactlyOnceWith(false);
  expect(vi.getTimerCount()).toBe(0);
  expect(media.removeEventListener).toHaveBeenCalled();
});
test('load failure and timeout allow the DOM game; a late load cannot replace the fallback', async () => {
  vi.mocked(createScene).mockRejectedValueOnce(new Error('No WebGL'));
  const ready = vi.fn();
  const view = render(<Battlefield state={createBattle(1)} onReady={ready} />);
  await act(async () => {});
  expect(screen.getByRole('status').textContent).toContain('簡易畫面');
  expect(ready).toHaveBeenLastCalledWith(true);
  view.unmount(); ready.mockClear();
  let resolve!: (value: Scene) => void;
  vi.mocked(createScene).mockReturnValueOnce(new Promise(r => { resolve = r; }));
  render(<Battlefield state={createBattle(1)} onReady={ready} />);
  act(() => vi.advanceTimersByTime(12000));
  expect(ready).toHaveBeenLastCalledWith(true);
  const late = scene(); await act(async () => { resolve(late); });
  expect(late.destroy).toHaveBeenCalledOnce();
  expect(screen.getByRole('status').textContent).toContain('簡易畫面');
});
test('pause and repeated state updates reuse the renderer; departure disposes it', async () => {
  const renderer = scene(); vi.mocked(createScene).mockResolvedValueOnce(renderer);
  const ready = vi.fn(), state = createBattle(1);
  const view = render(<Battlefield state={state} onReady={ready} />);
  await act(async () => {});
  const paused = { ...state, paused: true };
  view.rerender(<Battlefield state={paused} onReady={ready} />);
  expect(createScene).toHaveBeenCalledOnce();
  expect(renderer.update).toHaveBeenLastCalledWith(paused);
  view.unmount(); expect(renderer.destroy).toHaveBeenCalledOnce();
});
