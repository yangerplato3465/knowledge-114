import { useEffect, useRef, useState } from 'react';
import { createGameScene, type GameScene, type SceneControl } from './scene';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import './math-rpg.css';

/** Shared site chrome surrounds the game; all visible game controls belong to Pixi. */
export function MathRpg() {
  const shell = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<GameScene | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [controls, setControls] = useState<SceneControl[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const keyboardFocus = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(false), mounted = useRef(true), fullGeneration = useRef(0);
  const desiredFullscreen = useRef(false);
  const fullAction = useRef<() => void>(() => {});
  fullAction.current = () => {
    const generation = ++fullGeneration.current;
    const next = !fullscreenRef.current;
    desiredFullscreen.current = next; fullscreenRef.current = next; setFullscreen(next);
    const request = next ? shell.current?.requestFullscreen?.() : document.fullscreenElement === shell.current ? document.exitFullscreen?.() : undefined;
    void request?.catch(() => {
      if (mounted.current && generation === fullGeneration.current) {
        // Keep the same in-canvas exit on browsers without native fullscreen.
        const value = next || document.fullscreenElement === shell.current;
        desiredFullscreen.current = value; fullscreenRef.current = value; setFullscreen(value);
      }
    });
  };
  useEffect(() => {
    mounted.current = true;
    const sync = () => {
      if (document.fullscreenElement === shell.current && !desiredFullscreen.current) {
        // A native entry may finish after the player already pressed exit.
        void document.exitFullscreen?.().catch(() => {}); return;
      }
      ++fullGeneration.current;
      desiredFullscreen.current = fullscreenRef.current = document.fullscreenElement === shell.current;
      setFullscreen(fullscreenRef.current);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => { mounted.current = false; ++fullGeneration.current; document.removeEventListener('fullscreenchange', sync); };
  }, []);
  useEffect(() => {
    scene.current?.fullscreen?.(fullscreen);
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [fullscreen]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus('loading');
    setControls([]);
    setAnnouncement('');
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (active) setStatus('error');
    }, 20000);
    void createGameScene(host.current!, controller.signal, undefined, {
      controls(next) { if (active && !controller.signal.aborted) setControls(next); },
      announce(message) { if (active && !controller.signal.aborted) setAnnouncement(message); },
      requestFullscreen() { if (active && !controller.signal.aborted) fullAction.current(); },
    }).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout);
      scene.current = created;
      created.fullscreen?.(fullscreenRef.current);
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

  useEffect(() => {
    if (keyboardFocus.current && status === 'ready') {
      host.current?.parentElement?.querySelector<HTMLButtonElement>('.mr-accessibility button:not(:disabled)')?.focus();
    }
  }, [controls.map(control => control.id).join('|'), status]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenRef.current) { event.preventDefault(); fullAction.current(); return; }
      if (event.key === 'Escape' && status === 'ready' && shell.current?.contains(event.target as Node)) { event.preventDefault(); scene.current?.activate('back'); }
      if (event.key === 'Tab' && shell.current?.contains(event.target as Node)) keyboardFocus.current = true;
    };
    const pointer = () => { keyboardFocus.current = false; scene.current?.focus(null); };
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', pointer);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', pointer); };
  }, [status]);

  return <><SiteHeader navigation current="activities" /><ActivityTrail title="數學勇者" category="games" />
  <section ref={shell} className={`mr-game${fullscreen ? ' mr-immersive' : ''}`} aria-label="數學勇者">
  <main className="mr-stage" data-status={status} aria-busy={status === 'loading'}>
    <div ref={host} className="mr-pixi-host" aria-hidden="true" />
    <div className="mr-accessibility">
      <h1>數學勇者</h1>
      <p>算出答案，迎戰傳說。限時解題，答對出劍並壓回敵人蓄力；答錯或敵人蓄力滿時受到攻擊。</p>
      <p role="status" aria-live="polite">{status === 'loading' ? '正在準備遊戲畫布。' : status === 'error' ? '畫布載入失敗。' : announcement || '封面已就緒。'}</p>
      {status === 'ready' && controls.map(control => <button key={control.id} type="button" disabled={control.disabled}
        aria-pressed={control.selected} onFocus={() => { keyboardFocus.current = true; scene.current?.focus(control.id); }} onBlur={() => scene.current?.focus(null)}
        onClick={() => scene.current?.activate(control.id)}>{control.label}</button>)}
      {status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入畫布</button>}
    </div>
  </main></section></>;
}
