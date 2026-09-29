import { useEffect, useState } from 'react';

export const OPERATION_MS = 600;
export const RECEIPT_MS = 4800;

export function useMotionAllowed() {
  const [allowed, setAllowed] = useState(() => !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => setAllowed(!media.matches && !document.hidden);
    refresh();
    media.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { media.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return allowed;
}
