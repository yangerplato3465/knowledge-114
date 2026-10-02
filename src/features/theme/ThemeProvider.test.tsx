// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider, ThemeSelect } from './ThemeProvider';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });
it('單擊切換明暗，儲存被封鎖仍可切換', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const view = render(<ThemeProvider><ThemeSelect /></ThemeProvider>);
  const toggle = view.getByRole('switch', { name: '深色模式' });
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  fireEvent.click(toggle);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(toggle);
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(view.queryByRole('button', { name: '跟隨系統主題' })).toBeNull();
});
it('接收其他分頁主題與 clear 事件', () => {
  render(<ThemeProvider><ThemeSelect /></ThemeProvider>);
  localStorage.setItem('knowledge114-theme', 'light');
  fireEvent(window, new StorageEvent('storage', { key: 'knowledge114-theme' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  localStorage.clear();
  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(document.documentElement.dataset.theme).toBe('light');
});
it('初始為淺色，不跟隨系統深色', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const view = render(<ThemeProvider><ThemeSelect /></ThemeProvider>);
  const toggle = view.getByRole('switch', { name: '深色模式' });
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  fireEvent.click(toggle);
  expect(document.documentElement.dataset.theme).toBe('dark');
});
