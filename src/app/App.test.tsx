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
it('星圖按分類收納活動，星座內立即列出每個有名稱的入口', () => {
  vi.useFakeTimers();
  render(<ThemeProvider><Activities /></ThemeProvider>);
  const main = screen.getByRole('main');
  expect(categories.flatMap(category => category.items).map(item => item.path)).toEqual(['water-acid-base', 'magic-ink', 'math-rpg', 'magic-workshop', 'detective-golden-owl', 'detective-new']);
  expect(within(main).getByRole('heading', { name: '星燈星圖' })).toBeTruthy();
  expect(within(main).queryByText('魔法工坊')).toBeNull();
  for (const category of categories) {
    fireEvent.click(within(within(main).getByRole('group', { name: '活動星座' })).getByRole('button', { name: new RegExp(category.starName) }));
    expect(main.querySelector('.star-sky.is-zooming.star-zoom-' + category.id)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(700); });
    expect(window.location.hash).toBe('#' + category.id);
    const journal = within(main).getByRole('region', { name: '活動目錄' });
    expect(within(journal).queryAllByRole('link')).toHaveLength(0);
    for (const item of category.items) {
      fireEvent.click(within(journal).getByRole('button', { name: '查看' + item.title + '介紹' }));
      expect(within(main).queryByRole('dialog')).toBeNull();
      expect(within(main).getByRole('link', { name: '進入' + item.title }).getAttribute('href')).toBe('/pages/' + item.path + '.html');
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
  fireEvent.click(screen.getByRole('button', { name: '查看魔法工坊介紹' }));
  expect(screen.getByRole('link', { name: '進入魔法工坊' }).getAttribute('href')).toBe('/pages/magic-workshop.html');
  expect(screen.queryByRole('dialog')).toBeNull();
  window.history.replaceState(null, '', '/pages/activities.html#main');
  fireEvent(window, new Event('hashchange'));
  expect(screen.getByRole('heading', { name: '冒險座' })).toBeTruthy();
  window.history.replaceState(null, '', '/pages/activities.html');
  fireEvent.popState(window);
  expect(screen.getByRole('heading', { name: '星燈星圖' })).toBeTruthy();
});
it('點選活動後將原有入口捲入視野並移動鍵盤焦點', () => {
  window.history.replaceState(null, '', '/pages/activities.html#detective');
  let frame!: FrameRequestCallback;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
  const scroll = vi.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  try {
    render(<ThemeProvider><Activities /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: '查看黃金貓頭鷹雕像失竊事件介紹' }));
    act(() => frame(0));
    const entrance = screen.getByRole('link', { name: '進入黃金貓頭鷹雕像失竊事件' });
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
    expect(document.activeElement).toBe(entrance);
    expect(screen.queryByRole('dialog')).toBeNull();
  } finally {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    vi.restoreAllMocks();
  }
});
it('老師工具集中三個受權限保護的入口', () => {
  render(<ThemeProvider><TeacherTools /></ThemeProvider>);
  const links = within(screen.getByRole('main')).getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual(teacherTools.map(item => '/pages/' + item.path + '.html'));
  expect(links).toHaveLength(3);
  for (const item of teacherTools) expect(readFileSync('pages/' + item.path + '.html', 'utf8')).toContain('id="root"');
});
