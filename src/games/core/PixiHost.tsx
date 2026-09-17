import { useEffect, useRef, useState } from 'react';
import type { GameController } from './GameController';

/** createController 必須保持穩定；每次 effect 使用獨立容器，避免非同步 mount 汙染新場景。 */
export function PixiHost({ createController, label, paused = false }: {
  createController: () => GameController;
  label: string;
  paused?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const active = useRef<GameController | null>(null);
  const pausedRef = useRef(paused);
  const [error, setError] = useState(false);
  useEffect(() => {
    pausedRef.current = paused;
    if (active.current) {
      if (paused || document.hidden) active.current.pause();
      else active.current.resume();
    }
  }, [paused]);
  useEffect(() => {
    const container = document.createElement('div');
    host.current!.append(container);
    let controller: GameController | undefined;
    let disposed = false;
    let ready = false;
    let destroyed = false;
    const destroy = () => {
      if (!destroyed && controller) {
        destroyed = true;
        controller.destroy();
      }
    };
    const sync = () => {
      if (!ready || disposed || !controller) return;
      if (document.hidden || pausedRef.current) controller.pause();
      else controller.resume();
    };
    const observer = new ResizeObserver(() => {
      if (ready && !disposed) controller?.resize();
    });
    observer.observe(container);
    document.addEventListener('visibilitychange', sync);
    setError(false);
    void (async () => {
      try {
        controller = createController();
        await controller.mount(container);
        if (disposed) { destroy(); return; }
        ready = true;
        active.current = controller;
        controller.resize();
        sync();
      } catch {
        ready = false;
        if (active.current === controller) active.current = null;
        destroy();
        if (!disposed) setError(true);
      }
    })();
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      if (active.current === controller) active.current = null;
      container.remove();
      // init 尚未完成時，等 promise settle 再清理，避免 destroy 未初始化 renderer。
      if (ready) destroy();
    };
  }, [createController]);
  return <><div ref={host} role="group" aria-label={label} />{error && <p role="alert">遊戲載入失敗，請重新整理後再試。</p>}</>;
}
