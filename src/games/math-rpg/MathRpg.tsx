import { useEffect, useRef, useState } from 'react';
import { createGameScene, type GameScene } from './scene';
import './math-rpg.css';

/** React only owns the canvas lifecycle and nonvisual accessibility semantics. */
export function MathRpg() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<GameScene | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus('loading');
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (active) setStatus('error');
    }, 20000);
    void createGameScene(host.current!, controller.signal).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout);
      scene.current = created;
      setStatus('ready');
    }).catch(() => {
      window.clearTimeout(timeout);
      if (active && !controller.signal.aborted) setStatus('error');
    });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
      scene.current?.destroy();
      scene.current = null;
    };
  }, [attempt]);

  return <main className="mr-game" aria-label="數學勇者遊戲框架" data-status={status} aria-busy={status === 'loading'}>
    <div ref={host} className="mr-pixi-host" aria-hidden="true" />
    <div className="mr-accessibility">
      <p role="status" aria-live="polite">{status === 'loading' ? '正在準備遊戲畫布。' : status === 'error' ? '畫布載入失敗。' : '遊戲框架已就緒，尚未加入圖片與玩法。'}</p>
      {status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入畫布</button>}
    </div>
  </main>;
}
