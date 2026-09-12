// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider, ThemeSelect } from './ThemeProvider';
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });
it('儲存被封鎖仍可切換並回到系統主題', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const view = render(<ThemeProvider><ThemeSelect /></ThemeProvider>);
  fireEvent.change(view.getByRole('combobox'), { target: { value: 'dark' } });
  expect(document.documentElement.dataset.theme).toBe('dark');
  fireEvent.change(view.getByRole('combobox'), { target: { value: 'system' } });
  expect(document.documentElement.dataset.theme).toBeUndefined();
});
it('接收其他分頁主題與 clear 事件', () => {
  render(<ThemeProvider><ThemeSelect /></ThemeProvider>);
  localStorage.setItem('knowledge114-theme', 'light');
  fireEvent(window, new StorageEvent('storage', { key: 'knowledge114-theme' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  localStorage.clear();
  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(document.documentElement.dataset.theme).toBeUndefined();
});
