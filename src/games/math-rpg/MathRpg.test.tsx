// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { StrictMode } from 'react';
import { MathRpg } from './MathRpg';
import { createGameScene, type GameScene } from './scene';

vi.mock('./scene', () => ({ createGameScene: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });
const emptyScene = () => ({ destroy: vi.fn() }) as unknown as GameScene;

test('舊遊戲介面撤除，React 只掛載畫布及隱藏的輔助語意', async () => {
  vi.mocked(createGameScene).mockResolvedValue(emptyScene());
  render(<MathRpg />);
  await act(async () => {});
  expect(screen.getByRole('main').dataset.status).toBe('ready');
  expect(document.querySelector('.mr-pixi-host')).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.queryByRole('heading')).toBeNull();
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(document.querySelector('.mr-game')!.children).toHaveLength(2);
  expect(screen.getByRole('status').closest('.mr-accessibility')).toBeTruthy();
});

test('StrictMode 與卸載後的晚到場景不得覆蓋新狀態', async () => {
  const pending: ((scene: GameScene) => void)[] = [];
  vi.mocked(createGameScene).mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const page = render(<StrictMode><MathRpg /></StrictMode>);
  const stale = emptyScene(), live = emptyScene();
  await act(async () => { pending[0](stale); pending[1](live); });
  expect(stale.destroy).toHaveBeenCalledTimes(1);
  expect(live.destroy).not.toHaveBeenCalled();
  expect(screen.getByRole('main').dataset.status).toBe('ready');
  page.unmount();
  expect(live.destroy).toHaveBeenCalledTimes(1);
});

test('逾時直接更新失敗狀態，重試後晚到的舊場景不影響新場景', async () => {
  vi.useFakeTimers();
  let finish!: (scene: GameScene) => void;
  vi.mocked(createGameScene).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<MathRpg />);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(screen.getByRole('main').dataset.status).toBe('error');
  expect(vi.mocked(createGameScene).mock.calls[0][1].aborted).toBe(true);
  const live = emptyScene(), late = emptyScene();
  vi.mocked(createGameScene).mockResolvedValueOnce(live);
  fireEvent.click(screen.getByRole('button', { name: '重新載入畫布' }));
  await act(async () => { finish(late); });
  expect(late.destroy).toHaveBeenCalledTimes(1);
  expect(live.destroy).not.toHaveBeenCalled();
  expect(screen.getByRole('main').dataset.status).toBe('ready');
});

test('載入拒絕可透過輔助操作重試', async () => {
  vi.mocked(createGameScene).mockRejectedValueOnce(new Error('load failed'));
  render(<MathRpg />);
  await act(async () => {});
  expect(screen.getByRole('main').dataset.status).toBe('error');
  vi.mocked(createGameScene).mockResolvedValueOnce(emptyScene());
  fireEvent.click(screen.getByRole('button', { name: '重新載入畫布' }));
  await act(async () => {});
  expect(screen.getByRole('main').dataset.status).toBe('ready');
});
