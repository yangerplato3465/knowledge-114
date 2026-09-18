// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MathRpg } from './MathRpg';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { version } from '../../../config.json';

afterEach(cleanup);

test('舊網址顯示維護狀態並可返回活動，不再啟動舊遊戲', () => {
  render(<ThemeProvider><MathRpg /></ThemeProvider>);
  const main = within(screen.getByRole('main'));
  expect(main.getByRole('heading', { name: '維護中' })).toBeTruthy();
  expect(main.getByRole('link', { name: '探索其他學習活動' }).getAttribute('href')).toBe('/pages/activities.html');
  expect(main.queryByRole('button')).toBeNull();
  expect(main.queryByRole('combobox')).toBeNull();
  expect(document.querySelector('canvas, img, script[src*="pixi"]')).toBeNull();
  expect(screen.getByLabelText('網站版本').textContent).toBe('v' + version);
});
