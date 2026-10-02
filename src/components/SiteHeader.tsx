import type { MouseEventHandler } from 'react';
import { ThemeSelect } from '../features/theme/ThemeProvider';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';

export function SiteHeader({ navigation = false, current, onNavigate }: {
  navigation?: boolean; current?: 'activities' | 'downloads'; onNavigate?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const base = import.meta.env.BASE_URL;
  return <header className={'site-header' + (navigation ? ' public-header' : '')}>
    <a className="site-brand" href={base + 'index.html'} onClick={onNavigate}>
      <span className="brand-mark"><BrandMark /></span>
      <span><strong>暮光森林</strong><small>學習驛站</small></span>
    </a>
    {navigation && <nav className="public-nav" aria-label="主要導覽">
      <a href={base + 'pages/activities.html'} onClick={onNavigate} aria-current={current === 'activities' ? 'page' : undefined}>學習活動</a>
      <a className="nav-download" href={base + 'pages/downloads.html'} onClick={onNavigate} aria-current={current === 'downloads' ? 'page' : undefined}><Icon name="download" />素材下載</a>
    </nav>}
    <ThemeSelect />
  </header>;
}
