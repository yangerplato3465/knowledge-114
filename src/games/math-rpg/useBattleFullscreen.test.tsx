// @vitest-environment jsdom
import { useRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useBattleFullscreen } from './useBattleFullscreen';

const keys = ['fullscreenElement', 'fullscreenEnabled', 'exitFullscreen'] as const;
const original = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(document, key)]));
let native: Element | null;
beforeEach(() => {
  native = null;
  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, value: true },
    fullscreenElement: { configurable: true, get: () => native },
    exitFullscreen: { configurable: true, value: vi.fn(async () => { native = null; document.dispatchEvent(new Event('fullscreenchange')); }) },
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  for (const key of keys) { if (original[key]) Object.defineProperty(document, key, original[key]!); else Reflect.deleteProperty(document, key); }
});
function Harness({ onExit = () => {} }: { onExit?: () => void }) {
  const root = useRef<HTMLElement>(null), fullscreen = useBattleFullscreen(root, onExit);
  return <section ref={root} data-testid="shell"><button disabled={fullscreen.busy} aria-pressed={fullscreen.active} onClick={() => void fullscreen.toggle()}>{fullscreen.active ? '退出' : '進入'}</button></section>;
}
test('native fullscreen follows browser exit events and does not re-enter after departure', async () => {
  const onExit = vi.fn(), view = render(<Harness onExit={onExit} />), shell = screen.getByTestId('shell');
  shell.requestFullscreen = vi.fn(async () => { native = shell; document.dispatchEvent(new Event('fullscreenchange')); });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '進入' })));
  expect(screen.getByRole('button', { name: '退出' }).getAttribute('aria-pressed')).toBe('true');
  await act(async () => { await document.exitFullscreen(); });
  expect(onExit).toHaveBeenCalledOnce();
  let resolve!: () => void;
  shell.requestFullscreen = vi.fn(() => new Promise<void>(r => { resolve = () => { native = shell; r(); }; }));
  fireEvent.click(screen.getByRole('button', { name: '進入' }));
  view.unmount(); await act(async () => resolve());
  expect(native).toBeNull();
});
test('a rejected request falls back to an isolated viewport and Escape restores the page', async () => {
  const onExit = vi.fn(); render(<Harness onExit={onExit} />);
  screen.getByTestId('shell').requestFullscreen = vi.fn().mockRejectedValue(new Error('Unavailable'));
  const outside = document.createElement('button'); document.body.append(outside);
  try {
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '進入' })));
    expect(document.body.style.overflow).toBe('hidden'); expect(outside.inert).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).not.toBe('hidden'); expect(outside.inert).not.toBe(true);
    expect(onExit).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: '進入' })).toBeTruthy();
  } finally { outside.remove(); }
});
