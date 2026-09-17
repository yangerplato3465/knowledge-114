// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ClassRpgAdmin } from './ClassRpgAdmin';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('先建立完整表單與狀態區，再掛載資料 adapter', () => {
  render(<ClassRpgAdmin />);
  expect(screen.getByLabelText('電子郵件')).toBeTruthy();
  expect(screen.getByLabelText('每人經驗值')).toBeTruthy();
  expect((screen.getByRole('button', { name: '發送獎勵' }) as HTMLButtonElement).disabled).toBe(true);
  const module = document.querySelector('script[src*="class-rpg.js"]') as HTMLScriptElement;
  expect(module.type).toBe('module');
  expect(module.src).toContain('/assets/js/class-rpg.js');
});
