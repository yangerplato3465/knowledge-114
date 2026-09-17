import { useEffect, useRef, useState } from 'react';
import { wordOf, type makeChallengeTasks, type Suffix } from './model';
import { speak } from './useRound';

type Task = ReturnType<typeof makeChallengeTasks>[number];
export function Courier({ task, complete, celebrate }: {
  task: Task; complete: () => void; celebrate: (rect: DOMRect, suffix: Suffix) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const scanner = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const speed = useRef(0);
  const [feedback, setFeedback] = useState('');
  const [caught, setCaught] = useState(false);
  useEffect(() => {
    const view = viewport.current!;
    const rail = track.current!;
    let frame = 0, x = 0, start = 0, cycle = 0, last = 0;
    const measure = () => {
      const first = rail.children[0] as HTMLElement;
      const duplicate = rail.children[task.options.length] as HTMLElement;
      start = view.clientWidth / 2 - first.offsetWidth / 2;
      cycle = duplicate.offsetLeft - first.offsetLeft;
      x = start; speed.current = Math.max(190, view.clientWidth * .19);
      rail.style.transform = `translateX(${x}px)`;
    };
    const move = (now: number) => {
      if (done.current) return;
      const delta = last ? Math.min(40, now - last) / 1000 : 0;
      last = now; x -= speed.current * delta;
      if (cycle && x <= start - cycle) x += cycle;
      rail.style.transform = `translateX(${x}px)`;
      frame = requestAnimationFrame(move);
    };
    measure(); frame = requestAnimationFrame(move);
    const observer = new ResizeObserver(measure); observer.observe(view);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [task]);
  const send = () => {
    if (done.current) return;
    const scan = scanner.current!.getBoundingClientRect();
    const scanX = scan.left + scan.width / 2;
    let nearest: HTMLElement | undefined;
    let distance = Infinity;
    for (const element of track.current!.children) {
      const rect = element.getBoundingClientRect();
      const d = Math.abs(rect.left + rect.width / 2 - scanX);
      if (d < distance) { nearest = element as HTMLElement; distance = d; }
    }
    if (!nearest || distance > scan.width * .62) {
      setFeedback('掃描門裡還沒有箱子，再等一下！'); return;
    }
    const index = Number(nearest.dataset.index);
    if (index !== task.targetIndex) {
      speed.current = Math.max(105, speed.current * .78);
      setFeedback(`剛才抓到 ${task.options[index].stem}，它不是「${task.target.def}」需要的字根。減速再試一次！`);
      return;
    }
    done.current = true; setCaught(true); nearest.classList.add('caught');
    setFeedback(`${wordOf(task.target)}，就是「${task.target.def}」！`);
    speak(wordOf(task.target)); celebrate(nearest.getBoundingClientRect(), task.target.suffix); complete();
  };
  return <>
    <div className="challenge-prompt">
      <div id="challenge-zh">找出能組成「{task.target.def}」的字根</div>
      <code id="challenge-code">{caught ? `${task.target.stem} + ${task.target.suffix} = ${wordOf(task.target)}` : `? + ${task.target.suffix}`}</code>
      <div role="status" className={`challenge-feedback ${caught ? 'correct' : 'wrong'}`}>{feedback}</div>
    </div>
    <div className="challenge-visual courier"><div ref={viewport} className={`conveyor-viewport ${task.target.suffix}`}>
      <div className="conveyor-belt" /><div ref={track} className="courier-track">
        {[0, 1].flatMap(cycle => task.options.map((item, i) => <div key={`${cycle}-${i}`} className="courier-crate" data-index={i} aria-hidden={cycle === 1 || undefined}>
          <b>{item.stemZh}</b><span>{item.stem}</span></div>))}
      </div><div ref={scanner} className="scanner-gate"><span>SCAN</span></div>
    </div></div>
    <div className="challenge-options courier"><button className="challenge-send" disabled={caught} onClick={send}>送出！</button></div>
  </>;
}
