import { ThemeSelect } from '../features/theme/ThemeProvider';
import { Icon } from './Icon';

export function SiteHeader({ home = false, navigation = false, current }: {
  home?: boolean; navigation?: boolean; current?: 'activities' | 'downloads';
}) {
  const base = import.meta.env.BASE_URL;
  return <header className={'site-header' + (navigation ? ' public-header' : '')}>
    <a className="site-brand" href={base + 'index.html'}>
      <span className="brand-mark"><Icon name={home ? 'book' : 'back'} /></span>
      <span><strong>大耳狗教學網</strong><small>{home ? '陪孩子一起探索' : '回到學習主頁'}</small></span>
    </a>
    {navigation && <nav className="public-nav" aria-label="主要導覽">
      <a href={base + 'pages/activities.html'} aria-current={current === 'activities' ? 'page' : undefined}>學習活動</a>
      <a className="nav-download" href={base + 'pages/downloads.html'} aria-current={current === 'downloads' ? 'page' : undefined}><Icon name="download" />素材下載</a>
    </nav>}
    <ThemeSelect />
  </header>;
}
