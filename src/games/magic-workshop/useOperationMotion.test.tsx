// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { gameReducer, initialGame } from './session';
import { useOperationMotion } from './useOperationMotion';

afterEach(() => { vi.unstubAllGlobals(); });

it('減少動態偏好不啟動瓶身或液面動畫', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const board = document.createElement('div');
  board.innerHTML = '<div class="mw-bottles"><div class="mw-bottle-vessel"><span class="mw-bottle-liquid"></span></div></div>';
  const animate = vi.fn();
  Object.defineProperty(board.querySelector('.mw-bottle-liquid'), 'animate', { value: animate });
  const game = gameReducer(gameReducer(initialGame, { type: 'practice' }), { type: 'operate', action: { kind: 'fill', from: 0 } });
  const { unmount } = renderHook(() => useOperationMotion({ current: board }, game));
  expect(animate).not.toHaveBeenCalled();
  expect(game.amounts).toEqual([2, 0]);
  unmount();
});

it('液面使用真實前後液量；選取不重播，復原與離頁取消動畫', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const board = document.createElement('div');
  board.innerHTML = '<div class="mw-bottles"><div class="mw-bottle-vessel"><span class="mw-bottle-liquid"></span></div></div>';
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  Object.defineProperty(board.querySelector('.mw-bottle-liquid'), 'animate', { value: animate });
  const ref = { current: board };
  const practice = gameReducer(initialGame, { type: 'practice' });
  const filled = gameReducer(practice, { type: 'operate', action: { kind: 'fill', from: 0 } });
  const { rerender, unmount } = renderHook(({ game }) => useOperationMotion(ref, game), { initialProps: { game: practice } });
  rerender({ game: filled });
  expect(animate.mock.calls[0]).toEqual([[{ height: '0%', offset: 0 }, { height: '0%', offset: .15 }, { height: '100%', offset: .85 }, { height: '100%', offset: 1 }], { duration: 600, easing: 'linear' }]);
  rerender({ game: { ...filled, selected: 0 } });
  expect(animate).toHaveBeenCalledTimes(1);
  rerender({ game: gameReducer(filled, { type: 'undo' }) });
  expect(cancel).toHaveBeenCalledTimes(1);
  rerender({ game: filled });
  unmount();
  expect(cancel).toHaveBeenCalledTimes(2);
});
