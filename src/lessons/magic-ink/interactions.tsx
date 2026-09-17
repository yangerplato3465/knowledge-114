import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { knowledgeQuestions } from './questions';
import { CapillaryView } from './CapillaryView';
import { RainbowView } from './RainbowView';

const QuizContext = createContext<{ answers: Record<number, number>; answer: (id: number, choice: number) => void } | null>(null);
export function QuizProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return <QuizContext.Provider value={{ answers, answer: (id, choice) => setAnswers(old => id in old ? old : { ...old, [id]: choice }) }}>{children}</QuizContext.Provider>;
}
export function KnowledgeQuiz({ index }: { index: number }) {
  const { answers, answer } = useContext(QuizContext)!;
  const data = knowledgeQuestions[index];
  const selected = answers[index];
  const done = selected !== undefined;
  return <section className={`quiz ${data.trivia ? 'trivia' : ''}`} aria-label={data.question}>
    {data.trivia && <div className="q-num">第 {index + 1} 題</div>}
    <div className="q-text">{data.question}</div>
    <div className="q-options">{data.options.map((option, choice) => <button type="button" key={choice} disabled={done}
      className={`q-btn ${done && option.correct ? 'correct' : done && selected === choice ? 'wrong' : ''}`}
      onClick={() => answer(index, choice)}>{option.label}</button>)}</div>
    {done && <div className="q-answer show" role="status"><b>{data.options[selected].correct ? '答對了！' : '這題答錯了。'}</b> {data.answer}</div>}
  </section>;
}
export function TriviaScore() {
  const { answers } = useContext(QuizContext)!;
  const trivia = knowledgeQuestions.map((q, id) => ({ ...q, id })).filter(q => q.trivia);
  if (!trivia.every(q => q.id in answers)) return null;
  const right = trivia.filter(q => q.options[answers[q.id]].correct).length;
  const message = right === 4 ? '🏆 全對！你是超知識認證的「原子筆博士」！' : right === 3 ? '👍 好厲害，差一點就滿分了！' : right >= 2 ? '😊 不錯喔！再把上面的內容看一次，找同學再比一場！' : '💪 沒關係，冷知識本來就很冷～看完答案你就是下一個出題大王！';
  return <div className="trivia-score show" role="status">你答對了 {right} / {trivia.length} 題　{message}</div>;
}

type Mat = 'towel' | 'rope' | 'plastic';
type Controls = { phase: number; canStart: boolean; done: boolean; onStart: () => void; onReset: () => void; result: ReactNode };
export type CapillaryViewProps = Controls & { picked: Mat | null; onPick: (mat: Mat) => void };
export function CapillaryRace() {
  const [picked, setPicked] = useState<Mat | null>(null);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (phase !== 1) return;
    const timer = window.setTimeout(() => setPhase(2), 4800);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const names = { towel: '🧻 紙巾', rope: '🧶 棉繩', plastic: '🥢 塑膠棒' };
  return <CapillaryView picked={picked} phase={phase} canStart={picked !== null && phase === 0} done={phase === 2}
    onPick={setPicked} onStart={() => { if (picked && phase === 0) setPhase(1); }} onReset={() => { setPicked(null); setPhase(0); }}
    result={<><b>🏆 冠軍是：🧻 紙巾！</b> {picked === 'towel' ? '🎉 恭喜你猜對了！' : `你猜的是「${picked ? names[picked] : ''}」，殘念～再玩一次吧！`}<br />紙巾的纖維<b>縫隙又多又細</b>，毛細作用最強，水爬得最快最高；棉繩的縫隙比較粗，吸得慢一點；塑膠棒表面光滑<b>沒有縫隙</b>，水完全爬不上去。原子筆筆芯裡的細管就是利用這個原理，讓墨水自動往筆尖跑！</>} />;
}

type Side = 'left' | 'right';
export type RainbowViewProps = Controls & { picks: Record<Side, string | null>; onPick: (side: Side, color: string) => void };
export function RainbowBridge() {
  const [picks, setPicks] = useState<Record<Side, string | null>>({ left: null, right: null });
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timers = [600, 1800, 2300, 4900].map((delay, index) => window.setTimeout(() => setPhase(index + 2), delay));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [running]);
  const right = Number(picks.left === 'green') + Number(picks.right === 'orange');
  return <RainbowView picks={picks} phase={phase} canStart={!!picks.left && !!picks.right && phase === 0} done={phase === 5}
    onPick={(side, color) => setPicks(old => ({ ...old, [side]: color }))}
    onStart={() => { if (picks.left && picks.right && phase === 0) { setPhase(1); setRunning(true); } }}
    onReset={() => { setRunning(false); setPhase(0); setPicks({ left: null, right: null }); }}
    result={<><b>🌈 答案揭曉：藍＋黃＝🟢 綠色、黃＋紅＝🟠 橘色！</b>　你答對了 {right} / 2 題{right === 2 ? '，太厲害了 🎉' : '，再玩一次觀察看看～'}<br />水靠<b>毛細現象</b>沿著紙巾纖維的細縫爬上橋頂、再流進空罐；兩邊的顏色在空罐裡相遇，就調出新的顏色！<br /><b>🤓 小知識：</b>彩虹橋常被誤會成「虹吸現象」——虹吸需要一根裝滿水的密閉管子讓水連續流動，而紙巾橋是靠纖維縫隙一點一點把水吸過去，其實是毛細現象喔！</>} />;
}

