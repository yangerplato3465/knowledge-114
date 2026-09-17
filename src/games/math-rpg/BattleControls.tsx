import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export function BattleDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog className="mr-dialog" ref={ref} aria-labelledby="mr-dialog-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <h2 id="mr-dialog-title">{title}</h2>{children}
  </dialog>;
}

export function HowTo() {
  return <ul className="mr-howto">
    <li>答對攻擊怪獸；答錯或超時則受到攻擊。</li>
    <li>每題預設 30 秒。連續答對從第二題起每層傷害 +5%，答錯歸零。</li>
    <li>護甲減少直接傷害；護盾擋下一次攻擊及附加狀態，但不抵擋既有流血。</li>
    <li>流血每題結算並減少一層；擊殺敵人後該題不結算流血，換關清除負面狀態。</li>
    <li>迷霧使每題時限減少 8 秒，至少保留 8 秒。</li>
    <li>擊敗敵人後三選一強化；打倒第六關暗黑魔王就獲勝。</li>
    <li>Tab 切換選項、Enter 作答。離開這場戰鬥不保留進度。</li>
  </ul>;
}

export function BattleControls({ root, paused }: { root: RefObject<HTMLDivElement | null>; paused: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [music, setMusic] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [root]);
  useEffect(() => {
    const element = audio.current!;
    let active = true;
    const stop = () => element.pause();
    const sync = () => {
      if (!music || paused || document.hidden) stop();
      else { element.volume = .25; void element.play().catch(() => { if (active) { setMusic(false); setError('音樂未能播放，可再按一次開啟音樂。'); } }); }
    };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => { active = false; stop(); document.removeEventListener('visibilitychange', sync); };
  }, [music, paused]);
  const toggleFullscreen = async () => {
    setError('');
    try {
      if (document.fullscreenElement === root.current) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setError('此瀏覽器不支援全螢幕，仍可正常遊玩。');
    } catch { setError('無法切換全螢幕，仍可正常遊玩。'); }
  };
  return <div className="mr-controls"><audio ref={audio} src={`${import.meta.env.BASE_URL}assets/audio/music.mp3`} preload="none" loop />
    <button onClick={() => { setError(''); setMusic(value => !value); }} aria-pressed={music}>{music ? '關閉音樂' : '開啟音樂'}</button>
    <button onClick={() => void toggleFullscreen()}>{fullscreen ? '離開全螢幕' : '全螢幕'}</button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
