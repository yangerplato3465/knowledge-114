// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { Activities } from './Activities';
import { TeacherTools } from './TeacherTools';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import { categories } from '../content/navigation';
import { teacherTools } from '../content/teacherTools';
import { version } from '../../config.json';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });
it('首頁提供兩個學生入口，老師工具只在頁尾，沒有活動或管理清單', () => {
  render(<ThemeProvider><App /></ThemeProvider>);
  const main = screen.getByRole('main');
  expect(within(main).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/pages/downloads.html', '/pages/activities.html']);
  for (const title of ['素材下載', '學習活動']) {
    const entrance = within(main).getByRole('link', { name: title });
    expect(entrance.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(document.getElementById(entrance.getAttribute('aria-describedby')!)?.textContent).toBeTruthy();
    expect(entrance.querySelector('button,a')).toBeNull();
  }
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
it('星圖按分類收納活動，每列整合插畫與簡介並直接連到活動', () => {
  vi.useFakeTimers();
  render(<ThemeProvider><Activities /></ThemeProvider>);
  const main = screen.getByRole('main');
  expect(categories.flatMap(category => category.items).map(item => item.path)).toEqual(['water-acid-base', 'magic-ink', 'math-rpg', 'magic-workshop', 'side-scroller', 'detective-golden-owl', 'detective-new']);
  expect(within(main).getByRole('heading', { name: '星燈星圖' })).toBeTruthy();
  expect(within(main).queryByText('魔法工坊')).toBeNull();
  for (const category of categories) {
    fireEvent.click(within(within(main).getByRole('group', { name: '活動星座' })).getByRole('button', { name: new RegExp(category.starName) }));
    expect(main.querySelector('.star-sky.is-zooming.star-zoom-' + category.id)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(700); });
    expect(window.location.hash).toBe('#' + category.id);
    const journal = within(main).getByRole('region', { name: '活動目錄' });
    expect(within(journal).getAllByRole('link')).toHaveLength(category.items.length);
    expect(within(journal).queryByRole('button')).toBeNull();
    for (const item of category.items) {
      const entrance = within(journal).getByRole('link', { name: item.title });
      expect(entrance.getAttribute('href')).toBe('/pages/' + item.path + '.html');
      expect(within(entrance).getByText(item.description).id).toBe(entrance.getAttribute('aria-describedby'));
      expect(entrance.querySelector('img')?.getAttribute('alt')).toBe('');
      expect(within(main).getAllByText(item.title)).toHaveLength(1);
      expect(readFileSync('pages/' + item.path + '.html', 'utf8')).toContain('id="root"');
    }
    fireEvent.click(within(main).getByRole('button', { name: /返回星圖/ }));
    expect(window.location.hash).toBe('');
  }
  expect(within(main).queryByText('上傳素材')).toBeNull();
});
it('活動星座可由網址直接進入，也能由瀏覽器返回星圖', () => {
  window.history.replaceState(null, '', '/pages/activities.html#games');
  render(<ThemeProvider><Activities /></ThemeProvider>);
  expect(screen.getByRole('heading', { name: '冒險座' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '魔法工坊' }).getAttribute('href')).toBe('/pages/magic-workshop.html');
  expect(screen.queryByRole('dialog')).toBeNull();
  window.history.replaceState(null, '', '/pages/activities.html#main');
  fireEvent(window, new Event('hashchange'));
  expect(screen.getByRole('heading', { name: '冒險座' })).toBeTruthy();
  window.history.replaceState(null, '', '/pages/activities.html');
  fireEvent.popState(window);
  expect(screen.getByRole('heading', { name: '星燈星圖' })).toBeTruthy();
});
it('減少動態時立即開啟活動目錄，往返星座後聚焦對應標題', () => {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)', media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  render(<ThemeProvider><Activities /></ThemeProvider>);
  const stars = screen.getByRole('group', { name: '活動星座' });
  fireEvent.click(within(stars).getByRole('button', { name: /線索座/ }));
  expect(window.location.hash).toBe('#detective');
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: '線索座' }));
  expect(screen.getByRole('link', { name: '黃金貓頭鷹雕像失竊事件' }).getAttribute('href')).toBe('/pages/detective-golden-owl.html');
  fireEvent.click(screen.getByRole('button', { name: /返回星圖/ }));
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: '星燈星圖' }));
});
it('老師工具集中三個受權限保護的入口', () => {
  render(<ThemeProvider><TeacherTools /></ThemeProvider>);
  const links = within(screen.getByRole('main')).getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual(teacherTools.map(item => '/pages/' + item.path + '.html'));
  expect(links).toHaveLength(3);
  for (const item of teacherTools) {
    const entrance = within(screen.getByRole('main')).getByRole('link', { name: item.title });
    expect(within(entrance).getByText(item.description).id).toBe(entrance.getAttribute('aria-describedby'));
    expect(entrance.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(entrance.querySelector('button,a')).toBeNull();
    expect(readFileSync('pages/' + item.path + '.html', 'utf8')).toContain('id="root"');
  }
});
