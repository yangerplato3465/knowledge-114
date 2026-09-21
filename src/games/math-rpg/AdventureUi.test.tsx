// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { REWARD_SECTORS, rewardIndex, rewardRotation, VictoryReward } from './AdventureUi';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
test('sector sizes match probability and every winning center lands under the pointer', () => {
  REWARD_SECTORS.forEach((sector, index) => {
    expect(sector.end - sector.start).toBeCloseTo(sector.weight * 3.6);
    expect((rewardRotation(index) + sector.center) % 360).toBeCloseTo(0);
    expect(sector.start).toBeCloseTo(index ? REWARD_SECTORS[index - 1].end : 0);
  });
  expect(REWARD_SECTORS.at(-1)!.end).toBeCloseTo(360);
});
test('reward interval boundaries match the agreed probabilities', () => {
  expect([0, 44.999, 45, 79.999, 80, 96.999, 97, 98.999, 99, 99.999].map(rewardIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});
test('reward can only be drawn once and clears its completion timer on departure', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const random = vi.spyOn(crypto, 'getRandomValues');
  const view = render(<VictoryReward />);
  fireEvent.click(screen.getByRole('button', { name: '轉動獎勵轉盤' }));
  fireEvent.click(screen.getByRole('button', { name: '正在轉動…' }));
  expect(random).toHaveBeenCalledTimes(2);
  act(() => vi.advanceTimersByTime(2400));
  expect(screen.getByRole('status').textContent).toContain('由老師確認');
  expect(screen.getByText(/本局稱號/)).toBeTruthy();
  view.unmount(); expect(vi.getTimerCount()).toBe(0);
});
