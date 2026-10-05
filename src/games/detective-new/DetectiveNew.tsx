import { useEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { ActivityTrail } from '../../components/ActivityTrail';
import { createDetectiveScene, type DetectiveScene } from './scene';
import './detective-new.css';

export function DetectiveNew() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<DetectiveScene | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [dialogueOpen, setDialogueOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus('loading');
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    void createDetectiveScene(host.current!, controller.signal, open => {
      if (active) setDialogueOpen(open);
    }).then(created => {
      if (!active || controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout);
      scene.current = created;
      created.setInventory([]);
      created.setDialogue(null);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => {
      active = false; controller.abort(); window.clearTimeout(timeout);
      scene.current?.destroy(); scene.current = null;
    };
  }, [attempt]);

  return <><SiteHeader navigation current="activities" />
    <ActivityTrail title="新偵探遊戲" category="detective" status="框架建置中" />
    <main className="dn-game" aria-label="新偵探遊戲框架">
      <div className="dn-rotated">
        <div className="dn-stage">
          <div ref={host} className="dn-pixi-host" aria-hidden="true" />
          <a className="dn-mobile-back" href={`${import.meta.env.BASE_URL}pages/activities.html#detective`}>← 回線索座</a>
          {status !== 'ready' && <div className="dn-loading" role="status">
            <p>{status === 'loading' ? '正在準備調查場景…' : '場景載入失敗，請重試。'}</p>
            {status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重新載入</button>}
          </div>}
          {status === 'ready' && <div className="dn-accessibility">
            <button type="button" aria-expanded={dialogueOpen} onFocus={() => scene.current?.focusDialogue(true)}
              onBlur={() => scene.current?.focusDialogue(false)} onClick={() => scene.current?.toggleDialogue()}>
              {dialogueOpen ? '收起對話框' : '展開對話框'}
            </button>
            <p role="status">物品欄目前沒有物品；對話框目前沒有內容。</p>
          </div>}
        </div>
      </div>
    </main>
  </>;
}
