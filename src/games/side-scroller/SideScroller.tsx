import { useEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import { createSideScroller, type SceneStatus, type SideScrollerScene } from './scene';
import type { WorldColor } from './model';
import './side-scroller.css';

export function SideScroller() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), shell = useRef<HTMLElement>(null);
  const scene = useRef<SideScrollerScene | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0), [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState<SceneStatus>({ mode: 'preview', paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoad('loading');
    const timeout = window.setTimeout(() => { controller.abort(); if (active) setLoad('error'); }, 20000);
    void createSideScroller(host.current!, controller.signal, next => { if (active && !controller.signal.aborted) setStatus(next); }).then(created => {
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
  const preview = status.mode === 'preview';
  const colorMessage = status.color === 'red' ? '紅色實體 · 藍色透明' : status.color === 'blue' ? '藍色實體 · 紅色透明' : '紅藍透明 · 按 1／2 切色';
  const colorDisabled = load !== 'ready' || (!preview && (status.paused || status.completed));
  const changeColor = (color: WorldColor) => { scene.current?.setColor(color); stage.current?.focus({ preventScroll: true }); };
  const message = status.completed ? '試跑完成，可以從頭再跑。' : status.paused ? '已暫停。' : preview ? '正在自動巡覽地圖。' : `固定向前跑，空白鍵或跳躍按鈕起跳。位於落腳區 ${status.checkpoint + 1}。`;
  return <><SiteHeader navigation current="activities" /><ActivityTrail title="橫向遊戲框架" category="games" status="世界原型" />
    <main className="ss-game" ref={shell}>
      <div className="ss-toolbar"><div className="ss-heading"><h1>橫向遊戲框架</h1><span>晴空小徑 · 世界原型</span></div><div>
        <button type="button" aria-pressed={preview} disabled={load !== 'ready'} onClick={() => scene.current?.setMode('preview')}>世界巡覽</button>
        <button type="button" aria-pressed={!preview} disabled={load !== 'ready'} onClick={() => { scene.current?.setMode('play'); stage.current?.focus(); }}>試跑</button>
        <button type="button" disabled={load !== 'ready' || status.completed} onClick={() => scene.current?.togglePause()}>{status.paused ? '繼續' : '暫停'}</button>
        <button type="button" disabled={load !== 'ready'} onClick={() => { scene.current?.restart(); stage.current?.focus(); }}>從頭開始</button>
        {document.fullscreenEnabled && <button type="button" onClick={() => {
          void (fullscreen ? document.exitFullscreen() : shell.current?.requestFullscreen())?.catch(() => {});
        }}>{fullscreen ? '離開全螢幕' : '全螢幕'}</button>}
        {fullscreen && <a href={`${import.meta.env.BASE_URL}pages/activities.html#games`}>回冒險座</a>}
      </div></div>
      <div className="ss-stage" ref={stage} tabIndex={0} role="region" aria-label="橫向遊戲世界" aria-describedby="ss-help">
        <div className="ss-host" ref={host} aria-hidden="true" />
        {load !== 'ready' && <div className="ss-loading" role="status"><p>{load === 'loading' ? '正在準備晴空小徑…' : '場景載入失敗，請重新載入。'}</p>
          {load === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入</button>}</div>}
        <div className="ss-caption" aria-hidden="true"><span>{preview ? '世界巡覽' : '一段跳試跑'}</span><small>{preview ? '固定向前 · 自動循環' : '固定向前 · 空白鍵跳躍'}</small><small>{colorMessage}</small></div>
        {(status.paused || status.completed) && <div className="ss-message"><strong>{status.completed ? '已跑完小徑' : '已暫停'}</strong><span>{status.completed ? '選擇「從頭開始」再跑一次' : '選擇「繼續」或按 P'}</span></div>}
        <div className="ss-controls" role="group" aria-label="遊戲操作">
          <div className="ss-colors" role="group" aria-label="世界顏色">
            <button type="button" className="ss-control ss-color ss-red" aria-label="紅色世界" aria-keyshortcuts="1" aria-pressed={status.color === 'red'} disabled={colorDisabled} onClick={() => changeColor('red')}><span aria-hidden="true">▲</span><span>紅色 <small>1</small></span></button>
            <button type="button" className="ss-control ss-color ss-blue" aria-label="藍色世界" aria-keyshortcuts="2" aria-pressed={status.color === 'blue'} disabled={colorDisabled} onClick={() => changeColor('blue')}><span aria-hidden="true">●</span><span>藍色 <small>2</small></span></button>
          </div>
          {!preview && <button type="button" aria-label="跳躍" disabled={load !== 'ready' || status.paused || status.completed}
          className="ss-control ss-jump"
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); scene.current?.hold('jump', true, `pointer-${event.pointerId}`); }}
          onPointerUp={event => scene.current?.hold('jump', false, `pointer-${event.pointerId}`)}
          onPointerCancel={event => scene.current?.hold('jump', false, `pointer-${event.pointerId}`)}
          onLostPointerCapture={event => scene.current?.hold('jump', false, `pointer-${event.pointerId}`)}
          onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); scene.current?.hold('jump', true, 'button-jump'); } }}
          onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); scene.current?.hold('jump', false, 'button-jump'); } }}
          onBlur={() => scene.current?.hold('jump', false, 'button-jump')}
          onClick={event => { if (event.detail === 0) scene.current?.tap('jump'); }}
        >跳躍 ↑</button>}
        </div>
      </div>
      <p className="ss-help" id="ss-help">{preview ? '世界會自動向前捲動，可切色查看地形；選擇「試跑」即可開始。' : '自動往右跑，空白鍵、↑ 或 W 一段跳；按住不會連跳。先起跳，再切換下一座平台的顏色。跌落會回到最近落腳區。'} 1／紅色 ▲、2／藍色 ●：選中的顏色可踩，另一色透明不可踩，正常地板始終可踩。P 暫停／繼續。</p>
      <p className="ss-sr-status" role="status" aria-live="polite">{message}{colorMessage}。{status.falls > 0 ? `已回到落腳區 ${status.falls} 次。` : ''}</p>
    </main></>;
}
