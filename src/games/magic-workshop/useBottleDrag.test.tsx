// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { useBottleDrag } from './useBottleDrag';
import { gameReducer, initialGame } from './session';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('同一畫面幀合併多次移動，取消後不留下延遲拖曳預覽', () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => callbacks.delete(key));
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const game = gameReducer(initialGame, { type: 'practice' });
  const { result, unmount } = renderHook(() => useBottleDrag(game, vi.fn()));
  const element = document.createElement('button');
  const event = (x: number) => ({ currentTarget: element, pointerId: 1, button: 0, clientX: x, clientY: 20, preventDefault() {} }) as PointerEvent<HTMLButtonElement>;
  act(() => {
    result.current.handlers(0).onPointerDown(event(0));
    result.current.handlers(0).onPointerMove(event(20));
    result.current.handlers(0).onPointerMove(event(40));
  });
  expect(callbacks.size).toBe(1);
  act(() => { const callback = [...callbacks.values()][0]; callbacks.clear(); callback(16); });
  expect(result.current.drag?.x).toBe(40);
  act(() => {
    result.current.handlers(0).onPointerMove(event(60));
    result.current.handlers(0).onPointerCancel(event(60));
  });
  expect(callbacks.size).toBe(0);
  expect(result.current.drag).toBeNull();
  act(() => {
    result.current.handlers(0).onPointerDown(event(0));
    result.current.handlers(0).onPointerMove(event(30));
  });
  unmount();
  expect(callbacks.size).toBe(0);
});
