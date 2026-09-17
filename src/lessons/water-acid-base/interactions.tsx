import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { questions } from './questions';

export const temperatureFor = (count: number) => Math.min(85, 25 + count * 14.5);
function useExperiment() {
  const [count, setCount] = useState(0);
  const [indicator, setIndicator] = useState(false);
  const [pendingNa, setPendingNa] = useState(false);
  const [pendingIndicator, setPendingIndicator] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const cancel = () => { timers.current.forEach(clearTimeout); timers.current.clear(); };
  useEffect(() => cancel, []);
  function schedule(key: string, delay: number, action: () => void) {
    if (timers.current.has(key)) return;
    timers.current.set(key, setTimeout(() => { timers.current.delete(key); action(); }, delay));
  }
  return { count, indicator, pendingNa, pendingIndicator, answers,
    answer: (question: number, option: number) => setAnswers(old => ({ ...old, [question]: option })),
    addNaOH: () => { if (count >= 6) return; setPendingNa(true); schedule('na', 600, () => { setCount(c => Math.min(6, c + 1)); setPendingNa(false); }); },
    addIndicator: () => { if (indicator) return; setPendingIndicator(true); schedule('indicator', 500, () => { setIndicator(true); setPendingIndicator(false); }); },
    reset: () => { cancel(); setCount(0); setIndicator(false); setPendingNa(false); setPendingIndicator(false); setAnswers({}); },
  };
}
const LabContext = createContext<ReturnType<typeof useExperiment> | null>(null);
export function LabProvider({ children }: { children: ReactNode }) {
  const lab = useExperiment();
  return <LabContext value={lab}>{children}</LabContext>;
}
export function useLab() { const lab = useContext(LabContext); if (!lab) throw new Error('Missing LabProvider'); return lab; }
export function Question({ index }: { index: number }) {
  const lab = useLab(); const question = questions[index]; const selected = lab.answers[index];
  const correct = question.options[selected]?.correct;
  return <div className="question-card"><p id={`question-${index}`}>{question.question}</p>
    <div className="option-group" role="group" aria-labelledby={`question-${index}`}>{question.options.map((option, i) =>
      <button key={i} type="button" className={`option-btn ${selected === i ? correct ? 'correct' : 'incorrect' : ''}`} aria-pressed={selected === i} onClick={() => lab.answer(index, i)}>{option.label}</button>)}</div>
    <div role="status" className={`feedback-alert ${selected !== undefined ? 'shown' : ''} ${correct ? 'correct' : 'incorrect'}`}>
      {selected !== undefined && (correct ? '答對了！恭喜你，實驗觀察非常入微！' : '答案不太對喔！試著加一些 NaOH 或重設實驗再觀察一次！')}
    </div></div>;
}
export function Beaker() {
  const lab = useLab(); const temperature = temperatureFor(lab.count); const pink = lab.indicator && lab.count > 0;
  return <><div id="beaker-wrapper">
    <div className="thermometer"><div id="thermometer-label">{temperature.toFixed(1)}°C</div><div className="thermometer-track"><div id="mercury-bar" style={{height: `${temperature}%`}} /></div></div>
    <div id="beaker"><svg viewBox="0 0 100 100" aria-hidden="true" className="beaker-outline"><path d="M 15,10 L 15,90 A 5,5 0 0,0 20,95 L 80,95 A 5,5 0 0,0 85,90 L 85,10 M 10,10 L 20,10 M 80,10 L 90,10" fill="none" stroke="#78909c" strokeWidth="3" strokeLinecap="round" />{[30,50,70].map(y=><line key={y} x1="25" y1={y} x2={y===50?45:35} y2={y} stroke="#b0bec5" strokeWidth="1.5" />)}</svg>
      <div id="water-liquid" className={pink ? 'pink' : ''}><div id="water-wave" key={`wave-${lab.count}-${lab.indicator}`} className={lab.count || lab.indicator ? 'wave-impact' : ''} />
        <div id="ion-container" aria-hidden="true">{Array.from({length:lab.count * 2}, (_,i)=><div key={i} className={`floating-ion ion-floating ${i%2 ? 'ion-oh' : 'ion-na'}`} style={{left: `${12 + (i * 19) % 60}px`, top: `${20 + (i * 13) % 40}px`, '--idle-x':'4px', '--idle-y':'-5px'} as CSSProperties}><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill={i%2?'#4db6ac':'#ff8a65'} stroke="white" strokeWidth="2"/><text x="16" y="20.5" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">{i%2?'OH⁻':'Na⁺'}</text></svg></div>)}</div></div>
      <div id="naoh-falling-pellet" className={lab.pendingNa ? 'pellet-falling' : ''} /><div id="droplet-anim" className={lab.pendingIndicator ? 'droplet-falling' : ''} />
      <div id="splash-ripple" key={`splash-${lab.count}-${lab.indicator}`} className={lab.count || lab.indicator ? 'splash-active' : ''} />
    </div></div><p className="experiment-status" role="status">已加入 {lab.count}/6 片 NaOH；{temperature.toFixed(1)}°C；{lab.indicator ? '已加入指示劑' : '尚未加入指示劑'}；{pink ? '粉紅色' : '無色透明'}。Na⁺ / OH⁻ 各 {lab.count} 個示意離子。</p></>;
}
