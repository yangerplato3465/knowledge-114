import { useEffect, useState } from 'react';
import './milo-companion.css';

type Moment = 'hello' | 'walk' | 'water' | 'look' | 'flowers' | 'oops' | 'wave';

const moments: { action: Moment; line: string; duration: number }[] = [
  { action: 'hello', line: '今天想往哪裡走？', duration: 4200 },
  { action: 'walk', line: '', duration: 2600 },
  { action: 'water', line: '小水滴，來幫花喝水吧。', duration: 4400 },
  { action: 'look', line: '', duration: 2400 },
  { action: 'flowers', line: '咦，真的長出小花了！', duration: 4600 },
  { action: 'oops', line: '哎呀，帽子差點先走了。', duration: 3700 },
  { action: 'wave', line: '慢慢想也沒關係喔。', duration: 3900 },
];

export function MiloCompanion() {
  const [index, setIndex] = useState(0);
  const [motionAllowed, setMotionAllowed] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const sync = () => setMotionAllowed(!media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    if (!motionAllowed || !visible) return;
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % moments.length), moments[index].duration);
    return () => window.clearTimeout(timer);
  }, [index, motionAllowed, visible]);

  const moment = moments[index];
  return <div className="milo-stage" data-action={moment.action}>
    <button className="milo-character" type="button" onClick={() => setIndex(current => (current + 1) % moments.length)}
      aria-label={`和米洛說話：${moment.line || '米洛正在散步'}`}>
      <img className="milo-regular" src={`${import.meta.env.BASE_URL}assets/images/site/milo.webp`} alt="" width="320" height="320" decoding="async" />
      <img className="milo-celebrate" src={`${import.meta.env.BASE_URL}assets/images/magic-workshop/display/apprentice-celebrate-v1.webp`} alt="" width="768" height="768" decoding="async" />
    </button>
    <span className="milo-ground" aria-hidden="true" />
    {moment.line && <p className="milo-speech" aria-live="off"><span aria-hidden="true">✦</span>{moment.line}</p>}
    <span className="milo-magic milo-water" aria-hidden="true"><i /><i /><i /></span>
    <span className="milo-magic milo-flowers" aria-hidden="true"><i /><i /><i /></span>
    <span className="milo-magic milo-stars" aria-hidden="true">✧ ✦ ✧</span>
  </div>;
}
