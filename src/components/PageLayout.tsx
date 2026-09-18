import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function PageLayout({ children, current }: { children: ReactNode; current?: 'downloads' }) {
  return <><a className="skip-link" href="#main">跳至主要內容</a>
    <SiteHeader navigation current={current} />
    <main id="main" tabIndex={-1}>{children}</main>
    <SiteFooter />
  </>;
}
