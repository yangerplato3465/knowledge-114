import { useEffect, useRef, useState } from 'react';
import type { Battle } from './battle';
import { artUrl, ENEMY_ART, REGIONS, SCENE_SIZE, attackArt, enemyIntent } from './battle-art';
import { createScene, type Scene } from './battle-scene';

export function Battlefield({ state, onReady }: { state: Battle; onReady: (ready: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null), scene = useRef<Scene | null>(null);
  const field = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null);
  const latest = useRef(state); latest.current = state;
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const variant = state.route[state.stage];
  const region = REGIONS[state.stage];
  const enemy = ENEMY_ART[state.stage][variant === 1 ? 1 : 0];
  const intent = enemyIntent(state), attack = attackArt(state);
  useEffect(() => {
    const resize = () => {
      const area = field.current, content = frame.current;
      if (!area || !content || !area.clientWidth || !area.clientHeight) return;
      const scale = Math.min(area.clientWidth / SCENE_SIZE.width, area.clientHeight / SCENE_SIZE.height);
      content.style.width = `${SCENE_SIZE.width * scale}px`; content.style.height = `${SCENE_SIZE.height * scale}px`;
      const ground = (area.clientHeight - SCENE_SIZE.height * scale) / 2 + SCENE_SIZE.ground * scale;
      area.style.background = `linear-gradient(#${region.sky.toString(16)} ${ground}px, #${region.ground.toString(16)} ${ground}px)`;
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (field.current) observer?.observe(field.current);
    window.addEventListener('resize', resize); resize();
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [region]);
  useEffect(() => {
    const controller = new AbortController();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setStatus('loading'); onReady(false);
    const motion = () => scene.current?.motion(media.matches);
    const visibility = () => scene.current?.update(latest.current);
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    // A slow renderer must not prevent the accessible DOM game from starting.
    const timeout = window.setTimeout(() => { controller.abort(); scene.current?.destroy(); scene.current = null; setStatus('fallback'); onReady(true); }, 12000);
    void createScene(host.current!, latest.current, controller.signal).then(value => {
      if (controller.signal.aborted) { value.destroy(); return; }
      window.clearTimeout(timeout); scene.current = value;
      value.motion(media.matches); value.update(latest.current); setStatus('ready'); onReady(true);
    }).catch(() => {
      if (controller.signal.aborted) return;
      window.clearTimeout(timeout); setStatus('fallback'); onReady(true);
    });
    return () => {
      controller.abort(); window.clearTimeout(timeout);
      media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility);
      scene.current?.destroy(); scene.current = null;
    };
  }, [state.stage, variant, onReady]);
  useEffect(() => { scene.current?.update(state); }, [state]);
  return <div ref={field} className="mr-field" data-stage={state.stage} data-paused={state.paused}>
    <div className="mr-field-caption"><span>{REGIONS[state.stage].name}</span><span>{state.paused ? '冒險暫停中' : REGIONS[state.stage].subtitle}</span></div>
    <div ref={frame} className="mr-scene-frame">
    <div ref={host} className="mr-canvas" aria-hidden="true" />
    {status !== 'ready' && <div className="mr-field-fallback" aria-hidden="true">
      <img src={artUrl('hero/frames/hero-idle-01-v1')} alt="" />
      <img src={artUrl(`enemies/stage-${state.stage + 1}/${enemy.id}/frames/${enemy.id}-idle-01-v1`)} alt="" />
    </div>}
    <div className="mr-actor-hud mr-hero-hud" role="group" aria-label="勇者能力"><span>攻擊 <b>{state.attack}</b></span><span>護甲 <b>{state.guard}</b></span></div>
    <div className="mr-actor-hud mr-enemy-hud" role="group" aria-label="怪物攻擊提示" data-danger={!state.paused && !intent.ended && (intent.counter || intent.seconds <= 3)}>
      <strong>{status === 'loading' ? '準備中' : intent.label}{!intent.ended && status !== 'loading' && <b>{intent.seconds}<small> 秒</small></b>}</strong>
      {!intent.ended && <span>{intent.counter ? '答錯反擊' : attack.label} · 傷害 <b>{intent.damage}</b></span>}
    </div>
    </div>
    <span className="mr-render-status" role="status">{status === 'loading' ? '正在準備冒險場景…' : status === 'fallback' ? '簡易畫面模式 · 可以正常作答' : ''}</span>
  </div>;
}
