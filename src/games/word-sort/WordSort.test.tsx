// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { WordSort } from './WordSort';
import { pools } from './pools';

// 真實特效生命週期另測；這裡以缺少特效的情境驗證 DOM 遊戲可完整完成。
vi.mock('./WordSortFX', () => ({ WordSortFX: class {
  async mount() {} resize() {} pause() {} resume() {} destroy() {} dispatch() {} burst() {} clear() {}
} }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const setup = () => render(<StrictMode><ThemeProvider><WordSort /></ThemeProvider></StrictMode>);
const start = () => fireEvent.click(screen.getByRole('button', { name: /三四年級・基礎配對/ }));
function classify(allCorrect = false) {
  for (let i = 0; i < 12; i++) {
    const def = document.querySelector('.card-def')!.textContent;
    const item = pools['三四年級・基礎配對'].find(word => word.def === def)!;
    fireEvent.click(screen.getByRole('button', { name: allCorrect && item.suffix === 'less' ? '-less 沒有⋯⋯的' : '-ful 充滿⋯⋯的' }));
    fireEvent.click(screen.getByRole('button', { name: '下一題' }));
    act(() => vi.advanceTimersByTime(680));
  }
}
function setScannerTarget(correct = true) {
  const definition = document.querySelector('#challenge-zh')!.textContent!;
  const stem = pools['三四年級・基礎配對'].find(word => definition.includes(`「${word.def}」`))!.stem;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const target = this.classList.contains('scanner-gate') || (this.classList.contains('courier-crate') && (this.querySelector('span')?.textContent === stem) === correct);
    return { left: target ? 0 : 500, width: 100, top: 0, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() {} };
  });
}
it('十二題分類、三次快遞、錯題複習與重玩完整完成', () => {
  setup(); start(); classify();
  for (let i = 0; i < 3; i++) {
    expect(screen.getByText(`單字快遞 ${i + 1} / 3`)).toBeTruthy();
    setScannerTarget(); fireEvent.click(screen.getByRole('button', { name: '送出！' }));
    expect((screen.getByRole('button', { name: '送出！' }) as HTMLButtonElement).disabled).toBe(true);
    act(() => vi.advanceTimersByTime(1250));
  }
  expect(screen.getByRole('heading', { name: '分完了！' })).toBeTruthy();
  expect(document.querySelectorAll('.review-item')).toHaveLength(6);
  expect(document.querySelector('.result-score')!.textContent).toContain('6 / 12');
  fireEvent.click(screen.getByRole('button', { name: '再玩一次' }));
  expect(screen.getByText('答對 0')).toBeTruthy();
  expect(document.querySelectorAll('.coll-item')).toHaveLength(0);
});
it('揭答期間禁止重複作答，結束清除舊計時器，不污染新局', () => {
  setup(); start();
  const button = screen.getByRole('button', { name: '-ful 充滿⋯⋯的' });
  fireEvent.click(button); fireEvent.click(button);
  expect(document.querySelectorAll('.coll-item')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '結束' }));
  start(); const def = document.querySelector('.card-def')!.textContent;
  act(() => vi.advanceTimersByTime(8000));
  expect(document.querySelector('.card-def')!.textContent).toBe(def);
  expect(document.querySelectorAll('.coll-item')).toHaveLength(0);
});
it('錯抓可重試，快遞成功後立刻離場取消進度回呼及動畫', () => {
  const view = setup(); start(); classify(true);
  setScannerTarget(false); fireEvent.click(screen.getByRole('button', { name: '送出！' }));
  expect(screen.getByRole('status').textContent).toContain('減速再試一次');
  setScannerTarget(); fireEvent.click(screen.getByRole('button', { name: '送出！' }));
  fireEvent.click(screen.getByRole('button', { name: '結束' }));
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByRole('heading', { name: '字尾大分流' })).toBeTruthy();
  start(); view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
