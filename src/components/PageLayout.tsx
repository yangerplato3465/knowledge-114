import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { ActivityTrail, type ActivityCategoryId } from './ActivityTrail';

export function PageLayout({ children, current, activityTitle, activityCategory, header }: {
  children: ReactNode; current?: 'activities' | 'downloads'; activityTitle?: string; activityCategory?: ActivityCategoryId; header?: ReactNode;
}) {
  return <><a className="skip-link" href="#main">跳至主要內容</a>
    {header ?? <SiteHeader navigation current={current ?? (activityTitle ? 'activities' : undefined)} />}
    {activityTitle && activityCategory && <ActivityTrail title={activityTitle} category={activityCategory} />}
    <main id="main" tabIndex={-1}>{children}</main>
    <SiteFooter />
  </>;
}
