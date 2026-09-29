import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { applyAction, type Action } from './rules';
import type { GameEvent, GameState } from './session';
import { currentPuzzle } from './session';

type Drag = { width: number; from: number; pointer: number; startX: number; startY: number; x: number; y: number; active: boolean; target: string | null; element: HTMLButtonElement };

/** Pointer capture keeps touch, pen and mouse on the same operation path. */
export function useBottleDrag(game: GameState, dispatch: React.Dispatch<GameEvent>) {
  const board = useRef<HTMLDivElement>(null);
  const current = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const suppressClick = useRef(false);
  const rebound = useRef<Animation | null>(null);
  const frame = useRef<number | null>(null);
  const cancelFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const cancelRebound = () => { rebound.current?.cancel(); rebound.current = null; };
  const actionFor = (from: number, target: string): Action => target === 'spring' ? { kind: 'fill', from }
    : target === 'recycler' ? { kind: 'empty', from } : { kind: 'pour', from, to: Number(target) };
  const valid = (from: number, target: string) => game.screen === 'playing'
    && !!applyAction(currentPuzzle(game).capacities, game.amounts, actionFor(from, target));
  const targetAt = (x: number, y: number, from: number) => {
    for (const element of board.current?.querySelectorAll<HTMLElement>('[data-drop]') ?? []) {
      const rect = element.getBoundingClientRect();
      const target = element.dataset.drop!;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom && valid(from, target)) return target;
    }
    return null;
  };
  const clear = () => {
    cancelFrame();
    const old = current.current;
    current.current = null;
    setDrag(null);
    if (old?.element.hasPointerCapture?.(old.pointer)) old.element.releasePointerCapture(old.pointer);
  };
  useEffect(() => {
    const cancel = () => { clear(); cancelRebound(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    const visibility = () => { if (document.hidden) cancel(); };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => { if (media.matches) cancelRebound(); };
    media.addEventListener('change', motion);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', cancel);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motion);
      const old = current.current;
      cancelRebound();
      cancelFrame();
      current.current = null;
      if (old?.element.hasPointerCapture?.(old.pointer)) old.element.releasePointerCapture(old.pointer);
    };
  }, []);
  useEffect(() => { clear(); cancelRebound(); }, [game.effectVersion]);
  return { board, drag, valid, consumeClick: (detail: number) => {
    if (detail !== 0 && suppressClick.current) { suppressClick.current = false; return true; }
    return false;
  }, handlers: (from: number) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (game.screen !== 'playing' || event.button !== 0 || current.current) return;
      suppressClick.current = false;
      cancelRebound();
      current.current = { width: event.currentTarget.querySelector('.mw-bottle-vessel')?.getBoundingClientRect().width || 112, from, pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
        x: event.clientX, y: event.clientY, active: false, target: null, element: event.currentTarget };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const old = current.current;
      if (!old || old.pointer !== event.pointerId) return;
      const active = old.active || Math.hypot(event.clientX - old.startX, event.clientY - old.startY) >= 8;
      if (!active) return;
      suppressClick.current = true;
      event.preventDefault();
      const next = { ...old, active, x: event.clientX, y: event.clientY, target: targetAt(event.clientX, event.clientY, from) };
      current.current = next;
      // Input remains immediate; paint only the latest position once per frame.
      if (frame.current === null) frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setDrag(current.current);
      });
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      const old = current.current;
      if (!old || old.pointer !== event.pointerId) return;
      const target = old.active ? targetAt(event.clientX, event.clientY, old.from) : null;
      clear();
      if (target !== null) dispatch({ type: 'operate', action: actionFor(old.from, target) });
      else if (old.active && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const dx = Math.max(-28, Math.min(28, event.clientX - old.startX));
        const dy = Math.max(-20, Math.min(20, event.clientY - old.startY));
        rebound.current = old.element.querySelector('.mw-bottle-vessel')?.animate?.([
          { transform: `translate(${dx}px, ${dy}px) rotate(-8deg)` },
          { transform: 'translate(0, 0) rotate(0deg)' },
        ], { duration: 180, easing: 'ease-out' }) ?? null;
      }
    },
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => { if (current.current?.pointer === event.pointerId) clear(); },
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => { if (current.current?.pointer === event.pointerId) clear(); },
  }) };
}
