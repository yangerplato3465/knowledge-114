// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MiloCompanion } from './MiloCompanion';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('米洛持續切換散步與魔法，也能點擊切換動作', () => {
  vi.useFakeTimers();
  render(<MiloCompanion />);
  expect(screen.getByText('今天想往哪裡走？')).toBeTruthy();
  act(() => vi.advanceTimersByTime(4200));
  expect(document.querySelector('.milo-stage')?.getAttribute('data-action')).toBe('walk');
  fireEvent.click(screen.getByRole('button', { name: /和米洛說話/ }));
  expect(document.querySelector('.milo-stage')?.getAttribute('data-action')).toBe('water');
  expect(screen.getByText('小水滴，來幫花喝水吧。')).toBeTruthy();
});

it('減少動態偏好下不自動播放，仍可手動切換對話', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<MiloCompanion />);
  expect(document.querySelector('.milo-stage')?.getAttribute('data-action')).toBe('hello');
  fireEvent.click(screen.getByRole('button', { name: /和米洛說話/ }));
  expect(document.querySelector('.milo-stage')?.getAttribute('data-action')).toBe('walk');
});
