// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { PageLayout } from './PageLayout';
import { TeacherHeader } from './TeacherHeader';
import { ThemeProvider } from '../features/theme/ThemeProvider';

afterEach(cleanup);

test('直接開啟教材仍有固定的活動上層，網站名稱另連首頁', () => {
  render(<ThemeProvider><PageLayout activityTitle="數學勇者"><h1>數學勇者</h1></PageLayout></ThemeProvider>);
  const trail = screen.getByRole('navigation', { name: '目前位置' });
  expect(within(trail).getByRole('link', { name: '回學習活動' }).getAttribute('href')).toBe('/pages/activities.html');
  expect(within(trail).getByText('數學勇者').getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: /大耳狗教學網/ }).getAttribute('href')).toBe('/index.html');
});

test.each(['upload', 'class-rpg', 'detective-admin'] as const)('老師工具 %s 可切換同層工具、回總覽及學生首頁', current => {
  render(<ThemeProvider><TeacherHeader current={current} /></ThemeProvider>);
  expect(screen.getByRole('link', { name: /回老師工具總覽/ }).getAttribute('href')).toBe('/pages/teacher-tools.html');
  expect(screen.getByRole('link', { name: /學生首頁/ }).getAttribute('href')).toBe('/index.html');
  const links = within(screen.getByRole('navigation', { name: '老師工具切換' })).getAllByRole('link');
  expect(links.filter(link => link.getAttribute('aria-current') === 'page').map(link => link.getAttribute('href'))).toEqual([`/pages/${current}.html`]);
  expect(links).toHaveLength(3);
  expect(screen.queryByRole('navigation', { name: '主要導覽' })).toBeNull();
});
