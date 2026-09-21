import { useEffect, useRef, useState, type RefObject } from 'react';

/** Native fullscreen when available; an isolated viewport overlay otherwise. */
export function useBattleFullscreen(root: RefObject<HTMLElement | null>, onExit: () => void) {
  const [mode, setMode] = useState<'normal' | 'native' | 'window'>('normal');
  const [busy, setBusy] = useState(false);
  const alive = useRef(false), pending = useRef(false), exitCallback = useRef(onExit);
  exitCallback.current = onExit;
  useEffect(() => {
    alive.current = true;
    const element = root.current;
    let wasNative = false;
    const change = () => {
      const native = document.fullscreenElement === element;
      if (native) setMode('native');
      else if (wasNative) { setMode('normal'); exitCallback.current(); }
      wasNative = native;
    };
    document.addEventListener('fullscreenchange', change);
    return () => {
      alive.current = false; document.removeEventListener('fullscreenchange', change);
      if (element && document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
    };
  }, [root]);
  useEffect(() => {
    if (mode !== 'window' || !root.current) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement | null = root.current;
    while (branch?.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) { siblings.push({ element: sibling, inert: sibling.inert }); sibling.inert = true; }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setMode('normal'); exitCallback.current(); }
      if (event.key === 'Tab') {
        const items = [...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled), select, summary, a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (items.length && (index === -1 || event.shiftKey && index === 0 || !event.shiftKey && index === items.length - 1)) {
          event.preventDefault(); items[event.shiftKey ? items.length - 1 : 0].focus();
        }
      }
    };
    window.addEventListener('keydown', keyboard, true);
    return () => {
      window.removeEventListener('keydown', keyboard, true); document.body.style.overflow = originalOverflow;
      siblings.forEach(({ element, inert }) => { element.inert = inert; });
    };
  }, [mode, root]);
  const toggle = async () => {
    const element = root.current;
    if (!element || pending.current) return;
    pending.current = true; setBusy(true);
    try {
      if (mode === 'window') { setMode('normal'); exitCallback.current(); }
      else if (document.fullscreenElement === element) await document.exitFullscreen();
      else if (document.fullscreenEnabled && element.requestFullscreen) {
        try {
          await element.requestFullscreen();
          if (!alive.current && document.fullscreenElement === element) await document.exitFullscreen();
        } catch { if (alive.current) setMode('window'); }
      } else setMode('window');
    } catch {
      // A rejected exit leaves the browser's actual fullscreen state authoritative.
      // The user can retry or use the browser's Escape control.
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  return { active: mode !== 'normal', fallback: mode === 'window', busy, toggle };
}
