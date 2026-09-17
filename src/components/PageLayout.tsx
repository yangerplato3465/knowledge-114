import type { ReactNode } from 'react';
import { ThemeSelect } from '../features/theme/ThemeProvider';

export function PageLayout({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#main">跳至主要內容</a>
    <header className="site-header"><a href={`${import.meta.env.BASE_URL}next/index.html`}>回到學習主頁</a><ThemeSelect /></header>
    <main id="main" tabIndex={-1}>{children}</main>
  </>;
}
