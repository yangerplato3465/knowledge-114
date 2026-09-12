// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { QuickQuiz } from './QuickQuiz';
import { questions } from './questions';
import { drawQuestions, normalizeSetting } from './model';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
function setup() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  return render(<StrictMode><ThemeProvider><QuickQuiz /></ThemeProvider></StrictMode>);
}
function start(count = '1', seconds = '1') {
  fireEvent.change(screen.getByLabelText('每題秒數'), { target: { value: seconds } });
  fireEvent.change(screen.getByLabelText('共幾題'), { target: { value: count } });
  fireEvent.click(screen.getByRole('button', { name: '開始挑戰' }));
}
it('題庫每一題與答案保持等價', () => {
  const source = readFileSync('assets/js/quick-quiz.js', 'utf8').split('// 洗牌：')[0];
  const original = runInNewContext(`${source}; JSON.stringify(questions)`);
  expect(questions).toEqual(JSON.parse(original));
});
it('設定沿用原版截斷與範圍修正', () => {
  expect(['', '-1', '0', '3.9', '999'].map(v => normalizeSetting(v, 60))).toEqual([1, 1, 1, 3, 60]);
});
it('抽題不重複且不修改原題庫', () => {
  const before = JSON.stringify(questions);
  const selected = drawQuestions(questions, questions.length, () => 0.3);
  expect(new Set(selected).size).toBe(questions.length);
  expect(JSON.stringify(questions)).toBe(before);
});
it('倒數前不洩漏答案，時間到揭答，完成後可重玩', () => {
  setup(); start();
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('button', { name: '完成' })).toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('status').textContent).toMatch(/(對 \(True\)|錯 \(False\))/);
  fireEvent.click(screen.getByRole('button', { name: '完成' }));
  expect(screen.getByText('1 題都答完囉，做得好！')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '再玩一次' }));
  expect((screen.getByLabelText('每題秒數') as HTMLInputElement).value).toBe('1');
});
it('下一題重新倒數，回到設定或卸載皆清除計時器', () => {
  const view = setup();
  const scheduled = vi.spyOn(window, 'setTimeout');
  const cleared = vi.spyOn(window, 'clearTimeout');
  const countdownHandle = () => {
    const index = scheduled.mock.calls.length - 1 - [...scheduled.mock.calls].reverse().findIndex(call => call[1] === 1000);
    return scheduled.mock.results[index].value;
  };
  start('2');
  act(() => vi.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: '下一題' }));
  expect(screen.getByText('第 2 題 / 共 2 題')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  const secondTimer = countdownHandle();
  fireEvent.click(screen.getByRole('button', { name: '回到設定' }));
  expect(cleared).toHaveBeenCalledWith(secondTimer);
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.queryByRole('status')).toBeNull();
  start(); const lastTimer = countdownHandle(); view.unmount();
  expect(cleared).toHaveBeenCalledWith(lastTimer);
});


