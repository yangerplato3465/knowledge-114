import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import { createSideScroller, type SceneStatus, type SideScrollerScene } from './scene';
import { GEM_COLORS, GEM_NAMES, isLightOn, LEVELS, LEVEL_ZERO, type ColorButton } from './model';
import './side-scroller.css';
import { Tutorial } from './Tutorial';

export function SideScroller() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), shell = useRef<HTMLElement>(null);
  const startAfterManual = useRef(false), centerAfterManual = useRef(false);
  const scene = useRef<SideScrollerScene | null>(null);
  const [level, setLevel] = useState(LEVEL_ZERO);
  const [manual, setManual] = useState(true), [started, setStarted] = useState(false);
  const manualRef = useRef(true); manualRef.current = manual;
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0), [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState<SceneStatus>({ mode: 'preview', paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null, collectedGems: [] });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoad('loading');
    setStatus({ mode: 'preview', paused: false, completed: false, checkpoint: 0, falls: 0, lap: 1, color: null, collectedGems: [] });
    const timeout = window.setTimeout(() => { controller.abort(); if (active) setLoad('error'); }, 20000);
    void createSideScroller(host.current!, controller.signal, next => { if (active && !controller.signal.aborted) setStatus(next); }, level).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout); scene.current = created; created.setTutorial(manualRef.current); setLoad('ready');
      if (!manualRef.current) stage.current?.focus({ preventScroll: true });
    }).catch(() => { window.clearTimeout(timeout); if (active) setLoad('error'); });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); scene.current?.destroy(); scene.current = null; };
  }, [attempt, level]);
  useEffect(() => {
    const changed = () => { setFullscreen(document.fullscreenElement === shell.current); if (!manualRef.current) stage.current?.focus({ preventScroll: true }); };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const focusGame = () => stage.current?.focus({ preventScroll: true });
  const centerGame = () => {
    if (!document.fullscreenElement && stage.current) {
      // Leave enough scroll room below the last page element to center the complete game frame.
      shell.current?.style.setProperty('--ss-scroll-room', `${Math.max(0, (window.innerHeight - stage.current.getBoundingClientRect().height) / 2)}px`);
      stage.current.scrollIntoView?.({ behavior: 'instant', block: 'center', inline: 'nearest' });
    }
    focusGame();
  };
  useLayoutEffect(() => {
    if (!manual) {
      if (centerAfterManual.current) centerGame(); else focusGame();
      if (startAfterManual.current) scene.current?.setMode('play');
      startAfterManual.current = centerAfterManual.current = false;
    }
    scene.current?.setTutorial(manual);
  }, [manual]);
  const closeManual = () => { centerAfterManual.current = true; setManual(false); };
  const start = () => {
    setStarted(true);
    if (manual) { startAfterManual.current = centerAfterManual.current = true; setManual(false); return; }
    centerGame(); scene.current?.setTutorial(false);
    if (status.mode === 'preview' || status.completed) scene.current?.setMode('play');
  };
  const preview = status.mode === 'preview';
  const crossroads = Boolean(level.obstacles?.length);
  const colorMessage = (status.color === 'purple' ? '紅＋藍開啟 · 紫色地板實體' : status.color === 'red' ? '紅燈開啟 · 紅色地板實體' : status.color === 'blue' ? '藍燈開啟 · 藍色地板實體' : '兩燈關閉 · 特殊地板皆透明')
    + (crossroads ? status.color ? '、同色直立方塊淡化' : '、直立方塊皆會阻擋' : '');
  const colorDisabled = load !== 'ready' || manual || (!preview && (status.paused || status.completed));
  const changeColor = (button: ColorButton) => { scene.current?.toggleColor(button); stage.current?.focus({ preventScroll: true }); };
  const message = status.completed ? '已找到傳送出口，可以重新冒險。' : status.paused ? `已暫停。${preview ? `巡覽第 ${status.lap} 輪。` : ''}` : preview ? `正在自動巡覽地圖，第 ${status.lap} 輪。` : `固定向前跑，空白鍵或跳躍按鈕起跳。位於落腳區 ${status.checkpoint + 1}。`;
  return <><SiteHeader navigation current="activities" /><ActivityTrail title="魔法禁書庫" category="games" status="色彩冒險" />
    <main className="ss-game" ref={shell}>
      <div className="ss-stage" ref={stage} tabIndex={0} role="region" aria-label="橫向遊戲世界" aria-describedby="ss-instructions">
        <div className="ss-host" ref={host} aria-hidden="true" />
      <div className="ss-menu" onPointerDown={event => { if (event.button === 0) { event.preventDefault(); focusGame(); } }}>
      <div className="ss-toolbar"><h1 data-frame-title>魔法禁書庫</h1><div className="ss-actions" role="group" aria-label="場景功能">
        <button data-frame-control tabIndex={-1} type="button" aria-pressed={preview} disabled={load !== 'ready'} onClick={() => { centerGame(); if (!preview) scene.current?.setMode('preview'); }}><span className="ss-menu-label">世界巡覽</span></button>
        <button data-frame-control tabIndex={-1} type="button" disabled={load !== 'ready'} onClick={() => setManual(true)}><span className="ss-menu-label">玩法手冊</span></button>
        {document.fullscreenEnabled && <button data-frame-control tabIndex={-1} type="button" onClick={() => {
          void (fullscreen ? document.exitFullscreen() : shell.current?.requestFullscreen())?.catch(() => {});
          focusGame();
        }}><span className="ss-menu-label">{fullscreen ? '離開全螢幕' : '全螢幕'}</span></button>}
      </div></div>
      <div className="ss-levels" role="group" aria-label="關卡難度">
        {LEVELS.map(option => <button data-frame-control tabIndex={-1} type="button" key={option.id} aria-pressed={level.id === option.id}
          aria-label={`${option.difficulty} 星關卡：${option.name}`}
          onClick={() => { centerGame(); if (option.id === level.id) return; setLoad('loading'); setStarted(false); setManual(false); setLevel(option); }}>
          <span className="ss-difficulty" aria-hidden="true"><span className="ss-star-space" /><strong>{option.difficulty}</strong></span>
          <span className="ss-menu-label">{option.name}</span>
        </button>)}
      </div>
      </div>
        {load !== 'ready' && <div className="ss-loading" role="status"><p>{load === 'loading' ? '正在打開魔法禁書庫…' : '場景載入失敗，請重新載入。'}</p>
          {load === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入</button>}</div>}
        <div className="ss-playfield">
        <div className="ss-gems" role="group" aria-label="寶石收藏">
          {GEM_COLORS.map(color => <span key={color} data-gem={color} role="img" aria-label={`${GEM_NAMES[color]}寶石：${status.collectedGems.includes(color) ? '已收集' : '未收集'}`} />)}
        </div>
        <button data-frame-control data-frame-primary tabIndex={-1} type="button" className="ss-preview-start"
          hidden={!preview || manual || load !== 'ready'} onPointerDown={event => { if (event.button === 0) event.preventDefault(); }} onClick={start}>
          <span className="ss-menu-label">開始冒險</span>
        </button>
        {status.completed && <div className="ss-message"><strong>找到傳送出口了！</strong><span>選擇下一個關卡，或回到世界巡覽</span></div>}
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
      </div>
      {manual && load === 'ready' && <Tutorial initial={!started} onClose={closeManual} onStart={start} />}
      <p className="ss-sr-status" id="ss-instructions">米洛固定向右跑。空白鍵、向上鍵或 W 跳躍；1 切換紅燈，2 切換藍燈，兩燈同亮變紫色。只有對應顏色地板可踩，正常地板永遠可踩。{crossroads && '直立方塊未點燈時一直存在，遇到相同光色才淡化；關燈或換成其他光色會恢復，撞上就會掉落。下路平台較寬；提早起跳可選上路連跳換色。'}可開啟玩法手冊翻閱示範。</p>
      <p className="ss-sr-status" role="status" aria-live="polite">難度 {level.difficulty} 星。{message}{colorMessage}。{status.collectedGems.length > 0 ? `寶石 ${status.collectedGems.length} / 4。` : ''}{status.falls > 0 ? `已回到落腳區 ${status.falls} 次。` : ''}</p>
    </main></>;
}
