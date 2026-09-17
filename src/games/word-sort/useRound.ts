import { useEffect, useRef, useState } from 'react';
import { answerDelay, drawQueue, makeChallengeTasks, timing, wordOf, type Suffix } from './model';
import { pools } from './pools';

export function speak(word: string) {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US'; utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

export function useRound() {
  const [phase, setPhase] = useState<'start' | 'play' | 'courier' | 'result'>('start');
  const [poolName, setPoolName] = useState('');
  const [queue, setQueue] = useState<ReturnType<typeof drawQueue>>([]);
  const [answers, setAnswers] = useState<Suffix[]>([]);
  const [reveal, setReveal] = useState(false);
  const [merged, setMerged] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tasks, setTasks] = useState<ReturnType<typeof makeChallengeTasks>>([]);
  const [taskAt, setTaskAt] = useState(0);
  const [delivered, setDelivered] = useState(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lock = useRef(false);
  const started = useRef(0);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current.clear(); };
  const later = (fn: () => void, delay: number) => {
    const id = setTimeout(() => { timers.current.delete(id); fn(); }, delay);
    timers.current.add(id);
  };
  useEffect(() => () => { clear(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [phase]);
  const quit = () => {
    clear(); window.speechSynthesis?.cancel(); lock.current = false;
    setPhase('start');
  };
  const start = (name: string) => {
    clear(); window.speechSynthesis?.cancel();
    setPoolName(name); setQueue(drawQueue(pools[name])); setAnswers([]);
    setReveal(false); setMerged(false); setLeaving(false); setSeconds(0);
    setTasks([]); setTaskAt(0); setDelivered(false); lock.current = false;
    started.current = Date.now(); setPhase('play');
  };
  const index = answers.length - (reveal ? 1 : 0);
  const item = queue[index];
  const advance = (answered: number) => {
    clear(); setLeaving(true);
    later(() => {
      setLeaving(false); setReveal(false); setMerged(false); lock.current = false;
      if (answered === queue.length) { setTasks(makeChallengeTasks(queue)); setPhase('courier'); }
    }, timing.leave + timing.shift);
  };
  const answer = (chosen: Suffix) => {
    if (phase !== 'play' || lock.current || !item) return false;
    lock.current = true;
    setAnswers([...answers, chosen]); setReveal(true);
    later(() => { setMerged(true); speak(wordOf(item)); }, timing.merge);
    later(() => advance(answers.length + 1), answerDelay(item, chosen));
    return chosen === item.suffix;
  };
  const skip = () => { if (reveal && !leaving) advance(answers.length); };
  const complete = () => {
    if (lock.current || phase !== 'courier') return;
    lock.current = true; setDelivered(true);
    later(() => {
      lock.current = false; setDelivered(false);
      if (taskAt + 1 === tasks.length) {
        setSeconds(Math.floor((Date.now() - started.current) / 1000)); setPhase('result');
      } else setTaskAt(taskAt + 1);
    }, timing.courier);
  };
  const wrong = queue.slice(0, answers.length).filter((item, i) => answers[i] !== item.suffix);
  return { phase, poolName, queue, answers, reveal, merged, leaving, seconds, tasks, taskAt, delivered,
    index, item, wrong, right: answers.length - wrong.length, start, quit, answer, skip, complete };
}
