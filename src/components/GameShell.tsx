import type { ReactNode } from 'react';
export function GameShell({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} className="game-shell"><h2>{title}</h2>{children}</section>;
}
