// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DetectiveCase } from './DetectiveCase';

afterEach(() => { cleanup(); document.querySelectorAll('script[data-test-loader]').forEach(node => node.remove()); vi.restoreAllMocks(); });

test('案件資料完成前不啟動 gate，引擎仍由 gate 驗證後載入', () => {
  render(<DetectiveCase gameId="owl" caseFile="golden-owl" placeholder="OWL-XXXX-XX" />);
  expect(window.DETECTIVE_GAME_ID).toBe('owl');
  const data = document.querySelector('script[src*="cases/golden-owl.js"]') as HTMLScriptElement;
  expect(data.src).toContain('/assets/js/detective/cases/golden-owl.js');
  expect(document.querySelector('script[src*="gate.js"]')).toBeNull();
  data.dispatchEvent(new Event('load'));
  const gate = document.querySelector('script[src*="gate.js"]') as HTMLScriptElement;
  expect(gate.src).toContain('/assets/js/detective/gate.js');
  expect(document.querySelector('script[src*="engine.js"]')).toBeNull();
  expect(screen.getByLabelText('遊戲驗證碼')).toBeTruthy();
});
