import { useEffect, useRef, useState, type RefObject } from 'react';
import { createBattleGraphics } from './pixiLayers';
import type { BattleSnapshot } from './session';

export function PixiBattle({ snapshot, stage, card }: { snapshot: BattleSnapshot; stage: RefObject<HTMLDivElement | null>; card: RefObject<HTMLDivElement | null> }) {
  const active = useRef<ReturnType<typeof createBattleGraphics> | null>(null);
  const latest = useRef(snapshot);
  const [status, setStatus] = useState('角色特效載入中；答題不受影響。');
  useEffect(() => { latest.current = snapshot; active.current?.update(snapshot); }, [snapshot]);
  useEffect(() => {
    const root = stage.current!, parent = card.current!;
    if (new URLSearchParams(location.search).has('nopixi')) { setStatus('已使用基本角色顯示。'); return; }
    const hero = root.querySelector<HTMLElement>('[data-character="hero"]')!;
    const enemy = root.querySelector<HTMLElement>('[data-character="enemy"]')!;
    const battle = document.createElement('div'), overlay = document.createElement('div');
    battle.className = 'mr-battle-canvas'; overlay.className = 'mr-overlay-canvas';
    root.append(battle); parent.append(overlay);
    const graphics = createBattleGraphics({ battle, overlay, hero, enemy });
    active.current = graphics;
    let disposed = false;
    void graphics.mount().then(ready => {
      if (!disposed && ready) {
        graphics.update(latest.current); root.classList.add('mr-pixi-ready'); setStatus('Pixi 角色與傷害文字已啟用。');
      }
    }).catch(() => {
      if (!disposed) { root.classList.remove('mr-pixi-ready'); setStatus('特效無法載入，已使用基本角色顯示，可繼續答題。'); }
    });
    return () => {
      disposed = true; active.current = null; graphics.destroy();
      root.classList.remove('mr-pixi-ready'); battle.remove(); overlay.remove();
    };
  }, [stage, card]);
  return <p className="mr-renderer-status">{status}</p>;
}
