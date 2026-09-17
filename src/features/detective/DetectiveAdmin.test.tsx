// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DetectiveAdmin } from './DetectiveAdmin';
import { ThemeProvider } from '../theme/ThemeProvider';

afterEach(cleanup);
test('後台建立完整表單並保留七天有效期，模組載入後清除等待訊息', () => {
  render(<ThemeProvider><DetectiveAdmin /></ThemeProvider>);
  expect(screen.getByLabelText('電子郵件')).toBeTruthy();
  expect(screen.getByLabelText('密碼')).toBeTruthy();
  expect((screen.getByLabelText('有效時間') as HTMLSelectElement).value).toBe('168');
  const script = document.querySelector('script[src$="detective/admin.js"]')!;
  expect(script.getAttribute('type')).toBe('module');
  expect(screen.getByText('正在連接驗證碼管理…')).toBeTruthy();
  fireEvent.load(script);
  expect(screen.queryByText('正在連接驗證碼管理…')).toBeNull();
});
