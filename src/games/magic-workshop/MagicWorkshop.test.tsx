// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MagicWorkshop } from './MagicWorkshop';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { currentPuzzle } from './session';
import { shortestSolution } from './rules';
import type { SceneModel } from './scene-model';

const bridge = vi.hoisted(() => ({ create: vi.fn(), audio: vi.fn() }));
vi.mock('./play-scene', () => ({ createPlayScene: bridge.create }));
vi.mock('./useWorkshopAudio', () => ({ useWorkshopAudio: () => bridge.audio }));
let model: SceneModel;
let activate: (id: string) => void;
let destroy: ReturnType<typeof vi.fn>;
let signal: AbortSignal;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  bridge.create.mockReset(); bridge.audio.mockReset(); destroy = vi.fn();
  bridge.create.mockImplementation(async (_host, initial, abort, hooks) => {
    model = initial; activate = hooks.activate; signal = abort;
    const update = (next: SceneModel) => {
      model = next;
      hooks.controls([{ id: 'start', label: '開始五關委託', x: 0, y: 0, w: 100, h: 50 }]);
    };
    return { update, focus: vi.fn(), activate: hooks.activate, cancel: vi.fn(), motion: vi.fn(), destroy };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount() {
  const view = render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  await screen.findByRole('button', { name: '開始五關委託' });
  return view;
}
function command(id: string) { act(() => activate(id)); }

it('載入一個場景，沒有舊的 DOM 卡片、瓶子或分頁；保留可及性操作', async () => {
  await mount();
  expect(document.querySelectorAll('.mw-pixi-host')).toHaveLength(1);
  expect(document.querySelector('.mw-workbench, .mw-progress, .mw-commission, .mw-home')).toBeNull();
  expect(screen.getByRole('button', { name: '開始五關委託' }).closest('.mw-accessibility')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '開始五關委託' }));
  expect(model.game.screen).toBe('playing');
});

it('場景的點選、拖曳、無效操作、復原、提示、交付共用原規則', async () => {
  await mount(); command('practice'); command('bottle:0'); command('spring');
  expect(model.game.screen).toBe('ready'); expect(model.game.history).toHaveLength(1);
  command('undo'); expect(model.game.amounts).toEqual([0,0]);
  command('drop:0:recycler'); expect(model.game.history).toHaveLength(0);
  command('hint'); expect(model.game.hintLevel).toBe(1);
  command('drop:1:spring'); expect(model.game.amounts).toEqual([0,3]);
  command('drop:1:bottle:0'); expect(model.game.amounts).toEqual([2,1]);
  command('deliver'); expect(model.game.screen).toBe('practice-done');
});

it.each([3,4,5])('%i 星重玩代碼與完整五關結果維持一致', async difficulty => {
  await mount();command(`difficulty:${difficulty}`);command('code');command('key:2');command('key:7');command('code-start');
  expect(model.game.seed).toBe(27);expect(model.game.difficulty).toBe(difficulty);
  const ids=model.game.deck.map(p=>p.id);
  for(let i=0;i<5;i++) {
    const p=currentPuzzle(model.game);
    for(const action of shortestSolution(p)!) command(`drop:${action.from}:${action.kind==='fill'?'spring':action.kind==='empty'?'recycler':`bottle:${action.to}`}`);
    expect(model.game.screen).toBe('ready');expect(model.game.history).toHaveLength(p.minimumSteps);
    command('deliver');
  }
  expect(model.game.screen).toBe('finished');expect(model.game.results).toHaveLength(5);
  command('replay');expect(model.game.deck.map(p=>p.id)).toEqual(ids);
});

it('重玩代碼拒絕超過 uint32 的數值並可刪除修正', async () => {
  await mount();command('code');for(let i=0;i<10;i++)command('key:9');command('code-start');
  expect(model.game.screen).toBe('home');command('key:清除');command('key:2');command('key:7');command('key:⌫');
  expect(model.seed).toBe('2');command('code-start');expect(model.game.seed).toBe(2);
});

it('離頁中止載入、銷毀場景；晚到的場景也立即銷毀', async () => {
  const mounted=await mount();mounted.unmount();expect(signal.aborted).toBe(true);expect(destroy).toHaveBeenCalledOnce();
  let resolve!: (value: unknown)=>void;
  bridge.create.mockImplementationOnce((_host,_initial,abort) => { signal=abort;return new Promise(r=>{resolve=r;}); });
  const second=render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);second.unmount();
  const lateDestroy=vi.fn();await act(async()=>resolve({destroy:lateDestroy}));
  expect(signal.aborted).toBe(true);expect(lateDestroy).toHaveBeenCalledOnce();
});

it('載入失敗提供可重試入口', async () => {
  bridge.create.mockRejectedValueOnce(new Error('WebGL unavailable'));
  render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  fireEvent.click(await screen.findByRole('button',{name:'重新開啟工坊'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'開始五關委託'})).toBeTruthy());
});

it('無原生全螢幕時填滿遊戲模式；場景出口與 Escape 恢復捲動', async () => {
  const view=await mount();
  fireEvent.click(screen.getByRole('button',{name:'全螢幕'}));
  expect(document.querySelector('.mw-immersive')).toBeTruthy();expect(model.fullscreen).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  command('fullscreen');expect(document.querySelector('.mw-immersive')).toBeNull();
  expect(document.body.style.overflow).toBe('');
  fireEvent.click(screen.getByRole('button',{name:'全螢幕'}));
  fireEvent.keyDown(window,{key:'Escape'});expect(model.fullscreen).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'全螢幕'}));
  view.unmount();expect(document.body.style.overflow).toBe('');
});

it('原生全螢幕失敗保留遊戲模式，過期失敗不會重新進入', async () => {
  await mount();let reject!: (reason: Error)=>void;
  const shell=document.querySelector('.mw-game') as HTMLElement;
  shell.requestFullscreen=vi.fn(()=>new Promise<void>((_,fail)=>{reject=fail;}));
  fireEvent.click(screen.getByRole('button',{name:'全螢幕'}));
  await act(async()=>reject(new Error('unsupported')));expect(model.fullscreen).toBe(true);
  command('fullscreen');
  fireEvent.click(screen.getByRole('button',{name:'全螢幕'}));
  fireEvent.keyDown(window,{key:'Escape'});
  await act(async()=>reject(new Error('late')));expect(model.fullscreen).toBe(false);
});

it('載入途中進入全螢幕，晚到的場景仍收到出口狀態', async () => {
  let finish!: ()=>void;
  const original=bridge.create.getMockImplementation()!;
  bridge.create.mockImplementationOnce((...args)=>new Promise(resolve=>{finish=()=>resolve(original(...args));}));
  render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button',{name:'全螢幕'}));
  await act(async()=>finish());
  expect(model.fullscreen).toBe(true);
});
