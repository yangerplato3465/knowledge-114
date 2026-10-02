import { useEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import { gameReducer, initialGame, type GameEvent } from './session';
import { freshSeed } from './fresh-seed';
import { useWorkshopAudio } from './useWorkshopAudio';
import { createPlayScene, type PlayScene } from './play-scene';
import { isSession, sceneAnnouncement, targetAction, type SceneControl, type SceneModel, type WorkshopSoundBank } from './scene-model';
import type { Difficulty } from './puzzles';
import './magic-workshop.css';

export function MagicWorkshop({ sounds = {} }: { sounds?: WorkshopSoundBank }) {
  const [model, setModel] = useState<SceneModel>({ game: initialGame, difficulty: 3, seed: '', codeOpen: false });
  const latest = useRef(model); latest.current = model;
  const soundBank = useRef(sounds); soundBank.current = sounds;
  const [controls, setControls] = useState<SceneControl[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef=useRef(fullscreen);fullscreenRef.current=fullscreen;
  const host = useRef<HTMLDivElement>(null), shell = useRef<HTMLElement>(null);
  const accessibility = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const scene = useRef<PlayScene | null>(null);
  const fullAction = useRef<() => void>(() => {});
  const mounted = useRef(true);
  const fullGeneration = useRef(0);
  const respond = useWorkshopAudio();
  const respondRef = useRef(respond); respondRef.current = respond;
  const change = (next: SceneModel) => {
    const prior = latest.current;
    if (accessibility.current?.contains(document.activeElement) && (prior.codeOpen !== next.codeOpen || prior.game.screen !== next.game.screen || prior.game.index !== next.game.index)) {
      pendingFocus.current = next.codeOpen ? 'key:1' : next.game.screen === 'ready' ? 'deliver' : next.game.screen === 'playing' ? 'bottle:0' : 'start';
    }
    latest.current = next; setModel(next);
  };
  const send = (event: GameEvent) => {
    const current = latest.current;
    respondRef.current(current.game, event);
    change({ ...current, game: gameReducer(current.game, event), codeOpen: false });
  };
  const activate = useRef<(id: string) => void>(() => {});
  activate.current = id => {
    if (id === 'fullscreen') { fullAction.current(); return; }
    const current = latest.current, game = current.game;
    if (id.startsWith('difficulty:')) { change({ ...current, difficulty: Number(id.split(':')[1]) as Difficulty }); return; }
    if (id === 'code') { change({ ...current, codeOpen: !current.codeOpen }); return; }
    if (id.startsWith('key:')) {
      const key = id.slice(4);
      const seed = key === '清除' ? '' : key === '⌫' ? current.seed.slice(0, -1) : (current.seed + key).slice(0, 10);
      change({ ...current, seed }); return;
    }
    if (id === 'start' || id === 'code-start' || id === 'replay') {
      if (id === 'code-start' && (!current.seed || Number(current.seed) > 4294967295)) return;
      const difficulty = id === 'replay' ? game.difficulty : current.difficulty;
      send({ type: 'start', difficulty, seed: id === 'replay' ? game.seed : id === 'code-start' ? Number(current.seed) : freshSeed(difficulty) }); return;
    }
    if (id.startsWith('drop:')) {
      const [, from, ...target] = id.split(':'); const action = targetAction(Number(from), target.join(':'));
      if (action) send({ type: 'operate', action }); return;
    }
    if (id.startsWith('bottle:')) {
      const index = Number(id.split(':')[1]);
      if (game.selected === null || game.selected === index) send({ type: 'select', index: game.selected === index ? null : index });
      else send({ type: 'operate', action: { kind: 'pour', from: game.selected, to: index } });
      return;
    }
    if ((id === 'spring' || id === 'recycler') && game.selected !== null) {
      send({ type: 'operate', action: targetAction(game.selected, id)! }); return;
    }
    if (id === 'practice' || id === 'home' || id === 'deliver' || id === 'undo' || id === 'restart' || id === 'hint') send({ type: id });
  };
  useEffect(() => {
    const controller = new AbortController();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    setStatus('loading');
    const stopSounds = () => Object.values(soundBank.current).forEach(sound => sound?.stop());
    const motion = () => scene.current?.motion(media.matches);
    const hidden = () => { if (document.hidden) stopSounds(); };
    const timeout = window.setTimeout(() => { controller.abort(); scene.current?.destroy(); scene.current = null; if (active) setStatus('error'); }, 20000);
    void createPlayScene(host.current!, latest.current, controller.signal, {
      activate: id => activate.current(id),
      controls: next => { if (active && !controller.signal.aborted) setControls(next); },
      sound: cue => { try { soundBank.current[cue]?.play(); } catch { /* Optional Howler cues never block play. */ } },
    }).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout); scene.current = created;
      created.update({...latest.current,fullscreen:fullscreenRef.current}); created.motion(media.matches); setStatus('ready');
    }).catch(() => { window.clearTimeout(timeout); if (active && !controller.signal.aborted) setStatus('error'); });
    media.addEventListener('change', motion); document.addEventListener('visibilitychange', hidden);
    return () => {
      active = false; controller.abort(); window.clearTimeout(timeout); stopSounds();
      media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', hidden);
      scene.current?.destroy(); scene.current = null;
    };
  }, [attempt]);
  useEffect(() => { scene.current?.update({ ...model, fullscreen }); }, [model, fullscreen]);
  useEffect(() => {
    if (!pendingFocus.current || !controls.some(c => c.id === pendingFocus.current && !c.disabled)) return;
    accessibility.current?.querySelector<HTMLButtonElement>(`[data-control="${pendingFocus.current}"]`)?.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, [controls]);
  useEffect(() => {
    mounted.current = true;
    const sync = () => { fullGeneration.current++; setFullscreen(document.fullscreenElement === shell.current); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.fullscreenElement) { fullGeneration.current++; setFullscreen(false); } };
    document.addEventListener('fullscreenchange', sync);
    window.addEventListener('keydown', escape);
    return () => { mounted.current = false; fullGeneration.current++; document.removeEventListener('fullscreenchange', sync); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const previous=document.body.style.overflow; document.body.style.overflow='hidden';
    return () => { document.body.style.overflow=previous; };
  }, [fullscreen]);
  const full = async () => {
    const generation=++fullGeneration.current;
    if (fullscreen || document.fullscreenElement === shell.current) {
      setFullscreen(false);
      if(document.fullscreenElement===shell.current) await document.exitFullscreen?.().catch(()=>{
        if(mounted.current && generation===fullGeneration.current)setFullscreen(document.fullscreenElement===shell.current);
      });
      return;
    }
    // The CSS game mode also covers browsers without element fullscreen (including mobile Safari).
    setFullscreen(true);
    try { await shell.current?.requestFullscreen?.(); }
    catch { if(mounted.current && generation===fullGeneration.current)setFullscreen(true); }
  };
  fullAction.current = () => { void full(); };
  return <><SiteHeader navigation current="activities" /><ActivityTrail title="魔法工坊" category="games" /><section className={`mw-game${fullscreen ? ' mw-immersive' : ''}`} ref={shell} aria-label="魔法工坊">
    <main className="mw-stage" aria-label="魔法師的工作台">
      <div ref={host} className="mw-pixi-host" />
      {status !== 'ready' && <div className="mw-loading" role="status"><img className="mw-loading-art" alt="" src={`${import.meta.env.BASE_URL}assets/images/magic-workshop/display/ui-crystal-lit.webp`} /><p>{status === 'loading' ? '正在點亮工坊…' : '工坊暫時無法點亮，請重新開啟。'}</p>{status === 'error' && <button onClick={() => setAttempt(n => n + 1)}>重新開啟工坊</button>}</div>}
      {status === 'ready' && <div ref={accessibility} className="mw-accessibility" aria-label="場景操作" onKeyDown={event => {
        if (event.key === 'Escape') { scene.current?.cancel(); if (latest.current.codeOpen) activate.current('code'); else if (isSession(latest.current.game)) send({ type: 'select', index: null }); }
        if (model.codeOpen && /^\d$/.test(event.key)) { event.preventDefault(); activate.current(`key:${event.key}`); }
        if (model.codeOpen && event.key === 'Backspace') { event.preventDefault(); activate.current('key:⌫'); }
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }
      }}>
        {controls.map(control => <button key={control.id} data-control={control.id} disabled={control.disabled} aria-label={control.label} aria-pressed={/^(bottle|difficulty):/.test(control.id) ? control.selected : undefined}
          onFocus={() => scene.current?.focus(control.id)} onBlur={() => scene.current?.focus(null)} onClick={() => scene.current?.activate(control.id)}>{control.label}</button>)}
      </div>}
      <p className="mw-sr-only" role="status" aria-live="polite" aria-atomic="true">{sceneAnnouncement(model.game)}</p>
    </main>
  </section></>;
}
