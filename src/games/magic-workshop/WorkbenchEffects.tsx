import { useEffect, useRef } from 'react';
import { createEffectsScene, type EffectsLayout, type EffectsScene, type Spot } from './workbench-effects';
import type { GameState } from './session';

export function WorkbenchEffects({ game, drag }: { game: GameState; drag?: { x: number; y: number } | null }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<EffectsScene | null>(null);
  const latest = useRef(game); latest.current = game;
  const measure = (): EffectsLayout => {
    const element = host.current!;
    const board = element.parentElement!;
    const bounds = element.getBoundingClientRect();
    const scaleX = 960 / (bounds.width || 960), scaleY = 360 / (bounds.height || 360);
    const locate = (target: Element | null): Spot => {
      const rect = target?.getBoundingClientRect();
      return rect ? { x: (rect.left + rect.width / 2 - bounds.left) * scaleX,
        y: (rect.top + rect.height / 2 - bounds.top) * scaleY } : { x: 480, y: 171 };
    };
    return { bottles: [...board.querySelectorAll('.mw-bottles .mw-bottle-mouth')].map(locate),
      spring: locate(board.querySelector('.mw-spring .mw-station-art')),
      recycler: locate(board.querySelector('.mw-recycler .mw-station-art')) };
  };
  useEffect(() => {
    const controller = new AbortController();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => scene.current?.motion(media.matches);
    const resize = () => scene.current?.update(latest.current, measure());
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (host.current?.parentElement) observer?.observe(host.current.parentElement);
    media.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('resize', resize);
    void createEffectsScene(host.current!, latest.current, controller.signal, measure).then(created => {
      if (controller.signal.aborted) { created.destroy(); return; }
      scene.current = created;
      created.motion(media.matches);
      created.update(latest.current, measure());
    }).catch(() => { /* DOM controls and liquid levels still show the complete game. */ });
    return () => {
      controller.abort();
      media.removeEventListener('change', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('resize', resize);
      observer?.disconnect();
      scene.current?.destroy(); scene.current = null;
    };
  }, []);
  useEffect(() => { scene.current?.update(game, measure()); }, [game]);
  useEffect(() => {
    const bounds = host.current?.getBoundingClientRect();
    scene.current?.drag(drag && bounds ? { x: (drag.x - bounds.left) * 960 / bounds.width,
      y: (drag.y - bounds.top) * 360 / bounds.height } : null);
  }, [drag]);
  return <div ref={host} className="mw-effects" aria-hidden="true" />;
}
