import { ThemeSelect } from '../features/theme/ThemeProvider';
import { teacherTools } from '../content/teacherTools';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';
import '../styles/teacher-navigation.css';

export function TeacherHeader({ current }: { current?: 'upload' | 'class-rpg' | 'detective-admin' }) {
  const base = import.meta.env.BASE_URL;
  return <header className="teacher-header">
    <div className="site-header">
      <a className="site-brand" href={base + 'pages/teacher-tools.html'} aria-current={current ? undefined : 'page'}>
        <span className="brand-mark"><BrandMark /></span>
        <span><strong>老師工作室</strong><small>{current ? '暮光森林 · 回老師工具總覽' : '暮光森林 · 備課與分享'}</small></span>
      </a>
      <div className="teacher-header-actions"><a href={base + 'index.html'}>學生首頁<Icon name="arrow" /></a><ThemeSelect /></div>
    </div>
    {current && <nav className="teacher-nav" aria-label="老師工具切換">
      {teacherTools.map(tool => <a key={tool.path} href={`${base}pages/${tool.path}.html`} aria-current={current === tool.path ? 'page' : undefined}>{tool.title}</a>)}
    </nav>}
  </header>;
}
