import { VersionLabel } from './VersionLabel';

export function SiteFooter() {
  return <footer className="site-footer">
    <span>暮光森林學習驛站 <span aria-hidden="true">·</span> Anita 老師</span>
    <div><a href={import.meta.env.BASE_URL + 'pages/teacher-tools.html'}>老師工具</a><VersionLabel /></div>
  </footer>;
}
