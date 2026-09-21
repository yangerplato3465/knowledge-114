import { GeometryDiagram } from './GeometryDiagram';
import { GEOMETRY_UNIT } from './geometry-questions';
import type { Question } from './questions';
import { useEffect, useReducer, useRef, useState } from 'react';
import { PageLayout } from '../../components/PageLayout';
import { BALANCE, CARDS, CARD_INFO, battleReducer, createBattle, enemyFor, counterDamage, feedbackDuration } from './battle';
import { createQuestionDeck, CURRICULUM, isUnitReady, battlePaceFor } from './question-deck';
import { Battlefield } from './Battlefield';
import { DECIMAL_UNIT } from './decimal-questions';
import { FRACTION_UNIT } from './fraction-questions';
import { FractionText } from './FractionText';
import { ENEMY_ART } from './battle-art';
import { AdventurePoster, Journey, Spark, VictoryReward } from './AdventureUi';
import { useBattleFullscreen } from './useBattleFullscreen';
import './math-rpg.css';

interface Session { grade: string; unit: string; seed: number }
const duration = (seconds: number) => `${Math.floor(seconds / 60)} 分 ${Math.floor(seconds % 60)} 秒`;
function Hp({ name, hp, max }: { name: string; hp: number; max: number }) {
  return <div className="mr-hp" data-low={hp / max <= .25}><strong>{name}</strong><span>{hp} <small>/ {max} HP</small></span><div className="mr-health-track" aria-hidden="true"><i style={{ transform: `scaleX(${hp / max})` }} /></div><meter className="mr-sr-only" aria-label={`${name} HP`} min={0} max={max} value={hp} /></div>;
}
function Adventure({ session, onLeave, onReplay }: { session: Session; onLeave: () => void; onReplay: () => void }) {

  const [{ deck, first }] = useState(() => {
    const deck = createQuestionDeck(session.grade, session.unit, session.seed ^ 0x12345);
    return { deck, first: deck() };
  });
  const scaleFor = (q: Question) => q.difficulty === 'challenge' ? 1.4 : 1;
  const [state, dispatch] = useReducer(battleReducer, session.seed, seed => ({ ...createBattle(seed, undefined, battlePaceFor(session.grade, session.unit)), questionScale: scaleFor(first) }));
  const [question, setQuestion] = useState(first);
  const [selected, setSelected] = useState<number | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [mistakes, setMistakes] = useState<{ q: string; answer: string; hint: string }[]>([]);
  const panel = useRef<HTMLHeadingElement>(null);
  const shell = useRef<HTMLElement>(null), questionPanel = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const answerLocked = useRef(false);
  const advancedAnswer = useRef(0);
  const enemy = enemyFor(state);
  const enemyArt = ENEMY_ART[state.stage][state.route[state.stage] === 1 ? 1 : 0];
  const fullscreen = useBattleFullscreen(shell, () => { if (!['won', 'lost'].includes(stateRef.current.phase)) dispatch({ type: 'pause' }); });
  useEffect(() => { document.querySelector('.mr-adventure')?.scrollIntoView?.({ block: 'start' }); }, []);
  useEffect(() => {
    if (state.paused || document.visibilityState !== 'visible' || state.phase !== 'feedback'
      || state.feedbackSeconds + 1e-9 < feedbackDuration(state) || advancedAnswer.current === state.answered) return;
    advancedAnswer.current = state.answered;
    const next = state.enemyHp > 0 ? deck() : null;
    if (next) { setQuestion(next); setSelected(null); }
    dispatch({ type: 'continue', questionScale: next ? scaleFor(next) : undefined });
  }, [state.paused, state.phase, state.feedbackSeconds, state.lastCorrect, state.answered, state.enemyHp, deck]);
  useEffect(() => {
    if (!sceneReady || state.paused || state.phase === 'won' || state.phase === 'lost') return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === 'visible') {
        const elapsed = (now - last) / 1000;
        if (elapsed > 2) dispatch({ type: 'pause' });
        else dispatch({ type: 'tick', seconds: elapsed });
      }
      last = now;
    }, 100);
    return () => window.clearInterval(timer);
  }, [state.phase, state.paused, sceneReady]);
  useEffect(() => {
    const leave = () => { if (!['won', 'lost'].includes(stateRef.current.phase)) dispatch({ type: 'pause' }); };
    const hide = () => { if (document.visibilityState !== 'visible') leave(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', leave);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); };
  }, []);
  useEffect(() => { questionPanel.current?.scrollTo?.({ top: 0 }); panel.current?.focus({ preventScroll: true }); }, [state.phase, state.paused, question]);
  useEffect(() => { if (state.phase === 'battle') answerLocked.current = false; }, [state.phase]);
  const answer = (index: number) => {
    if (!sceneReady || stateRef.current.phase !== 'battle' || stateRef.current.paused || answerLocked.current || index < 0 || index >= question.a.length) return;
    answerLocked.current = true; setSelected(index);
    const correct = index === question.correct;
    if (!correct) setMistakes(items => items.some(item => item.q === question.q) ? items : [...items, { q: question.q, answer: question.a[question.correct], hint: question.hint }]);
    dispatch({ type: 'answer', correct });
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.visibilityState !== 'visible') return;
      if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (/^[1-4]$/.test(event.key) && Number(event.key) <= question.a.length && state.phase === 'battle' && !state.paused) { event.preventDefault(); answer(Number(event.key) - 1); }
      if (event.key === 'Escape' && !state.paused && !['won', 'lost'].includes(state.phase)) dispatch({ type: 'pause' });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const nextQuestion = () => { const next = deck(); setQuestion(next); setSelected(null); return scaleFor(next); };
  const finished = state.phase === 'won' || state.phase === 'lost';
  return <section ref={shell} className="mr-shell mr-adventure" aria-label="數學勇者遊戲" data-fullscreen={fullscreen.active}>
    <div className="mr-session"><h1><Spark /> 數學勇者</h1><span>{session.grade} · {session.unit}</span><span className="mr-session-score">答對 {state.correct} 題</span><button className="mr-fullscreen-button" aria-pressed={fullscreen.active} disabled={fullscreen.busy} onClick={() => void fullscreen.toggle()}>{fullscreen.active ? '退出全螢幕' : '全螢幕'}</button>{fullscreen.fallback && <span className="mr-sr-only" role="status">使用視窗內全螢幕模式，按 Esc 可退出。</span>}</div>
    <Journey stage={state.stage} />
    <div className="mr-play-layout">
    <div className="mr-battle-side">
    <div className="mr-dashboard"><Hp name="勇者" hp={state.hp} max={BALANCE.heroHp} />
      <div className="mr-stage"><strong>第 {state.stage + 1} / 5 關</strong><button onClick={() => dispatch({ type: state.paused ? 'resume' : 'pause' })} disabled={finished}>{state.paused ? '繼續冒險' : '暫停'}</button></div>
      <Hp name={enemyArt.name} hp={state.enemyHp} max={enemy.hp} /></div>
    <Battlefield state={state} onReady={setSceneReady} />
    <div className="mr-charge" data-warning={state.phase === 'battle' && !state.paused && enemy.interval - state.charge <= BALANCE.warning}><div><strong>{!sceneReady ? '準備戰場中' : state.paused || state.phase !== 'battle' ? '蓄力已暫停' : enemy.interval - state.charge <= BALANCE.warning ? '攻擊預警！' : '敵人正在蓄力'}</strong><span>答對可壓回 {state.retreat} 秒</span></div><progress aria-label="敵人蓄力" max={enemy.interval} value={state.charge} /></div>
    <div className="mr-status" role="status">{state.message}</div>
    <div className="mr-build"><span>成長 <b>{state.cards.length} / 4</b></span><span>本關受擊 <b>{state.stageHits} 次</b></span><span>答對 <b>{state.correct} / {state.answered}</b></span></div>
    </div>
    <div ref={questionPanel} className="mr-panel" role="region" aria-label="題目與操作" tabIndex={0}>
      {state.paused ? <><h2 ref={panel} tabIndex={-1}>先休息一下</h2><p>戰鬥與自動換題已暫停。準備好再繼續。</p>{state.phase === 'feedback' && <div><strong><FractionText text={question.q} /></strong><p><FractionText text={`正確答案：${question.a[question.correct]}。${question.hint}`} /></p></div>}<div className="mr-actions"><button className="mr-primary" onClick={() => dispatch({ type: 'resume' })}>返回戰鬥</button><button onClick={onLeave}>結束本局，回到準備</button></div></>
        : state.phase === 'battle' || state.phase === 'feedback' ? <>
          <p className="mr-eyebrow">第 {state.answered + (state.phase === 'battle' ? 1 : 0)} 題 · 答對出劍，壓回蓄力{question.difficulty && (question.difficulty === 'challenge' ? ' · 多步推算（較長蓄力）' : ' · 基本題')}</p>
          <h2 ref={panel} tabIndex={-1}><FractionText text={question.q} /></h2>
          <GeometryDiagram data={question.diagram} />
          <div className="mr-answers" data-count={question.a.length}>{question.a.map((option, index) => <button key={`${question.q}-${index}`} disabled={!sceneReady || state.phase !== 'battle'} onClick={() => answer(index)} data-result={state.phase === 'feedback' ? index === question.correct ? 'correct' : index === selected ? 'wrong' : '' : ''}>
            <kbd>{index + 1}</kbd><span><FractionText text={option} /></span>{state.phase === 'feedback' && index === question.correct && <small>正解</small>}{state.phase === 'feedback' && index === selected && index !== question.correct && <small>你的選擇</small>}
          </button>)}</div>
          {state.phase === 'feedback' ? <div className="mr-feedback"><p><FractionText text={`${state.lastCorrect ? '做得好！' : `正確答案是 ${question.a[question.correct]}。`}${question.hint}`} /></p>
            <p className="mr-help">即將自動{state.enemyHp === 0 ? state.stage === 4 ? '顯示冒險成果' : '進入成長選擇' : '進入下一題'}；需要討論可按暫停或 Esc。</p></div>
            : <p className="mr-help">按鍵盤 1～{question.a.length} 或點選答案。答錯會預告 {counterDamage(state)} 傷害的反擊；按 Esc 可暫停。</p>}
        </> : state.phase === 'growth' ? <>
          <p className="mr-eyebrow">第 {state.stage + 1} 關完成 · 第 {state.cards.length + 1} 次成長</p><h2 ref={panel} tabIndex={-1}>選一份力量，繼續前進</h2><p>進入下一關回復 {BALANCE.stageHeal} HP。三選一的效果可累加，只限這一局。</p>
          <div className="mr-cards">{CARDS.map((card, i) => <button key={card} onClick={() => { const questionScale = nextQuestion(); dispatch({ type: 'card', card, questionScale }); }}><span className="mr-eyebrow">{['攻擊', '防守', '節奏'][i]}</span><strong>{CARD_INFO[card].name}</strong><span>{CARD_INFO[card].text}</span></button>)}</div>
        </> : <>
          <p className="mr-eyebrow">本局回顧</p><h2 ref={panel} tabIndex={-1}>{state.phase === 'won' ? '五關完成，勇者凱旋！' : '本次冒險結束'}</h2>
          {state.phase === 'won' ? <VictoryReward /> : <p>這次的冒險到這裡結束。可以先看看錯題與提示，再回到準備畫面。</p>}
          <dl className="mr-summary"><div><dt>答對 / 作答</dt><dd>{state.correct} / {state.answered}</dd></div><div><dt>遊玩時間（不含暫停）</dt><dd>{duration(state.playSeconds)}</dd></div></dl>
          {mistakes.length > 0 && <details><summary>再看一次觀念（{mistakes.length} 題）</summary>{mistakes.map(item => <p key={item.q}><strong><FractionText text={`${item.q} → ${item.answer}`} /></strong><br /><FractionText text={item.hint} /></p>)}</details>}
          <div className="mr-actions">{state.phase === 'won' && <button onClick={onReplay}>再玩同一單元</button>}<button onClick={onLeave}>回到準備</button></div>
        </>}
    </div>
    </div>
  </section>;
}
export function MathRpg() {
  const [grade, setGrade] = useState('五上'); const [unit, setUnit] = useState(DECIMAL_UNIT); const [session, setSession] = useState<Session | null>(null);
  const replay = () => setSession(current => {
    if (!current) return current;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    return { ...current, seed: seed === current.seed ? (seed + 1) >>> 0 : seed };
  });
  const ready = isUnitReady(grade, unit);
  return <PageLayout activityTitle="數學勇者">{session ? <Adventure key={session.seed} session={session} onLeave={() => setSession(null)} onReplay={replay} /> : <section className="mr-shell mr-setup">
    <div className="mr-welcome"><div className="mr-welcome-copy"><p className="page-kicker"><Spark /> 一場用知識出發的小冒險</p><h1>小小勇者，<br /><em>大大的力量。</em></h1><p className="page-lead">用答案揮出你的劍，<br />讓每一次思考，都成為前進的力量。</p><div className="mr-welcome-badges"><span>五關像素冒險</span><span>答題 × 成長 × 驚喜</span></div></div><AdventurePoster /></div>
    <Journey />
    <div className="mr-preparation"><div className="mr-preparation-heading"><span className="mr-section-number">01</span><div><p className="mr-eyebrow">READY, LITTLE HERO?</p><h2>準備好，就出發吧</h2></div><span className="mr-preparation-note">準備紙筆 · 隨時可暫停</span></div>
    <ol className="mr-rules"><li><strong>答對，勇者出劍</strong><span>選擇正確答案，攻擊敵人並壓回蓄力；答錯先看提示，提示結束後結算反擊。同關每挨一次攻擊，下次傷害至少 +{BALANCE.hitGrowth}；過關歸零。</span></li><li><strong>過關，三選一成長</strong><span>加強攻擊、護甲或節奏，累積四次成長。</span></li><li><strong>連續作答，隨時暫停</strong><span>答對 {BALANCE.feedbackMinimum} 秒、答錯 {BALANCE.wrongFeedbackSeconds} 秒後自動接續。需要討論時按暫停，戰鬥與換題都會停止。</span></li></ol>
    <form onSubmit={event => { event.preventDefault(); if (ready) setSession({ grade, unit, seed: crypto.getRandomValues(new Uint32Array(1))[0] }); }}>
      <div className="mr-selects"><label>年級／學期<select value={grade} onChange={event => { setGrade(event.target.value); setUnit(CURRICULUM[event.target.value][0].name); }}>{Object.keys(CURRICULUM).map(g => <option key={g}>{g}</option>)}</select></label><label>複習單元<select value={unit} onChange={event => setUnit(event.target.value)}>{CURRICULUM[grade].map(u => <option key={u.number} value={u.name}>{u.number}{u.endNumber ? `–${u.endNumber}` : ''}. {u.name}{isUnitReady(grade, u.name) ? '' : '（尚未開放）'}</option>)}</select></label></div>
      <p className="mr-note" role="status">{ready ? <>{unit === GEOMETRY_UNIT ? '五上第 5 單元：三角形邊長、三／四邊形內角、平角及扇形角度與全圓分數。四選一；多步推算題提供較長蓄力時間。' : unit === DECIMAL_UNIT ? '五上第九冊第一單元：隨機練習小數加減、四捨五入與比大小。' : unit === FRACTION_UNIT ? '五上第九冊第 4 單元：除法轉分數、帶分數、通分比較及擴分約分。觀察題只練習分子都是 1、或分母比分子多 1；比大小三選一，其餘四選一。此單元採中間戰鬥節奏，蓄力比小數短、比因數倍數長。' : '五上第九冊第 2–3 單元：因數與倍數合併練習，包含公因數、最大公因數、公倍數、最小公倍數及 2、5、10 的倍數判斷。此單元採較快戰鬥節奏，五關怪物的蓄力時間較短。'}可準備紙筆計算，需要討論時可暫停；紙筆作答的遊戲時長仍待教室試玩校準。</> : '此單元題庫尚未開放。目前可選擇五上的「多位小數與加減」、「因數與倍數」、「擴分、約分與通分」或「多邊形與扇形」開始冒險。'}</p><button className="mr-primary" type="submit" disabled={!ready}>{ready ? '開始五關冒險' : '題庫尚未開放'}</button>
    </form></div>
  </section>}</PageLayout>;
}
