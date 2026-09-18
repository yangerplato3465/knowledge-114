// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { Activities } from './Activities';
import { TeacherTools } from './TeacherTools';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import { categories } from '../content/navigation';
import { teacherTools } from '../content/teacherTools';
import { version } from '../../config.json';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('首頁提供兩個學生入口，老師工具只在頁尾，沒有活動或管理清單', () => {
  render(<ThemeProvider><App /></ThemeProvider>);
  const main = screen.getByRole('main');
  expect(within(main).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/pages/downloads.html', '/pages/activities.html']);
  expect(screen.queryByText('數學勇者')).toBeNull();
  expect(screen.queryByText('上傳素材')).toBeNull();
  expect(screen.queryByText('班級 RPG')).toBeNull();
  expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: '老師工具' }).getAttribute('href')).toBe('/pages/teacher-tools.html');
});
it('版本只顯示版號，首頁不再發送版本或清單請求', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  render(<ThemeProvider><App /></ThemeProvider>);
  expect(screen.getByLabelText('網站版本').textContent).toBe('v' + version);
  expect(fetcher).not.toHaveBeenCalled();
});
it('活動頁完整保留五個學生入口，分類捷徑有對應區塊', () => {
  render(<ThemeProvider><Activities /></ThemeProvider>);
  const main = screen.getByRole('main');
  expect(categories.flatMap(category => category.items).map(item => item.path)).toEqual(['water-acid-base', 'magic-ink', 'math-rpg', 'detective-golden-owl', 'detective-ai-museum']);
  for (const category of categories) for (const item of category.items) {
    expect(within(main).getByRole('link', { name: new RegExp(item.title.replace(/[！]/g, '.')) }).getAttribute('href')).toBe('/pages/' + item.path + '.html');
    expect(readFileSync('pages/' + item.path + '.html', 'utf8')).toContain('id="root"');
  }
  for (const link of within(screen.getByRole('navigation', { name: '活動分類' })).getAllByRole('link')) {
    expect(document.querySelector(link.getAttribute('href')!)).toBeTruthy();
  }
  expect(within(main).queryByText('上傳素材')).toBeNull();
});
it('老師工具集中三個受權限保護的入口', () => {
  render(<ThemeProvider><TeacherTools /></ThemeProvider>);
  const links = within(screen.getByRole('main')).getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual(teacherTools.map(item => '/pages/' + item.path + '.html'));
  expect(links).toHaveLength(3);
  for (const item of teacherTools) expect(readFileSync('pages/' + item.path + '.html', 'utf8')).toContain('id="root"');
});
