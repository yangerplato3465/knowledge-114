// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { MagicInk } from './MagicInk';
import { CapillaryRace, RainbowBridge, QuizProvider, KnowledgeQuiz, TriviaScore } from './interactions';
import { knowledgeQuestions } from './questions';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
const normalized = (value: string | null) => (value || '').replace(/\s+/g, '');
it('保留全部教材段落、標題、圖片及五題問答', () => {
  const legacy = new DOMParser().parseFromString(readFileSync('pages/magic-ink.html', 'utf8'), 'text/html');
  const { container } = render(<ThemeProvider><MagicInk /></ThemeProvider>);
  for (const selector of ['.section h2', '.block-title', '.cap', '.info-box', '.recipe', '.mini-card']) {
    expect([...container.querySelectorAll(selector)].map(n => normalized(n.textContent))).toEqual([...legacy.querySelectorAll(selector)].map(n => normalized(n.textContent)));
  }
  const photos = [...container.querySelectorAll('.magic-ink-lesson img')];
  expect(photos.map(n => n.getAttribute('src')?.replace(/^\//, '../'))).toEqual([...legacy.querySelectorAll('img')].map(n => n.getAttribute('src')));
  expect(photos.every(n => Number(n.getAttribute('width')) > 0 && Number(n.getAttribute('height')) > 0)).toBe(true);
  [...legacy.querySelectorAll('.quiz')].forEach((quiz, index) => {
    expect(normalized(knowledgeQuestions[index].question)).toBe(normalized(quiz.querySelector('.q-text')!.textContent));
    expect(knowledgeQuestions[index].options.map(o => o.correct)).toEqual([...quiz.querySelectorAll('.q-btn')].map(n => n.getAttribute('data-ok') === '1'));
    expect(normalized(knowledgeQuestions[index].answer)).toBe(normalized(quiz.querySelector('.q-answer')!.textContent));
  });
});
it('四題只計分一次，隨堂考不影響冷知識分數', () => {
  render(<QuizProvider>{knowledgeQuestions.map((_, i) => <KnowledgeQuiz key={i} index={i} />)}<TriviaScore /></QuizProvider>);
  expect(screen.queryByText(/你答對了/)).toBeNull();
  knowledgeQuestions.forEach((q, index) => {
    const chosen = q.options.find(o => o.correct)!;
    const button = screen.getByRole('button', { name: chosen.label });
    fireEvent.click(button); fireEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    if (index === 3) expect(screen.getByText(/你答對了 4 \/ 4 題/)).toBeTruthy();
  });
  expect(screen.getByText(/你答對了 4 \/ 4 題/)).toBeTruthy();
});
it('吸水大賽需先選材質，4800ms 後揭曉且重玩清空', () => {
  vi.useFakeTimers(); render(<StrictMode><CapillaryRace /></StrictMode>);
  const start = screen.getByRole('button', { name: /開始比賽/ });
  expect((start as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /棉繩/ })); fireEvent.click(start);
  act(() => vi.advanceTimersByTime(4799)); expect(screen.getByRole('status').textContent).toBe('');
  act(() => vi.advanceTimersByTime(1)); expect(screen.getByRole('status').textContent).toContain('你猜的是「🧶 棉繩」');
  fireEvent.click(screen.getByRole('button', { name: /再玩一次/ }));
  expect((start as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toBe('');
});
it('彩虹橋兩邊都猜才能開始，分階段流動並正確結算', () => {
  vi.useFakeTimers(); const { container } = render(<RainbowBridge />);
  const start = screen.getByRole('button', { name: /開始過橋/ });
  fireEvent.click(within(screen.getByRole('group', { name: '左邊空罐' })).getByRole('button', { name: /綠色/ }));
  expect((start as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(screen.getByRole('group', { name: '右邊空罐' })).getByRole('button', { name: /橘色/ })); fireEvent.click(start);
  act(() => vi.advanceTimersByTime(2300));
  expect((container.querySelector('#rb-w2') as HTMLElement).style.height).toBe('38%');
  expect(screen.getByRole('status').textContent).toBe('');
  act(() => vi.advanceTimersByTime(2600)); expect(screen.getByRole('status').textContent).toContain('你答對了 2 / 2 題');
  fireEvent.click(screen.getByRole('button', { name: /再玩一次/ }));
  expect((container.querySelector('#rb-w2') as HTMLElement).style.height).toBe('0%');
  expect((start as HTMLButtonElement).disabled).toBe(true);
});
it('離頁取消所有互動計時器', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const set = vi.spyOn(window, 'setTimeout'); const clear = vi.spyOn(window, 'clearTimeout');
  const view = render(<><CapillaryRace /><RainbowBridge /></>);
  fireEvent.click(screen.getByRole('button', { name: /紙巾/ })); fireEvent.click(screen.getByRole('button', { name: /開始比賽/ }));
  fireEvent.click(within(screen.getByRole('group', { name: '左邊空罐' })).getByRole('button', { name: /綠色/ }));
  fireEvent.click(within(screen.getByRole('group', { name: '右邊空罐' })).getByRole('button', { name: /橘色/ })); fireEvent.click(screen.getByRole('button', { name: /開始過橋/ }));
  const handles = set.mock.results.map(r => r.value);
  view.unmount(); handles.forEach(handle => expect(clear).toHaveBeenCalledWith(handle));
});
