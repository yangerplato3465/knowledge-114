import { useEffect, useRef, useState } from 'react';
import { createWorkshopScene, type WorkshopScene } from './workshop-scene';
import type { GameState } from './session';
import { artUrl } from './art';

export function WorkshopBackdrop({ game }: { game: GameState }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<WorkshopScene | null>(null);
  const latest = useRef(game); latest.current = game;
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refreshMotion = () => scene.current?.motion(media.matches);
    const visibility = () => scene.current?.motion(media.matches);
    media.addEventListener('change', refreshMotion);
    document.addEventListener('visibilitychange', visibility);
    const timeout = window.setTimeout(() => { controller.abort(); scene.current?.destroy(); scene.current = null; setStatus('fallback'); }, 12000);
    void createWorkshopScene(host.current!, latest.current, controller.signal).then(created => {
      if (controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout);
      scene.current = created;
      created.motion(media.matches);
      created.update(latest.current);
      setStatus('ready');
    }).catch(() => {
      if (controller.signal.aborted) return;
      window.clearTimeout(timeout);
      setStatus('fallback');
    });
    return () => {
      controller.abort(); window.clearTimeout(timeout);
      media.removeEventListener('change', refreshMotion);
      document.removeEventListener('visibilitychange', visibility);
      scene.current?.destroy(); scene.current = null;
    };
  }, []);
  useEffect(() => { scene.current?.update(game); }, [game]);
  return <div className="mw-backdrop" aria-hidden="true" data-scene={status}>
    <img src={artUrl('workshop-panorama-v1.png')} width={2172} height={724} alt="" decoding="async" />
    <div ref={host} className="mw-scene-canvas" />
    <span className="mw-workshop-sign">魔法工坊<span>每一份剛剛好，都是小小的魔法</span></span>
  </div>;
}
