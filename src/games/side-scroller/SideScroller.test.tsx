// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { SideScroller } from './SideScroller';
import { createSideScroller, type SceneStatus, type SideScrollerScene } from './scene';

vi.mock('./scene', () => ({ createSideScroller: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const fakeScene = (): SideScrollerScene => ({ hold: vi.fn(), tap: vi.fn(), setMode: vi.fn(), setColor: vi.fn(), togglePause: vi.fn(), restart: vi.fn(), destroy: vi.fn() });
it('提供回冒險座入口、可用鍵盤的控制與重試操作', async () => {
  const created = fakeScene();
  vi.mocked(createSideScroller).mockImplementation(async (_host, _signal, onStatus) => {
    created.setMode = vi.fn(mode => onStatus({ mode, paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null }));
    return created;
  });
  render(<ThemeProvider><SideScroller /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByRole('link', { name: '← 回冒險座' }).getAttribute('href')).toBe('/pages/activities.html#games');
  expect(screen.getByRole('button', { name: '世界巡覽' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('button', { name: '跳躍' })).toBeNull();
  expect(screen.queryByRole('button', { name: '向左移動' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '試跑' })); expect(created.setMode).toHaveBeenCalledWith('play');
  const jump = screen.getByRole('button', { name: '跳躍' });
  fireEvent.keyDown(jump, { key: 'Enter' }); fireEvent.keyUp(jump, { key: 'Enter' });
  expect(created.hold).toHaveBeenNthCalledWith(1, 'jump', true, 'button-jump');
  expect(created.hold).toHaveBeenNthCalledWith(2, 'jump', false, 'button-jump');
  fireEvent.click(screen.getByRole('button', { name: '從頭開始' })); expect(created.restart).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(screen.getByRole('region', { name: '橫向遊戲世界' }));
  fireEvent.click(screen.getByRole('button', { name: '世界巡覽' })); expect(created.setMode).toHaveBeenLastCalledWith('preview');
  expect(screen.queryByRole('button', { name: '跳躍' })).toBeNull();
  cleanup(); expect(created.destroy).toHaveBeenCalledOnce();
});
it('紅藍控制互斥、切色後焦點回到場景，暫停巡覽仍可檢視顏色', async () => {
  const created = fakeScene();
  vi.mocked(createSideScroller).mockImplementation(async (_host, _signal, onStatus) => {
    let status: SceneStatus = { mode: 'preview', paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null };
    created.setColor = vi.fn(color => { status = { ...status, color }; onStatus(status); });
    created.togglePause = vi.fn(() => { status = { ...status, paused: !status.paused }; onStatus(status); });
    created.setMode = vi.fn(mode => { status = { ...status, mode, paused: false }; onStatus(status); });
    created.restart = vi.fn(() => { status = { ...status, color: null, paused: false }; onStatus(status); });
    return created;
  });
  render(<ThemeProvider><SideScroller /></ThemeProvider>); await act(async () => {});
  const red = screen.getByRole('button', { name: '紅色世界' }), blue = screen.getByRole('button', { name: '藍色世界' });
  expect(red.getAttribute('aria-pressed')).toBe('false'); expect(blue.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(red); expect(created.setColor).toHaveBeenLastCalledWith('red'); expect(red.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(screen.getByRole('region', { name: '橫向遊戲世界' }));
  fireEvent.click(screen.getByRole('button', { name: '暫停' })); expect(blue.hasAttribute('disabled')).toBe(false);
  fireEvent.click(blue); expect(red.getAttribute('aria-pressed')).toBe('false'); expect(blue.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '試跑' })); fireEvent.click(screen.getByRole('button', { name: '暫停' }));
  expect(red.hasAttribute('disabled')).toBe(true); expect(blue.hasAttribute('disabled')).toBe(true); expect(screen.getByRole('button', { name: '跳躍' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '從頭開始' })); expect(red.getAttribute('aria-pressed')).toBe('false'); expect(blue.getAttribute('aria-pressed')).toBe('false');
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
