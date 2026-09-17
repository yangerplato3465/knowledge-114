// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { MathRpg } from './MathRpg';
import { questionPools, type Question } from './questions';
vi.mock('./pixiLayers', () => ({ createBattleGraphics: () => ({ mount: async () => false, update() {}, destroy() {} }) }));

beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function () { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function () { this.open = false; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const fixedPool = Object.keys(questionPools['五年級']).find(name => Array.isArray(questionPools['五年級'][name]))!;
const setup = () => {
  const view = render(<StrictMode><ThemeProvider><MathRpg /></ThemeProvider></StrictMode>);
  fireEvent.change(screen.getByLabelText('題庫'), { target: { value: fixedPool } });
  return view;
};
const start = () => fireEvent.click(screen.getByRole('button', { name: '開始冒險' }));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
function correct() {
  const q = Object.values(questionPools).flatMap(pools => Object.values(pools)).filter(Array.isArray).flat().find((q: Question) => q.q === document.querySelector('#mr-prompt')?.textContent)!;
  fireEvent.click(screen.getByRole('button', { name: q.a[q.correct] }));
}

it('玩法視窗暫停倒數，取消離場後繼續原題', () => {
  setup(); start(); advance(5000);
  const prompt = document.querySelector('#mr-prompt')!.textContent;
  fireEvent.click(screen.getByRole('button', { name: '玩法說明' }));
  advance(60000);
  expect(screen.getByTestId('player-hp').textContent).toBe('120 / 120');
  fireEvent.click(screen.getByRole('button', { name: '繼續戰鬥' }));
  expect(document.querySelector('#mr-prompt')!.textContent).toBe(prompt);
  expect(screen.getByRole('timer').textContent).toBe('剩餘 25 秒');
  fireEvent.click(screen.getByRole('button', { name: '結束並選題庫' }));
  fireEvent.click(screen.getByRole('button', { name: '繼續戰鬥' }));
  correct(); advance(1600);
  expect(screen.getByRole('timer').textContent).toBe('剩餘 30 秒');
});

it('StrictMode 六關作答、選卡、勝利與重玩，舊版連結保留', () => {
  setup(); start();
  let upgrades = 0;
  for (let i = 0; i < 60 && !screen.queryByRole('heading', { name: '六關全破！勇者勝利！' }); i++) {
    correct(); advance(1650);
    if (screen.queryByRole('heading', { name: '打倒敵人！選擇一項強化' })) {
      fireEvent.click(document.querySelector('.mr-upgrades button')!); upgrades++; advance(1200);
    }
  }
  expect(upgrades).toBe(5);
  expect(screen.getByRole('heading', { name: '六關全破！勇者勝利！' })).toBe(document.activeElement);
  advance(0); expect(vi.getTimerCount()).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '再玩一次' }));
  expect(screen.getByTestId('player-hp').textContent).toBe('120 / 120');
  expect(screen.getByRole('link', { name: '開啟完整特效舊版' }).getAttribute('href')).toContain('pages/math-rpg.html');
});

it('答錯立即揭答並鎖定，生命在命中時才顯示變化', () => {
  setup(); start();
  const q = questionPools['五年級'][fixedPool] as Question[];
  const wrong = screen.getByRole('button', { name: q[0].a[(q[0].correct + 1) % q[0].a.length] });
  fireEvent.click(wrong); fireEvent.click(wrong);
  expect(screen.getByRole('status').textContent).toContain('答錯了');
  expect(screen.getByTestId('player-hp').textContent).toBe('120 / 120');
  advance(190);
  expect(screen.getByTestId('player-hp').textContent).toBe('110 / 120');
  advance(2810);
  expect(document.querySelector('#mr-prompt')).toBe(document.activeElement);
});

it('超時揭答；結束、切換題庫與卸載清理所有計時器', () => {
  const view = setup(); start(); advance(30000);
  expect(screen.getByRole('status').textContent).toContain('時間到');
  fireEvent.click(screen.getByRole('button', { name: '結束並選題庫' }));
  fireEvent.click(screen.getByRole('button', { name: '確認離開' }));
  advance(0);
  expect(vi.getTimerCount()).toBe(0);
  expect(screen.getByRole('button', { name: '開始冒險' })).toBe(document.activeElement);
  fireEvent.change(screen.getByLabelText('年級'), { target: { value: '六年級' } });
  start(); advance(2000);
  expect(screen.getByTestId('player-hp').textContent).toBe('120 / 120');
  view.unmount();
  advance(0);
  expect(vi.getTimerCount()).toBe(0);
});

it('動態除法題庫可作答，回到選單後不殘留前一題', () => {
  setup();
  // Generator needs a varying random stream to build unique distractors.
  vi.spyOn(Math, 'random').mockRestore();
  fireEvent.change(screen.getByLabelText('題庫'), { target: { value: '整數、小數除以整數' } });
  start();
  expect(document.querySelectorAll('.mr-options button')).toHaveLength(4);
  fireEvent.click(document.querySelector('.mr-options button')!);
  expect((document.querySelector('.mr-options button') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '結束並選題庫' }));
  fireEvent.click(screen.getByRole('button', { name: '確認離開' }));
  advance(0);
  expect(vi.getTimerCount()).toBe(0);
});
