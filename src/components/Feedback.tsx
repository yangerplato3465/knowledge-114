import type { ReactNode } from 'react';

export function LoadingStatus({ id, children, className = 'state' }: { id?: string; children: ReactNode; className?: string }) {
  return <p id={id} className={className} role="status">{children}</p>;
}

export function ToastRegion({ id = 'toast' }: { id?: string }) {
  return <div id={id} className="toast" role="status" aria-live="polite" />;
}

/** 保留原生 dialog 的 focus／Escape 行為；內容可由 React 或相容 adapter 提供。 */
export function ModalFrame({ id, titleId, children }: { id: string; titleId: string; children: ReactNode }) {
  return <dialog id={id} aria-labelledby={titleId}>{children}</dialog>;
}
