// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { StrictMode } from 'react';
import { MathRpg } from './MathRpg';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { createGameScene, type GameScene } from './scene';

vi.mock('./scene', () => ({ createGameScene: vi.fn() }));
afterEach(() => { cleanup(); Reflect.deleteProperty(document,'fullscreenElement'); Reflect.deleteProperty(document,'exitFullscreen'); vi.useRealTimers(); vi.resetAllMocks(); });
const emptyScene = () => ({ destroy: vi.fn() }) as unknown as GameScene;
const renderGame = (strict=false) => render(strict ? <StrictMode><ThemeProvider><MathRpg /></ThemeProvider></StrictMode> : <ThemeProvider><MathRpg /></ThemeProvider>);

test('共用網站導覽包住遊戲，遊戲內只掛畫布及隱藏的操作語意', async () => {
  vi.mocked(createGameScene).mockResolvedValue(emptyScene());
  renderGame();
  await act(async () => {});
  expect(screen.getByRole('main').dataset.status).toBe('ready');
  expect(document.querySelector('.mr-pixi-host')).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.getByRole('heading', { name: '數學勇者' }).closest('.mr-accessibility')).toBeTruthy();
  expect(screen.getByRole('navigation', {name:'主要導覽'})).toBeTruthy();
  expect(screen.getByRole('navigation', {name:'目前位置'})).toBeTruthy();
  expect(within(screen.getByRole('main')).queryByRole('button')).toBeNull();
  expect(document.querySelector('.mr-game')!.children).toHaveLength(1);
  expect(document.querySelector('.mr-stage')!.children).toHaveLength(2);
  expect(screen.getByRole('status').closest('.mr-accessibility')).toBeTruthy();
});

test('Pixi 控制與隱藏按鈕共用操作與焦點，離場後不接受舊控制回呼', async () => {
  const live = { destroy: vi.fn(), activate: vi.fn(), focus: vi.fn() } as unknown as GameScene;
  vi.mocked(createGameScene).mockImplementation(async (_host, _signal, _loaders, hooks) => {
    hooks?.controls?.([{ id: 'start', label: '開始冒險' }]); return live;
  });
  const page = renderGame(); await act(async () => {});
  const start = screen.getByRole('button', { name: '開始冒險' });
  expect(start.closest('.mr-accessibility')).toBeTruthy();
  fireEvent.focus(start); expect(live.focus).toHaveBeenCalledWith('start');
  fireEvent.click(start); expect(live.activate).toHaveBeenCalledWith('start');
  const hooks = vi.mocked(createGameScene).mock.calls[0][3]; page.unmount();
  act(() => hooks?.controls?.([{ id: 'late', label: '過期操作' }]));
  expect(screen.queryByRole('button', { name: '過期操作' })).toBeNull();
});

test('StrictMode 與卸載後的晚到場景不得覆蓋新狀態', async () => {
  const pending: ((scene: GameScene) => void)[] = [];
  vi.mocked(createGameScene).mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const page = renderGame(true);
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
  renderGame();
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
  renderGame();
  await act(async () => {});
  expect(screen.getByRole('main').dataset.status).toBe('error');
  vi.mocked(createGameScene).mockResolvedValueOnce(emptyScene());
  fireEvent.click(screen.getByRole('button', { name: '重新載入畫布' }));
  await act(async () => {});
  expect(screen.getByRole('main').dataset.status).toBe('ready');
});

test('遊戲內全螢幕支援降級、Escape 回復頁面；卸載後拒絕舊請求', async () => {
  const live={destroy:vi.fn(),fullscreen:vi.fn()} as unknown as GameScene;
  vi.mocked(createGameScene).mockResolvedValue(live);
  const page=renderGame();await act(async()=>{});
  const hooks=vi.mocked(createGameScene).mock.calls[0][3];
  act(()=>hooks?.requestFullscreen?.());
  expect(document.querySelector('.mr-immersive')).toBeTruthy();
  expect(document.body.style.overflow).toBe('hidden');expect(live.fullscreen).toHaveBeenLastCalledWith(true);
  fireEvent.keyDown(window,{key:'Escape'});
  expect(document.querySelector('.mr-immersive')).toBeNull();expect(document.body.style.overflow).toBe('');
  act(()=>hooks?.requestFullscreen?.());page.unmount();
  act(()=>hooks?.requestFullscreen?.());expect(document.body.style.overflow).toBe('');
});

test('原生全螢幕晚於退出完成時立即退出，卸載後的拒絕不再改狀態', async () => {
  vi.mocked(createGameScene).mockResolvedValue(emptyScene());
  const page=renderGame();await act(async()=>{});
  const hooks=vi.mocked(createGameScene).mock.calls[0][3], shell=document.querySelector('.mr-game')!;
  let native:Element|null=null, reject!:(error:Error)=>void;
  const pending=new Promise<void>((_resolve,fail)=>{reject=fail;});
  Object.defineProperty(shell,'requestFullscreen',{value:()=>pending});
  Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>native});
  const exit=vi.fn(async()=>{native=null;document.dispatchEvent(new Event('fullscreenchange'));});
  Object.defineProperty(document,'exitFullscreen',{configurable:true,value:exit});
  act(()=>hooks?.requestFullscreen?.());act(()=>hooks?.requestFullscreen?.());
  await act(async()=>{native=shell;document.dispatchEvent(new Event('fullscreenchange'));});
  expect(exit).toHaveBeenCalledTimes(1);expect(document.querySelector('.mr-immersive')).toBeNull();
  page.unmount();await act(async()=>{reject(new Error('late request'));});
  expect(document.body.style.overflow).toBe('');
});
