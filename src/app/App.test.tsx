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
it('活動均有正式 React 入口且清單不含已移除遊戲', () => {
  const activities = categories.flatMap(c => c.groups ? c.groups.flatMap(g => g.items) : c.items!);
  expect(activities.map(a => a.path)).toEqual(['water-acid-base', 'magic-ink', 'math-rpg', 'detective-golden-owl', 'detective-ai-museum', 'downloads', 'upload', 'class-rpg']);
  for (const activity of activities) expect(readFileSync('pages/' + activity.path + '.html', 'utf8')).toContain('id="root"');
});
it('分類互斥展開，收合內容不出現在可操作的連結清單', async () => {
  setup();
  expect(screen.queryByRole('link', { name: /數學勇者 RPG/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /教學內容/ }));
  fireEvent.click(screen.getByRole('button', { name: '互動學習小遊戲' }));
  expect(screen.getByRole('link', { name: /數學勇者 RPG/ }).getAttribute('href')).toBe('/pages/math-rpg.html');
  expect(screen.queryByRole('link', { name: /字尾大分流|極速博物館|快問快答/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /偵探事件簿/ }));
  expect(screen.queryByRole('link', { name: /數學勇者 RPG/ })).toBeNull();
  expect(screen.getByRole('link', { name: /黃金貓頭鷹雕像/ })).toBeTruthy();
  expect(await screen.findByText('v2.13.0 · 2026-09-11')).toBeTruthy();
});

it('素材導覽使用獨立 React 入口', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: /素材 遊戲素材的下載與上傳/ }));
  expect(screen.getByRole('link', { name: /素材下載 下載遊戲素材/ }).getAttribute('href')).toBe('/pages/downloads.html');
  expect(screen.getByRole('link', { name: /上傳素材 老師專用/ }).getAttribute('href')).toBe('/pages/upload.html');
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
