// @vitest-environment jsdom
import { StrictMode } from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DetectiveCase } from './DetectiveCase';


afterEach(() => { cleanup(); delete window.DETECTIVE_FLUSH; document.querySelectorAll('script[data-test-loader]').forEach(node => node.remove()); vi.restoreAllMocks(); });

test('返回按鈕防止重複存檔，取消離場後恢復可操作', async () => {
  let finish!: (saved: boolean) => void;
  window.DETECTIVE_FLUSH = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<ThemeProvider><DetectiveCase gameId="owl" caseFile="golden-owl" placeholder="OWL" /></ThemeProvider>);
  const link = screen.getByRole('link', { name: '← 回學習活動' });
  fireEvent.click(link);
  fireEvent.click(link);
  expect(window.DETECTIVE_FLUSH).toHaveBeenCalledOnce();
  expect(link.getAttribute('aria-busy')).toBe('true');
  await act(async () => { finish(false); });
  expect(link.getAttribute('aria-busy')).toBe('false');
  expect(link.textContent).toContain('回學習活動');
});

test('案件資料完成前不啟動 gate，引擎仍由 gate 驗證後載入', () => {
  render(<StrictMode><ThemeProvider><DetectiveCase gameId="owl" caseFile="golden-owl" placeholder="OWL-XXXX-XX" /></ThemeProvider></StrictMode>);
  expect(window.DETECTIVE_GAME_ID).toBe('owl');
  const data = document.querySelector('script[src*="cases/golden-owl.js"]') as HTMLScriptElement;
  expect(data.src).toContain('/assets/js/detective/cases/golden-owl.js');
  expect(document.querySelector('script[src*="gate.js"]')).toBeNull();
  data.dispatchEvent(new Event('load'));
  const gate = document.querySelector('script[src*="gate.js"]') as HTMLScriptElement;
  expect(gate.src).toContain('/assets/js/detective/gate.js');
  expect(document.querySelector('script[src*="engine.js"]')).toBeNull();
  expect(screen.getByLabelText('遊戲驗證碼')).toBeTruthy();
  for (const link of document.querySelectorAll('.back-link, .gate-back')) {
    expect(link.getAttribute('href')).toBe('/pages/activities.html');
    expect(link.textContent).toContain('回學習活動');
  }
});

test('卸載後資料才載完，不得啟動 gate 或留下 script', () => {
  const view = render(<StrictMode><ThemeProvider><DetectiveCase gameId="owl" caseFile="golden-owl" placeholder="OWL" /></ThemeProvider></StrictMode>);
  const data = document.querySelector('script[src*="cases/golden-owl.js"]')!;
  view.unmount();
  data.dispatchEvent(new Event('load'));
  expect(document.querySelector('script[src*="detective/"]')).toBeNull();
});

test('切換案件後忽略過期載入與錯誤，只啟動目前案件', () => {
  const view = render(<StrictMode><ThemeProvider><DetectiveCase gameId="owl" caseFile="golden-owl" placeholder="OWL" /></ThemeProvider></StrictMode>);
  const old = document.querySelector('script[src*="cases/golden-owl.js"]')!;
  view.rerender(<StrictMode><ThemeProvider><DetectiveCase gameId="ai-museum" caseFile="ai-museum" placeholder="AI" /></ThemeProvider></StrictMode>);
  old.dispatchEvent(new Event('load'));
  old.dispatchEvent(new Event('error'));
  expect(document.querySelector('script[src*="gate.js"]')).toBeNull();
  expect(screen.queryByText(/案件載入失敗/)).toBeNull();
  const data = document.querySelector('script[src*="cases/ai-museum.js"]')!;
  data.dispatchEvent(new Event('load'));
  expect(document.querySelectorAll('script[src*="gate.js"]')).toHaveLength(1);
  expect(window.DETECTIVE_GAME_ID).toBe('ai-museum');
});
