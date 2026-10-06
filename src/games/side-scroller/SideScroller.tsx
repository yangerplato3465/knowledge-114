import { useEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import { createSideScroller, type SceneStatus, type SideScrollerScene } from './scene';
import { isLightOn, LEVELS, LEVEL_ZERO, levelSeconds, type ColorButton } from './model';
import './side-scroller.css';
import { Tutorial } from './Tutorial';

export function SideScroller() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), shell = useRef<HTMLElement>(null);
  const scene = useRef<SideScrollerScene | null>(null);
  const [level, setLevel] = useState(LEVEL_ZERO);
  const [manual, setManual] = useState(true), [started, setStarted] = useState(false);
  const manualRef = useRef(true); manualRef.current = manual;
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0), [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState<SceneStatus>({ mode: 'preview', paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoad('loading');
    setStatus({ mode: 'preview', paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null });
    const timeout = window.setTimeout(() => { controller.abort(); if (active) setLoad('error'); }, 20000);
    void createSideScroller(host.current!, controller.signal, next => { if (active && !controller.signal.aborted) setStatus(next); }, level).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout); scene.current = created; created.setTutorial(manualRef.current); setLoad('ready');
    }).catch(() => { window.clearTimeout(timeout); if (active) setLoad('error'); });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); scene.current?.destroy(); scene.current = null; };
  }, [attempt, level]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  useEffect(() => {
    scene.current?.setTutorial(manual);
    if (!manual) stage.current?.focus({ preventScroll: true });
  }, [manual]);
  const closeManual = () => { setManual(false); stage.current?.focus({ preventScroll: true }); };
  const start = () => { setManual(false); setStarted(true); scene.current?.setTutorial(false); scene.current?.setMode('play'); stage.current?.focus({ preventScroll: true }); };
  const preview = status.mode === 'preview';
  const crossroads = level.id === 'crossroads';
  const colorMessage = (status.color === 'purple' ? '紅＋藍開啟 · 紫色地板實體' : status.color === 'red' ? '紅燈開啟 · 紅色地板實體' : status.color === 'blue' ? '藍燈開啟 · 藍色地板實體' : '兩燈關閉 · 特殊地板皆透明')
    + (crossroads ? status.color ? '、同色直立方塊消散' : '、直立方塊皆會阻擋' : '');
  const colorDisabled = load !== 'ready' || manual || (!preview && (status.paused || status.completed));
  const changeColor = (button: ColorButton) => { scene.current?.toggleColor(button); stage.current?.focus({ preventScroll: true }); };
  const message = status.completed ? '已找到傳送出口，可以重新冒險。' : status.paused ? '已暫停。' : preview ? '正在自動巡覽地圖。' : `固定向前跑，空白鍵或跳躍按鈕起跳。位於落腳區 ${status.checkpoint + 1}。`;
  return <><SiteHeader navigation current="activities" /><ActivityTrail title="魔法禁書庫" category="games" status="色彩冒險" />
    <main className="ss-game" ref={shell}>
      <div className="ss-toolbar"><div className="ss-heading"><h1>魔法禁書庫</h1></div><div>
        <button type="button" aria-pressed={preview} disabled={load !== 'ready'} onClick={() => scene.current?.setMode('preview')}>世界巡覽</button>
        <button type="button" aria-pressed={!preview} disabled={load !== 'ready'} onClick={start}>開始冒險</button>
        <button type="button" disabled={load !== 'ready' || status.completed} onClick={() => scene.current?.togglePause()}>{status.paused ? '繼續' : '暫停'}</button>
        <button type="button" disabled={load !== 'ready'} onClick={() => { scene.current?.restart(); stage.current?.focus(); }}>從頭開始</button>
        <button type="button" disabled={load !== 'ready'} onClick={() => setManual(true)}>玩法手冊</button>
        {document.fullscreenEnabled && <button type="button" onClick={() => {
          void (fullscreen ? document.exitFullscreen() : shell.current?.requestFullscreen())?.catch(() => {});
        }}>{fullscreen ? '離開全螢幕' : '全螢幕'}</button>}
        {fullscreen && <a href={`${import.meta.env.BASE_URL}pages/activities.html#games`}>回冒險座</a>}
      </div></div>
      <div className="ss-levels" role="group" aria-label="關卡難度">
        {LEVELS.map(option => <button type="button" key={option.id} aria-pressed={level.id === option.id}
          aria-label={`${option.difficulty} 星關卡：${option.name}，約 ${Math.round(levelSeconds(option))} 秒`}
          onClick={() => { if (option.id === level.id) return; setLoad('loading'); setStarted(false); setManual(option.id === 'crossroads'); setLevel(option); }}>
          <span className="ss-difficulty" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/images/side-scroller/difficulty-star-v1.webp`} alt="" /><strong>{option.difficulty}</strong></span>
          <span>{option.name}<small>約 {Math.round(levelSeconds(option))} 秒</small></span>
        </button>)}
      </div>
      <div className="ss-stage" ref={stage} tabIndex={0} role="region" aria-label="橫向遊戲世界" aria-describedby="ss-instructions">
        <div className="ss-host" ref={host} aria-hidden="true" />
        {load !== 'ready' && <div className="ss-loading" role="status"><p>{load === 'loading' ? '正在打開魔法禁書庫…' : '場景載入失敗，請重新載入。'}</p>
          {load === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入</button>}</div>}
        {(status.paused || status.completed) && <div className="ss-message"><strong>{status.completed ? '找到傳送出口了！' : '已暫停'}</strong><span>{status.completed ? '選擇「從頭開始」再跑一次' : '選擇「繼續」或按 P'}</span></div>}
        <div className="ss-controls" role="group" aria-label="遊戲操作">
          <button type="button" data-control="jump" aria-label="跳躍" aria-keyshortcuts="Space ArrowUp W" disabled={load !== 'ready' || manual || preview || status.paused || status.completed}
            className="ss-control ss-jump"
            onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); scene.current?.hold('jump', true, `pointer-${event.pointerId}`); }}
            onPointerUp={event => scene.current?.hold('jump', false, `pointer-${event.pointerId}`)}
            onPointerCancel={event => scene.current?.hold('jump', false, `pointer-${event.pointerId}`)}
            onLostPointerCapture={event => scene.current?.hold('jump', false, `pointer-${event.pointerId}`)}
            onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); scene.current?.hold('jump', true, 'button-jump'); } }}
            onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); scene.current?.hold('jump', false, 'button-jump'); } }}
            onBlur={() => scene.current?.hold('jump', false, 'button-jump')}
            onClick={event => { if (event.detail === 0) scene.current?.tap('jump'); }}
          ><span className="ss-control-copy">跳躍</span></button>
            {(['red', 'blue'] as const).map(button => <button key={button} type="button" className={`ss-control ss-color ss-${button}`} aria-label={button === 'red' ? '紅燈' : '藍燈'} aria-keyshortcuts={button === 'red' ? '1' : '2'} aria-pressed={isLightOn(status.color, button)} disabled={colorDisabled}
              data-control={button}
              onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); scene.current?.pressControl(button, true, `pointer-${event.pointerId}`); changeColor(button); }}
              onPointerUp={event => scene.current?.pressControl(button, false, `pointer-${event.pointerId}`)}
              onPointerCancel={event => scene.current?.pressControl(button, false, `pointer-${event.pointerId}`)}
              onLostPointerCapture={event => scene.current?.pressControl(button, false, `pointer-${event.pointerId}`)}
              onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { if (event.repeat) event.preventDefault(); else scene.current?.pressControl(button, true, `button-${button}`); } }}
              onKeyUp={() => scene.current?.pressControl(button, false, `button-${button}`)}
              onBlur={() => scene.current?.pressControl(button, false, `button-${button}`)}
              onClick={event => { if (event.detail === 0) changeColor(button); }}><span className="ss-control-copy">{button === 'red' ? '紅燈' : '藍燈'}</span></button>)}
        </div>
      </div>
      {manual && load === 'ready' && <Tutorial initial={!started} crossroads={crossroads} onClose={closeManual} onStart={start} />}
      <p className="ss-sr-status" id="ss-instructions">米洛固定向右跑。空白鍵、向上鍵或 W 跳躍；1 切換紅燈，2 切換藍燈，兩燈同亮變紫色。只有對應顏色地板可踩，正常地板永遠可踩。{crossroads && '直立方塊遇到相同光色才消散，否則撞上掉落。下路平台較寬；提早起跳可選上路連跳換色。'}P 暫停。可開啟玩法手冊翻閱示範。</p>
      <p className="ss-sr-status" role="status" aria-live="polite">難度 {level.difficulty} 星。{message}{colorMessage}。{status.falls > 0 ? `已回到落腳區 ${status.falls} 次。` : ''}</p>
    </main></>;
}
