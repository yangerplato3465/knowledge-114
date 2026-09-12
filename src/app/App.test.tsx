// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import { categories } from '../content/navigation';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup(config: unknown = { version: '2.13.0', lastUpdated: '2026-09-11' }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => config }));
  return render(<ThemeProvider><App /></ThemeProvider>);
}
it('新版全部活動的網址、標題、說明與原首頁一致', () => {
  const legacy = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
  const expected = Array.from(legacy.querySelectorAll('a.page-btn')).map(a => ({
    path: a.getAttribute('href')!.replace('pages/', '').replace('.html', ''),
    title: a.querySelector('.btn-title')!.textContent,
    description: a.querySelector('.btn-desc')!.textContent,
  }));
  expect(categories.flatMap(c => c.groups ? c.groups.flatMap(g => g.items) : c.items!)).toEqual(expected);
});
it('分類互斥展開，收合內容不出現在可操作的連結清單', async () => {
  setup();
  expect(screen.queryByRole('link', { name: /數學勇者 RPG/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /教學內容/ }));
  fireEvent.click(screen.getByRole('button', { name: '互動學習小遊戲' }));
  expect(screen.getByRole('link', { name: /數學勇者 RPG/ }).getAttribute('href')).toBe('/pages/math-rpg.html');
  fireEvent.click(screen.getByRole('button', { name: /偵探事件簿/ }));
  expect(screen.queryByRole('link', { name: /數學勇者 RPG/ })).toBeNull();
  expect(screen.getByRole('link', { name: /黃金貓頭鷹雕像/ })).toBeTruthy();
  expect(await screen.findByText('v2.13.0 · 2026-09-11')).toBeTruthy();
});
it('不合法版號不顯示但首頁仍可使用', async () => {
  setup({ version: '<script>', lastUpdated: 'bad' });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(screen.getByLabelText('網站版本').textContent).toBe('');
  expect(screen.getByRole('navigation', { name: '課程與活動' })).toBeTruthy();
});
it('離線讀取失敗不阻擋導覽', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<ThemeProvider><App /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: /素材 遊戲/ }));
  expect(screen.getByRole('link', { name: /素材下載/ })).toBeTruthy();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
});
