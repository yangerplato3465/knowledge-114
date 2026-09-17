import { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeSelect } from '../../features/theme/ThemeProvider';
import { PixiHost } from '../core/PixiHost';
import { WordSortFX } from './WordSortFX';
import { Courier } from './Courier';
import { pools } from './pools';
import { wordOf, type Suffix } from './model';
import { useRound } from './useRound';
import './word-sort.css';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export function WordSort() {
  const game = useRound();
  const fx = useRef<WordSortFX | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; dx: number } | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const createFX = useCallback(() => { const controller = new WordSortFX(); fx.current = controller; return controller; }, []);
  const celebrate = (r: DOMRect, side: Suffix) => {
    fx.current?.burst(r.left + 8, r.top + r.height / 2, side, 55, -Math.PI * .85);
    fx.current?.burst(r.right - 8, r.top + r.height / 2, side, 55, -Math.PI * .15);
  };
  const answer = (side: Suffix) => { if (game.answer(side) && card.current) celebrate(card.current.getBoundingClientRect(), side); };
  useEffect(() => {
    if (game.phase !== 'result' || game.wrong.length) return;
    const timers = [.25, .5, .75].map((x, i) => setTimeout(() => fx.current?.burst(innerWidth * x, innerHeight * .42, 'ful', 90), i * 180));
    return () => timers.forEach(clearTimeout);
  }, [game.phase, game.wrong.length]);
  const quit = () => { fx.current?.clear(); game.quit(); };
  const start = (name: string) => { fx.current?.clear(); game.start(name); };
  const home = <a href={`${import.meta.env.BASE_URL}next/index.html`} className="back-link">回到學習主頁</a>;
  const item = game.item;
  return <main className="app" aria-label="字尾大分流">
    {game.phase === 'start' && <section className="screen screen-start">
      <h1 className="start-title">字尾大分流</h1>
      <div className="start-demo"><span className="d-stem">hope</span><span className="d-op">+</span><span className="d-suf">less</span><span className="d-op">=</span><span className="d-out">hopeless</span></div>
      <p className="start-sub">看懂意思，幫字根接上正確的 <b>-ful</b> 或 <b>-less</b>！<br />分類完成後，再到快遞站把字根和字尾組成完整單字。</p>
      <div className="pool-picker">{Object.entries(pools).map(([name, pool]) => <button key={name} className="pool-btn" onClick={() => start(name)}>
        <span>{name}</span><span className="pool-count">共 {pool.length} 字 · 隨機抽 12 題</span></button>)}</div>
      <div className="start-foot">{home}<button className="ghost-btn" onClick={async () => {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
        catch { setFullscreenError('這個瀏覽器無法切換全螢幕，仍可繼續遊戲。'); }
      }}>全螢幕</button></div><ThemeSelect />{fullscreenError && <p role="status">{fullscreenError}</p>}
    </section>}
    {game.phase === 'play' && item && <section className="screen">
      <header className="topbar"><button className="quit-btn" onClick={quit}>結束</button><div className="spacer" />
        <div className="stat good">答對 {game.right}</div><div className="stat bad">答錯 {game.wrong.length}</div><div className="stat timer">{time(game.seconds)}</div></header>
      <div className="queue-hud"><span className="hud-label">待分類字根</span><div className="queue-chips">{game.queue.slice(game.index, game.index + 10).map((word, i) =>
        <div key={wordOf(word)} className={`chip ${i === 0 ? 'head' : ''} ${i === 0 && game.leaving ? 'leaving' : ''}`}><span>{word.stem}</span></div>)}</div><span className="hud-len">還有 <b>{game.queue.length - game.index}</b> 個</span></div>
      <div className="stage" onClick={game.skip}>
        <div className="array-action" aria-live="polite"><span>{game.reveal ? `字根和字尾合起來，變成 ${wordOf(item)}` : '看意思，選出正確的字尾'}</span>
          <code>{item.stem} + {game.reveal ? `${item.suffix} = ${wordOf(item)}` : '?'}</code></div>
        <div ref={card} className={`card ${game.reveal ? game.answers.at(-1) === item.suffix ? 'correct' : 'wrong' : ''} ${game.leaving ? 'ws-leaving' : ''}`}
          onPointerDown={e => { if (game.reveal) return; drag.current = { id: e.pointerId, x: e.clientX, dx: 0 }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 觸控驅動可能不支援 */ } }}
          onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId) return; d.dx = e.clientX - d.x; e.currentTarget.style.transform = `translateX(${d.dx}px) rotate(${d.dx * .025}deg)`; }}
          onPointerUp={e => { const d = drag.current; if (!d || d.id !== e.pointerId) return; drag.current = null; e.currentTarget.style.transform = ''; if (Math.abs(d.dx) > innerWidth * .12) answer(d.dx < 0 ? 'ful' : 'less'); }}
          onPointerCancel={e => { drag.current = null; e.currentTarget.style.transform = ''; }}>
          <div className="card-stem-zh">{item.stemZh}</div><div className="word-line"><span className="w-stem">{item.stem}</span><span className={`w-slot ${game.reveal ? `filled ${item.suffix}` : ''} ${game.merged ? 'merged' : ''}`}>{game.reveal ? item.suffix : '?'}</span></div>
          <div className="card-def">{item.def}</div>{game.reveal && <div className="card-note" role="status">{game.answers.at(-1) === item.suffix ? '答對了！' : `正解是 -${item.suffix}。`}{item.note}</div>}
        </div>
        {game.reveal && <button className="ws-skip ghost-btn" disabled={game.leaving} onClick={e => { e.stopPropagation(); game.skip(); }}>下一題</button>}
      </div>
      <div className="collected">{(['ful', 'less'] as const).map(side => {
        const words = game.queue.slice(0, game.answers.length).filter(word => word.suffix === side);
        return <div key={side} className={`collected-side ${side}`}><span className="coll-name">-{side} 單字</span><div className="coll-items">{words.length ? words.map(word => <span key={wordOf(word)} className="coll-item"><span className="ci-w">{wordOf(word)}</span></span>) : <span className="coll-empty">[ 還是空的 ]</span>}</div><span className="coll-len">共 <b>{words.length}</b> 個</span></div>;
      })}</div>
      <div className="zones">{(['ful', 'less'] as const).map(side => <button key={side} aria-label={`-${side} ${side === 'ful' ? '充滿⋯⋯的' : '沒有⋯⋯的'}`} className={`zone zone-${side}`} disabled={game.reveal} onClick={() => answer(side)}><span className="zone-suffix">-{side}</span><span className="zone-mean">{side === 'ful' ? '充滿⋯⋯的' : '沒有⋯⋯的'}</span></button>)}</div>
    </section>}
    {game.phase === 'courier' && <section className="screen screen-challenge">
      <header className="challenge-head"><button className="quit-btn" onClick={quit}>結束</button><span>字尾快遞站</span><div className="energy-lights" aria-label={`已完成 ${game.taskAt + Number(game.delivered)} 個，共 3 個任務`}>{[0, 1, 2].map(i => <span key={i} className={i < game.taskAt + Number(game.delivered) ? 'lit' : i === game.taskAt ? 'active' : ''} />)}</div></header>
      <div className="ws-kicker">單字快遞 {game.taskAt + 1} / {game.tasks.length}</div>
      <Courier key={game.taskAt} task={game.tasks[game.taskAt]} complete={game.complete} celebrate={celebrate} />
    </section>}
    {game.phase === 'result' && <section className="screen screen-result">
      <h2 className="result-title">{game.wrong.length ? '分完了！' : '全部答對！'}</h2>
      <p className="result-score">答對 <b>{game.right}</b> / {game.queue.length} 題 · 用時 {time(game.seconds)} · 字尾快遞完成 · {game.poolName}</p>
      <div className="review-box">{game.wrong.map(word => <div key={wordOf(word)} className="review-item"><span className="rv-word">{wordOf(word)}</span><span className="rv-def">{word.def}（你選了 -{game.answers[game.queue.indexOf(word)]}）</span></div>)}</div>
      <div className="result-actions"><button className="pill-btn" onClick={() => start(game.poolName)}>再玩一次</button><button className="ghost-btn" onClick={quit}>換一組題目</button></div>{home}
    </section>}
    {game.phase !== 'start' && <div className="ws-fx" aria-hidden="true"><PixiHost createController={createFX} label="答對彩帶" /></div>}
  </main>;
}
