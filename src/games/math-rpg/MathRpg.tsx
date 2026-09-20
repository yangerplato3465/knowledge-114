import { useEffect, useReducer, useRef, useState } from 'react';
import { PageLayout } from '../../components/PageLayout';
import { BALANCE, CARDS, CARD_INFO, battleReducer, createBattle, enemyFor, counterDamage, attackDamage, feedbackDuration } from './battle';
import { createQuestionDeck, CURRICULUM, isUnitReady, battlePaceFor } from './question-deck';
import { Battlefield } from './Battlefield';
import { DECIMAL_UNIT } from './decimal-questions';
import { FRACTION_UNIT } from './fraction-questions';
import { FractionText } from './FractionText';
import './math-rpg.css';

interface Session { grade: string; unit: string; seed: number }
const duration = (seconds: number) => `${Math.floor(seconds / 60)} 分 ${Math.floor(seconds % 60)} 秒`;
function Hp({ name, hp, max }: { name: string; hp: number; max: number }) {
  return <div className="mr-hp"><strong>{name}</strong><span>{hp} / {max} HP</span><meter aria-label={`${name} HP`} min={0} max={max} value={hp} /></div>;
}
function Adventure({ session, onLeave }: { session: Session; onLeave: () => void }) {
  const [state, dispatch] = useReducer(battleReducer, session.seed, seed => createBattle(seed, undefined, battlePaceFor(session.grade, session.unit)));
  const [{ deck, first }] = useState(() => {
    const deck = createQuestionDeck(session.grade, session.unit, session.seed ^ 0x12345);
    return { deck, first: deck() };
  });
  const [question, setQuestion] = useState(first);
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<{ q: string; answer: string; hint: string }[]>([]);
  const panel = useRef<HTMLHeadingElement>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const answerLocked = useRef(false);
  const advancedAnswer = useRef(0);
  const enemy = enemyFor(state);
  useEffect(() => {
    if (state.paused || document.visibilityState !== 'visible' || state.phase !== 'feedback'
      || state.feedbackSeconds + 1e-9 < feedbackDuration(state) || advancedAnswer.current === state.answered) return;
    advancedAnswer.current = state.answered;
    if (state.enemyHp > 0) { setQuestion(deck()); setSelected(null); }
    dispatch({ type: 'continue' });
  }, [state.paused, state.phase, state.feedbackSeconds, state.lastCorrect, state.answered, state.enemyHp, deck]);
  useEffect(() => {
    if (state.paused || state.phase === 'won' || state.phase === 'lost') return;
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
  }, [state.phase, state.paused]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState !== 'visible') dispatch({ type: 'pause' }); };
    const leave = () => dispatch({ type: 'pause' });
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', leave);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); };
  }, []);
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, [state.phase, state.paused, question]);
  useEffect(() => { if (state.phase === 'battle') answerLocked.current = false; }, [state.phase]);
  const answer = (index: number) => {
    if (stateRef.current.phase !== 'battle' || stateRef.current.paused || answerLocked.current || index < 0 || index >= question.a.length) return;
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
      if (event.key === 'Escape' && !state.paused) dispatch({ type: 'pause' });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const nextQuestion = () => { setQuestion(deck()); setSelected(null); };
  const finished = state.phase === 'won' || state.phase === 'lost';
  return <section className="mr-shell" aria-label="數學勇者遊戲">
    <div className="mr-session"><span>{session.grade} · {session.unit}</span><h1>數學勇者 · 試玩版</h1></div>
    <div className="mr-dashboard"><Hp name="勇者" hp={state.hp} max={BALANCE.heroHp} />
      <div className="mr-stage"><strong>第 {state.stage + 1} / 5 關</strong><button onClick={() => dispatch({ type: state.paused ? 'resume' : 'pause' })} disabled={finished}>{state.paused ? '繼續冒險' : '暫停'}</button></div>
      <Hp name={enemy.name} hp={state.enemyHp} max={enemy.hp} /></div>
    <Battlefield stage={state.stage} feedback={state.paused ? null : state.lastCorrect} />
    <div className="mr-charge"><div><strong>{state.paused || state.phase !== 'battle' ? '蓄力已暫停' : enemy.interval - state.charge <= BALANCE.warning ? '攻擊預警！' : '敵人正在蓄力'}</strong><span>{Math.ceil(enemy.interval - state.charge)} 秒後攻擊 · 傷害 {attackDamage(state)}</span></div><progress aria-label="敵人蓄力" max={enemy.interval} value={state.charge} /><p>本關已受擊 {state.stageHits} 次 · 每次受擊後，下次傷害至少 +{BALANCE.hitGrowth}；過關或再戰歸零。</p></div>
    <div className="mr-status" role="status">{state.message}</div>
    <div className="mr-panel">
      {state.paused ? <><h2 ref={panel} tabIndex={-1}>先休息一下</h2><p>戰鬥與自動換題已暫停。準備好再繼續。</p>{state.phase === 'feedback' && <div><strong><FractionText text={question.q} /></strong><p><FractionText text={`正確答案：${question.a[question.correct]}。${question.hint}`} /></p></div>}<div className="mr-actions"><button className="mr-primary" onClick={() => dispatch({ type: 'resume' })}>返回戰鬥</button><button onClick={onLeave}>結束本局，回到準備</button></div></>
        : state.phase === 'battle' || state.phase === 'feedback' ? <>
          <p className="mr-eyebrow">第 {state.answered + (state.phase === 'battle' ? 1 : 0)} 題 · 答對出劍，壓回蓄力</p>
          <h2 ref={panel} tabIndex={-1}><FractionText text={question.q} /></h2>
          <div className="mr-answers" data-count={question.a.length}>{question.a.map((option, index) => <button key={`${question.q}-${index}`} disabled={state.phase !== 'battle'} onClick={() => answer(index)} data-result={state.phase === 'feedback' ? index === question.correct ? 'correct' : index === selected ? 'wrong' : '' : ''}>
            <kbd>{index + 1}</kbd><span><FractionText text={option} /></span>{state.phase === 'feedback' && index === question.correct && <small>正解</small>}{state.phase === 'feedback' && index === selected && index !== question.correct && <small>你的選擇</small>}
          </button>)}</div>
          {state.phase === 'feedback' ? <div className="mr-feedback"><p><FractionText text={`${state.lastCorrect ? '做得好！' : `正確答案是 ${question.a[question.correct]}。`}${question.hint}`} /></p>
            <p className="mr-help">即將自動{state.enemyHp === 0 ? state.stage === 4 ? '顯示冒險成果' : '進入成長選擇' : '進入下一題'}；需要討論可按暫停或 Esc。</p></div>
            : <p className="mr-help">按鍵盤 1～{question.a.length} 或點選答案。答錯會預告 {counterDamage(state)} 傷害的反擊；按 Esc 可暫停。</p>}
        </> : state.phase === 'growth' ? <>
          <p className="mr-eyebrow">第 {state.stage + 1} 關完成 · 第 {state.cards.length + 1} 次成長</p><h2 ref={panel} tabIndex={-1}>選一份力量，繼續前進</h2><p>進入下一關回復 {BALANCE.stageHeal} HP。三選一的效果可累加，只限這一局。</p>
          <div className="mr-cards">{CARDS.map((card, i) => <button key={card} onClick={() => { nextQuestion(); dispatch({ type: 'card', card }); }}><span className="mr-eyebrow">{['攻擊', '防守', '節奏'][i]}</span><strong>{CARD_INFO[card].name}</strong><span>{CARD_INFO[card].text}</span></button>)}</div>
        </> : <>
          <p className="mr-eyebrow">本局回顧</p><h2 ref={panel} tabIndex={-1}>{state.phase === 'won' ? '五關完成，勇者凱旋！' : '整裝再出發'}</h2>
          <p>{state.phase === 'won' ? '獎勵事件已到達；獎勵內容與教師發放方式尚待設計，本次不發放獎品。' : '可以回滿 HP 再戰本關，保留已選成長；本關敵人也會回滿 HP。'}</p>
          <dl className="mr-summary"><div><dt>答對 / 作答</dt><dd>{state.correct} / {state.answered}</dd></div><div><dt>遊玩時間（不含暫停）</dt><dd>{duration(state.playSeconds)}</dd></div><div><dt>再戰次數</dt><dd>{state.retries}</dd></div></dl>
          {mistakes.length > 0 && <details><summary>再看一次觀念（{mistakes.length} 題）</summary>{mistakes.map(item => <p key={item.q}><strong><FractionText text={`${item.q} → ${item.answer}`} /></strong><br /><FractionText text={item.hint} /></p>)}</details>}
          <div className="mr-actions">{state.phase === 'lost' && <button className="mr-primary" onClick={() => { nextQuestion(); dispatch({ type: 'retry' }); }}>回滿 HP，再戰本關</button>}<button onClick={onLeave}>回到準備</button></div>
        </>}
    </div>
    <div className="mr-build"><span>答對傷害 <b>{state.attack}</b></span><span>護甲 <b>{state.guard}</b></span><span>壓回蓄力 <b>{state.retreat} 秒</b></span><span>成長 <b>{state.cards.length} / 4</b></span></div>
  </section>;
}
export function MathRpg() {
  const [grade, setGrade] = useState('五上'); const [unit, setUnit] = useState(DECIMAL_UNIT); const [session, setSession] = useState<Session | null>(null);
  const ready = isUnitReady(grade, unit);
  return <PageLayout activityTitle="數學勇者">{session ? <Adventure key={session.seed} session={session} onLeave={() => setSession(null)} /> : <section className="mr-shell mr-setup">
    <p className="page-kicker">五關冒險 · 操作與平衡試玩版</p><h1>數學勇者</h1><p className="page-lead">用答案揮出你的劍。<br />每過一關，選一份力量，迎接最後的魔王。</p>
    <ol className="mr-rules"><li><strong>答對，勇者出劍</strong><span>選擇正確答案，攻擊敵人並壓回蓄力；答錯先看提示，提示結束後結算反擊。同關每挨一次攻擊，下次傷害至少 +{BALANCE.hitGrowth}；過關或再戰歸零。</span></li><li><strong>過關，三選一成長</strong><span>加強攻擊、護甲或節奏，累積四次成長。</span></li><li><strong>連續作答，隨時暫停</strong><span>答對 {BALANCE.feedbackMinimum} 秒、答錯 {BALANCE.wrongFeedbackSeconds} 秒後自動接續。需要討論時按暫停，戰鬥與換題都會停止。</span></li></ol>
    <form onSubmit={event => { event.preventDefault(); if (ready) setSession({ grade, unit, seed: crypto.getRandomValues(new Uint32Array(1))[0] }); }}>
      <div className="mr-selects"><label>年級／學期<select value={grade} onChange={event => { setGrade(event.target.value); setUnit(CURRICULUM[event.target.value][0].name); }}>{Object.keys(CURRICULUM).map(g => <option key={g}>{g}</option>)}</select></label><label>複習單元<select value={unit} onChange={event => setUnit(event.target.value)}>{CURRICULUM[grade].map(u => <option key={u.number} value={u.name}>{u.number}{u.endNumber ? `–${u.endNumber}` : ''}. {u.name}{isUnitReady(grade, u.name) ? '' : '（尚未開放）'}</option>)}</select></label></div>
      <p className="mr-note" role="status">{ready ? <>{unit === DECIMAL_UNIT ? '五上第九冊第一單元：隨機練習小數加減、四捨五入與比大小。' : unit === FRACTION_UNIT ? '五上第九冊第 4 單元：除法轉分數、帶分數、通分比較及擴分約分。觀察題只練習分子都是 1、或分母比分子多 1；比大小三選一，其餘四選一。此單元採中間戰鬥節奏，蓄力比小數短、比因數倍數長。' : '五上第九冊第 2–3 單元：因數與倍數合併練習，包含公因數、最大公因數、公倍數、最小公倍數及 2、5、10 的倍數判斷。此單元採較快戰鬥節奏，五關怪物的蓄力時間較短。'}可準備紙筆計算，需要討論時可暫停；紙筆作答的遊戲時長仍待教室試玩校準。角色與敵人目前仍為佔位美術。</> : '此單元題庫尚未開放。目前可選擇五上的「多位小數與加減」、「因數與倍數」或「擴分、約分與通分」開始冒險。'}</p><button className="mr-primary" type="submit" disabled={!ready}>{ready ? '開始五關冒險' : '題庫尚未開放'}</button>
    </form>
  </section>}</PageLayout>;
}
