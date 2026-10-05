import { useEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import { createSideScroller, type SceneStatus, type SideScrollerScene } from './scene';
import './side-scroller.css';

const buttons = [
  { action: 'left', label: '向左移動', text: '←' }, { action: 'right', label: '向右移動', text: '→' },
  { action: 'run', label: '按住跑步', text: '跑步' }, { action: 'jump', label: '跳躍', text: '跳躍 ↑' },
] as const;
export function SideScroller() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), shell = useRef<HTMLElement>(null);
  const scene = useRef<SideScrollerScene | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0), [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState<SceneStatus>({ paused: false, completed: false, stars: 0, checkpoint: 0, falls: 0 });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoad('loading');
    const timeout = window.setTimeout(() => { controller.abort(); if (active) setLoad('error'); }, 20000);
    void createSideScroller(host.current!, controller.signal, next => { if (active) setStatus(next); }).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout); scene.current = created; setLoad('ready');
    }).catch(() => { window.clearTimeout(timeout); if (active) setLoad('error'); });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); scene.current?.destroy(); scene.current = null; };
  }, [attempt]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  return <><SiteHeader navigation current="activities" /><ActivityTrail title="橫向遊戲框架" category="games" status="操作原型" />
    <main className="ss-game" ref={shell}>
      <div className="ss-toolbar"><h1>橫向遊戲框架</h1><div>
        <button type="button" disabled={load !== 'ready' || status.completed} onClick={() => scene.current?.togglePause()}>{status.paused ? '繼續' : '暫停'}</button>
        <button type="button" disabled={load !== 'ready'} onClick={() => { scene.current?.restart(); stage.current?.focus(); }}>重新試走</button>
        {document.fullscreenEnabled && <button type="button" onClick={() => {
          void (fullscreen ? document.exitFullscreen() : shell.current?.requestFullscreen())?.catch(() => {});
        }}>{fullscreen ? '離開全螢幕' : '全螢幕'}</button>}
        {fullscreen && <a href={`${import.meta.env.BASE_URL}pages/activities.html#games`}>回冒險座</a>}
      </div></div>
      <div className="ss-stage" ref={stage} tabIndex={0} role="region" aria-label="米洛橫向平台遊戲" aria-describedby="ss-help">
        <div className="ss-host" ref={host} aria-hidden="true" />
        {load !== 'ready' && <div className="ss-loading" role="status"><p>{load === 'loading' ? '正在準備森林小徑…' : '場景載入失敗，請重新載入。'}</p>
          {load === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入</button>}</div>}
        <div className="ss-controls" role="group" aria-label="遊戲操作">{buttons.map(({ action, label, text }) => <button key={action} type="button" aria-label={label} disabled={load !== 'ready' || status.paused || status.completed}
          className={`ss-control ss-${action}`}
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); scene.current?.hold(action, true, `pointer-${event.pointerId}`); }}
          onPointerUp={event => scene.current?.hold(action, false, `pointer-${event.pointerId}`)}
          onPointerCancel={event => scene.current?.hold(action, false, `pointer-${event.pointerId}`)}
          onLostPointerCapture={event => scene.current?.hold(action, false, `pointer-${event.pointerId}`)}
          onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); scene.current?.hold(action, true, `button-${action}`); } }}
          onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); scene.current?.hold(action, false, `button-${action}`); } }}
          onBlur={() => scene.current?.hold(action, false, `button-${action}`)}
          onClick={event => { if (event.detail === 0) scene.current?.tap(action); }}
        >{text}</button>)}</div>
      </div>
      <p className="ss-help" id="ss-help">點一下場景開始操作：方向鍵或 A、D 移動，空白鍵跳躍，Shift 跑步，P 暫停。按住跳躍可跳高一點；跌落會回到最近路標。</p>
      <p className="ss-sr-status" role="status" aria-live="polite">{status.completed ? '已抵達集合點。' : status.paused ? '遊戲已暫停。' : '沿小徑向右走到星燈集合點。'}已收集 {status.stars} 顆星光，位於路標 {status.checkpoint + 1}。{status.falls > 0 ? `已回到路標 ${status.falls} 次。` : ''}</p>
    </main></>;
}
