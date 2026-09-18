import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { ActivityTrail } from './ActivityTrail';

export function PageLayout({ children, current, activityTitle, header }: {
  children: ReactNode; current?: 'downloads'; activityTitle?: string; header?: ReactNode;
}) {
  return <><a className="skip-link" href="#main">跳至主要內容</a>
    {header ?? <SiteHeader navigation current={current} />}
    {activityTitle && <ActivityTrail title={activityTitle} />}
    <main id="main" tabIndex={-1}>{children}</main>
    <SiteFooter />
  </>;
}
