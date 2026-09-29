// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DeliveryReceipt } from './DeliveryReceipt';
import { GUESTS } from './art';
import { RECEIPT_MS } from './motion';

vi.mock('./CharacterPortrait', () => ({ CharacterPortrait: () => null }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('交付可立即略過，切換客人取消上一個計時器，離頁無過期回呼', () => {
  vi.useFakeTimers();
  const done = vi.fn(), nextDone = vi.fn();
  const view = render(<DeliveryReceipt receipt={{ ...GUESTS[0], version: 1 }} onDone={done} />);
  fireEvent.click(screen.getByRole('button', { name: '略過收藥演出' }));
  expect(done).toHaveBeenCalledOnce();
  view.rerender(<DeliveryReceipt receipt={{ ...GUESTS[1], version: 2 }} onDone={nextDone} />);
  expect(screen.getByText(GUESTS[1].dialogue.thanks)).toBeTruthy();
  expect(screen.queryByText(GUESTS[0].dialogue.thanks)).toBeNull();
  act(() => { vi.advanceTimersByTime(RECEIPT_MS); });
  expect(done).toHaveBeenCalledOnce();
  expect(nextDone).toHaveBeenCalledOnce();
  view.unmount();
  act(() => { vi.runAllTimers(); });
  expect(nextDone).toHaveBeenCalledOnce();
});
