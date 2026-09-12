import { useEffect, useRef, useState } from 'react';
import { PageLayout } from '../../components/PageLayout';
import { questions, type Question } from './questions';
import { drawQuestions, normalizeSetting } from './model';
import './quick-quiz.css';

function Round({ question, seconds, index, total, onNext, onSetup }: {
  question: Question; seconds: number; index: number; total: number; onNext: () => void; onSetup: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const title = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  useEffect(() => {
    if (remaining === 0) return;
    const timer = window.setTimeout(() => setRemaining(previous => Math.max(0, previous - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);
  // 揭答後保留老師手動前進的流程，不自動跳題。
  useEffect(() => { if (remaining === 0) next.current?.focus(); }, [remaining]);
  const circumference = 2 * Math.PI * 42;
  return <section className="quiz-content">
    <div className="quiz-progress"><button type="button" onClick={onSetup}>回到設定</button><span>第 {index + 1} 題 / 共 {total} 題</span></div>
    <progress aria-label="題目進度" max={total} value={index} />
    <h2 className="quiz-question" ref={title} tabIndex={-1}>{question.q}</h2>
    <div className="quiz-stage">
      {remaining > 0 ? <div className="quiz-timer" role="timer" aria-label={`剩餘 ${remaining} 秒`}>
        <svg viewBox="0 0 96 96" aria-hidden="true"><circle className="quiz-ring-bg" cx="48" cy="48" r="42" /><circle className="quiz-ring" cx="48" cy="48" r="42" style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - remaining / seconds) }} /></svg>
        <strong>{remaining}</strong>
      </div> : <div role="status"><p className={`quiz-answer ${question.answer ? 'is-true' : 'is-false'}`}>{question.answer ? '對 (True)' : '錯 (False)'}</p><p>正確答案</p></div>}
    </div>
    {remaining === 0 && <button type="button" ref={next} className="quiz-primary" onClick={onNext}>{index === total - 1 ? '完成' : '下一題'}</button>}
  </section>;
}

export function QuickQuiz() {
  const [timeInput, setTime] = useState('3');
  const [countInput, setCount] = useState('10');
  const [run, setRun] = useState<{ seconds: number; items: Question[] } | null>(null);
  const [index, setIndex] = useState(0);
  const [screen, setScreen] = useState<'setup' | 'playing' | 'result'>('setup');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (screen !== 'playing') heading.current?.focus(); }, [screen]);
  const start = () => {
    const seconds = normalizeSetting(timeInput, 60);
    const count = normalizeSetting(countInput, questions.length);
    setTime(String(seconds)); setCount(String(count)); setIndex(0);
    setRun({ seconds, items: drawQuestions(questions, count) }); setScreen('playing');
  };
  return <PageLayout><div className="quiz-card-react"><div className="quiz-banner"><h1>快問快答</h1><p>是非題挑戰 · 時間到公布答案</p></div>
    {screen === 'setup' && <section className="quiz-content"><h2 ref={heading} tabIndex={-1}>設定遊戲方式</h2><p>依照孩子的年齡調整每題秒數與題目數量</p>
      <form noValidate onSubmit={event => { event.preventDefault(); start(); }}>
        <div className="quiz-settings">
          <fieldset><legend>每題作答時間</legend><label htmlFor="time-input">每題秒數</label><input id="time-input" type="number" min="1" max="60" step="1" value={timeInput} onChange={e => setTime(e.target.value)} aria-describedby="time-hint" />
            <div className="quiz-picks">{[3, 5, 8, 10].map(n => <button type="button" key={n} onClick={() => setTime(String(n))}>{n} 秒</button>)}</div><p id="time-hint">可輸入 1～60 秒</p>
          </fieldset>
          <fieldset><legend>題目數量</legend><label htmlFor="count-input">共幾題</label><input id="count-input" type="number" min="1" max={questions.length} step="1" value={countInput} onChange={e => setCount(e.target.value)} aria-describedby="count-hint" />
            <div className="quiz-picks">{[5, 10, 20, 30].map(n => <button type="button" key={n} onClick={() => setCount(String(Math.min(n, questions.length)))}>{n} 題</button>)}</div><p id="count-hint">可輸入 1～{questions.length} 題</p>
          </fieldset>
        </div><button className="quiz-primary" type="submit">開始挑戰</button>
      </form></section>}
    {screen === 'playing' && run && <Round key={index} question={run.items[index]} seconds={run.seconds} index={index} total={run.items.length}
      onSetup={() => setScreen('setup')} onNext={() => { if (index === run.items.length - 1) setScreen('result'); else setIndex(index + 1); }} />}
    {screen === 'result' && run && <section className="quiz-content"><h2 ref={heading} tabIndex={-1}>全部完成！</h2><p>{run.items.length} 題都答完囉，做得好！</p><button className="quiz-primary" onClick={() => setScreen('setup')}>再玩一次</button></section>}
  </div></PageLayout>;
}
