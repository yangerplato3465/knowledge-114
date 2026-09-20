// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MathRpg } from './MathRpg';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { version } from '../../../config.json';
import { createDecimalDeck } from './decimal-questions';
import { createFactorDeck, FACTOR_UNIT } from './factor-questions';
import { createFractionDeck, FRACTION_UNIT } from './fraction-questions';
import { createBattle, enemyFor } from './battle';

vi.mock('./Battlefield', () => ({ Battlefield: () => <div data-testid="battlefield" /> }));
beforeEach(() => {
  vi.useFakeTimers(); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(array => { if (array instanceof Uint32Array) array[0] = 123; return array; });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const start = () => { render(<ThemeProvider><MathRpg /></ThemeProvider>); fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' })); };
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

test('準備頁標示題庫限制、支援年級單元選擇並保留網站導覽', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  const main = within(screen.getByRole('main'));
  expect(main.getByText(/五上第九冊第一單元/)).toBeTruthy();
  expect(within(main.getByRole('combobox', { name: '複習單元' })).getAllByRole('option')).toHaveLength(9);
  expect(main.getByRole('option', { name: '2–3. 因數與倍數' })).toBeTruthy();
  fireEvent.change(main.getByRole('combobox', { name: '年級／學期' }), { target: { value: '六上' } });
  expect((main.getByRole('combobox', { name: '複習單元' }) as HTMLSelectElement).value).toBe('最大公因數與最小公倍數');
  expect(within(main.getByRole('combobox', { name: '複習單元' })).getAllByRole('option')).toHaveLength(9);
  expect((main.getByRole('button', { name: '題庫尚未開放' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(document.querySelector('form')!);
  expect(screen.queryByRole('region', { name: '數學勇者遊戲' })).toBeNull();
  fireEvent.change(main.getByRole('combobox', { name: '年級／學期' }), { target: { value: '五上' } });
  expect((main.getByRole('button', { name: '開始五關冒險' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.change(main.getByRole('combobox', { name: '複習單元' }), { target: { value: '多邊形與扇形' } });
  expect((main.getByRole('button', { name: '題庫尚未開放' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByLabelText('網站版本').textContent).toBe('v' + version);
});

test('第四單元三選一／四選一接題、分數顯示、暫停回饋與鍵盤範圍', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  fireEvent.change(screen.getByRole('combobox', { name: '複習單元' }), { target: { value: FRACTION_UNIT } });
  fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' }));
  const deck = createFractionDeck(123 ^ 0x12345), kinds = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const question = deck(); kinds.add(question.kind);
    const options = within(document.querySelector('.mr-answers') as HTMLElement).getAllByRole('button');
    expect(options).toHaveLength(question.a.length);
    expect(screen.getByText(new RegExp(`按鍵盤 1～${question.a.length}`))).toBeTruthy();
    if (question.a.length === 3) {
      fireEvent.keyDown(window, { key: '4' });
      expect(document.querySelector('.mr-feedback')).toBeNull();
      expect(options.every(b => !(b as HTMLButtonElement).disabled)).toBe(true);
    }
    fireEvent.keyDown(window, { key: String(question.correct + 1) });
    fireEvent.click(screen.getByRole('button', { name: '暫停' }));
    expect(screen.getByText(/正確答案：/)).toBeTruthy();
    expect(document.querySelector('.mr-fraction')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '返回戰鬥' }));
    wait(1300);
    if (screen.queryByRole('heading', { name: '選一份力量，繼續前進' })) fireEvent.click(screen.getByRole('button', { name: /磨利劍鋒/ }));
  }
  expect(kinds.size).toBe(7);
});

test('合併單元連續接題不混入小數題，七種題型均可作答', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  fireEvent.change(screen.getByRole('combobox', { name: '複習單元' }), { target: { value: FACTOR_UNIT } });
  expect(screen.getByText(/第 2–3 單元/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' }));
  const deck = createFactorDeck(123 ^ 0x12345), kinds = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const question = deck(); kinds.add(question.kind);
    expect(document.querySelector('.mr-panel h2')!.textContent).toBe(question.q);
    const options = within(document.querySelector('.mr-answers') as HTMLElement).getAllByRole('button');
    fireEvent.click(options[question.correct]); wait(1300);
    if (screen.queryByRole('heading', { name: '選一份力量，繼續前進' })) fireEvent.click(screen.getByRole('button', { name: /磨利劍鋒/ }));
  }
  expect(kinds.size).toBe(7);
});

test('因數與倍數使用較短蓄力；離場切回小數後恢復原計時', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  fireEvent.change(screen.getByRole('combobox', { name: '複習單元' }), { target: { value: FACTOR_UNIT } });
  expect(screen.getByText(/此單元採較快戰鬥節奏/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' }));
  const quick = enemyFor(createBattle(123, undefined, 'quick'));
  expect(Number(screen.getByRole('progressbar').getAttribute('max'))).toBe(quick.interval);
  wait(Math.ceil(quick.interval * 1000));
  expect(Number(screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value'))).toBeLessThan(200);
  fireEvent.click(screen.getByRole('button', { name: '暫停' }));
  fireEvent.click(screen.getByRole('button', { name: '結束本局，回到準備' }));
  fireEvent.change(screen.getByRole('combobox', { name: '複習單元' }), { target: { value: '多位小數與加減' } });
  fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' }));
  expect(Number(screen.getByRole('progressbar').getAttribute('max'))).toBe(enemyFor(createBattle(123)).interval);
  wait(Math.ceil(quick.interval * 1000));
  expect(Number(screen.getByRole('meter', { name: '勇者 HP' }).getAttribute('value'))).toBe(200);
});

test('五上小數單元使用動態題庫，作答後保留提示並自動接題', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  fireEvent.change(screen.getByRole('combobox', { name: '複習單元' }), { target: { value: '多位小數與加減' } });
  expect(screen.getByText(/五上第九冊第一單元/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '開始五關冒險' }));
  const question = document.querySelector('.mr-panel h2')!.textContent;
  expect(document.querySelectorAll('.mr-answers button')).toHaveLength(4);
  fireEvent.keyDown(window, { key: '1' });
  expect(document.querySelector('.mr-feedback')!.textContent).toBeTruthy();
  wait(2400);
  expect(screen.getByText(/第 2 題/)).toBeTruthy();
  expect(document.querySelector('.mr-panel h2')!.textContent).not.toBe(question);
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
  const deck = createDecimalDeck(123 ^ 0x12345);
  for (let step = 0; step < 40; step++) {
    if (screen.queryByRole('heading', { name: '五關完成，勇者凱旋！' })) break;
    if (screen.queryByRole('heading', { name: '選一份力量，繼續前進' })) {
      fireEvent.click(screen.getByRole('button', { name: /磨利劍鋒/ })); cards++; continue;
    }
    const heading = document.querySelector('.mr-panel h2')!.textContent!;
    const question = deck();
    expect(heading).toBe(question.q);
    const options = within(document.querySelector('.mr-answers') as HTMLElement).getAllByRole('button');
    fireEvent.click(options[question.correct]);
    wait(1300);
    expect(screen.queryByRole('button', { name: '下一題' })).toBeNull();
  }
  expect(cards).toBe(4); expect(screen.getByRole('heading', { name: '五關完成，勇者凱旋！' })).toBeTruthy();
  expect(screen.getByText(/本次不發放獎品/)).toBeTruthy();
});
test('錯答自動結算一次；暫停保留提示與剩餘回饋時間，離場不觸發舊局換題', () => {
  start();
  const question = createDecimalDeck(123 ^ 0x12345)();
  const heading = document.querySelector('.mr-panel h2')!.textContent!;
  const options = within(document.querySelector('.mr-answers') as HTMLElement).getAllByRole('button');
  expect(heading).toBe(question.q);
  fireEvent.click(options[(question.correct + 1) % 4]);
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
