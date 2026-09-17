import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const getSnapshot = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia(query).matches : true;
const getServerSnapshot = () => true;

function subscribe(notify: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

/** 無媒體查詢能力時，保守停用裝飾動畫；不影響遊戲規則或計時。 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
