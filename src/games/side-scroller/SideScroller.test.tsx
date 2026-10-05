// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { SideScroller } from './SideScroller';
import { createSideScroller, type SideScrollerScene } from './scene';

vi.mock('./scene', () => ({ createSideScroller: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const fakeScene = (): SideScrollerScene => ({ hold: vi.fn(), tap: vi.fn(), togglePause: vi.fn(), restart: vi.fn(), destroy: vi.fn() });
it('提供回冒險座入口、可用鍵盤的控制與重試操作', async () => {
  const created = fakeScene(); vi.mocked(createSideScroller).mockResolvedValue(created);
  render(<ThemeProvider><SideScroller /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByRole('link', { name: '← 回冒險座' }).getAttribute('href')).toBe('/pages/activities.html#games');
  const right = screen.getByRole('button', { name: '向右移動' });
  fireEvent.keyDown(right, { key: 'Enter' }); fireEvent.keyUp(right, { key: 'Enter' });
  expect(created.hold).toHaveBeenNthCalledWith(1, 'right', true, 'button-right');
  expect(created.hold).toHaveBeenNthCalledWith(2, 'right', false, 'button-right');
  fireEvent.click(screen.getByRole('button', { name: '重新試走' })); expect(created.restart).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(screen.getByRole('region', { name: '米洛橫向平台遊戲' }));
  cleanup(); expect(created.destroy).toHaveBeenCalledOnce();
});
it('離場會取消載入；延遲完成的舊場景必須銷毀', async () => {
  let resolve!: (scene: SideScrollerScene) => void;
  vi.mocked(createSideScroller).mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = render(<ThemeProvider><SideScroller /></ThemeProvider>);
  const signal = vi.mocked(createSideScroller).mock.calls[0][1];
  view.unmount(); expect(signal.aborted).toBe(true);
  const created = fakeScene();
  await act(async () => resolve(created));
  expect(created.destroy).toHaveBeenCalledOnce(); expect(created.restart).not.toHaveBeenCalled();
});
