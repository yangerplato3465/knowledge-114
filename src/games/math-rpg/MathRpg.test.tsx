// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MathRpg } from './MathRpg';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { version } from '../../../config.json';

vi.mock('./Battlefield', () => ({ Battlefield: () => <div data-testid="battlefield" /> }));
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const start = () => { render(<ThemeProvider><MathRpg /></ThemeProvider>); fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' })); };
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

test('準備頁標示題庫限制、支援年級單元選擇並保留網站導覽', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  const main = within(screen.getByRole('main'));
  expect(main.getByText(/4 道現有簡單示範題/)).toBeTruthy();
  fireEvent.change(main.getByRole('combobox', { name: '年級' }), { target: { value: '六年級' } });
  expect((main.getByRole('combobox', { name: '複習單元' }) as HTMLSelectElement).value).toBe('數量關係');
  expect(screen.getByLabelText('網站版本').textContent).toBe('v' + version);
});
test('鍵盤只能答一次、回饋凍結蓄力、切分頁要手動恢復、離場清理計時器', () => {
  start(); wait(2000);
  fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: '2' });
  expect(screen.getByText(/第 1 題/)).toBeTruthy();
  const charge = screen.getByRole('progressbar').getAttribute('value');
  wait(400); expect(screen.getByRole('progressbar').getAttribute('value')).toBe(charge);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('heading', { name: '先休息一下' })).toBeTruthy();
  const hp = screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value');
  wait(60000); expect(screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value')).toBe(hp);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('heading', { name: '先休息一下' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '結束本局，回到準備' }));
  expect(vi.getTimerCount()).toBe(0);
});
test('五關全流程可經過四次成長到勝利回顧', () => {
  start(); let cards = 0;
  const answers: Record<string, string> = { '80 的 50% 是多少？': '40', '1/4 等於百分之幾？': '25%', '0.3 化成百分率是多少？': '30%', '20 是 100 的百分之幾？': '20%' };
  for (let step = 0; step < 40; step++) {
    if (screen.queryByRole('heading', { name: '五關完成，勇者凱旋！' })) break;
    if (screen.queryByRole('heading', { name: '選一份力量，繼續前進' })) {
      fireEvent.click(screen.getByRole('button', { name: /磨利劍鋒/ })); cards++; continue;
    }
    const heading = document.querySelector('.mr-panel h2')!.textContent!;
    const options = within(document.querySelector('.mr-answers') as HTMLElement).getAllByRole('button');
    fireEvent.click(options.find(button => button.querySelector('span')?.textContent === answers[heading])!);
    wait(1300);
    expect(screen.queryByRole('button', { name: '下一題' })).toBeNull();
  }
  expect(cards).toBe(4); expect(screen.getByRole('heading', { name: '五關完成，勇者凱旋！' })).toBeTruthy();
  expect(screen.getByText(/本次不發放獎品/)).toBeTruthy();
});
test('錯答自動結算一次；暫停保留提示與剩餘回饋時間，離場不觸發舊局換題', () => {
  start();
  const answers: Record<string, string> = { '80 的 50% 是多少？': '40', '1/4 等於百分之幾？': '25%', '0.3 化成百分率是多少？': '30%', '20 是 100 的百分之幾？': '20%' };
  const heading = document.querySelector('.mr-panel h2')!.textContent!;
  const options = within(document.querySelector('.mr-answers') as HTMLElement).getAllByRole('button');
  fireEvent.click(options.find(button => button.querySelector('span')?.textContent !== answers[heading])!);
  wait(1000);
  const hp = Number(screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value'));
  fireEvent.click(screen.getByRole('button', { name: '暫停' }));
  expect(screen.getByText(/正確答案：/)).toBeTruthy();
  wait(10000);
  expect(Number(screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value'))).toBe(hp);
  fireEvent.click(screen.getByRole('button', { name: '返回戰鬥' }));
  wait(1000); expect(screen.getByText(/第 1 題/)).toBeTruthy();
  wait(400); expect(screen.getByText(/第 2 題/)).toBeTruthy();
  expect(Number(screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value'))).toBe(hp - 12);
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0');
  fireEvent.keyDown(window, { key: '1' });
  fireEvent.click(screen.getByRole('button', { name: '暫停' }));
  fireEvent.click(screen.getByRole('button', { name: '結束本局，回到準備' }));
  fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' }));
  wait(3000);
  expect(screen.getByText(/第 1 題/)).toBeTruthy();
});
