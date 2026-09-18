import { VersionLabel } from './VersionLabel';

export function SiteFooter() {
  return <footer className="site-footer">
    <span>大耳狗教學網 · By Anita 老師</span>
    <div><a href={import.meta.env.BASE_URL + 'pages/teacher-tools.html'}>老師工具</a><VersionLabel /></div>
  </footer>;
}
