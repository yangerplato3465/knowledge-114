import { useState } from 'react';
import { ThemeSelect } from '../features/theme/ThemeProvider';
import { categories, type Activity } from '../content/navigation';
import { Disclosure } from '../components/Disclosure';
import { VersionLabel } from '../components/VersionLabel';

function ActivityLinks({ items }: { items: Activity[] }) {
  return <ul className="activity-list">{items.map(item => <li key={item.path}>
    <a className="activity" href={`${import.meta.env.BASE_URL}pages/${item.path}.html`}>
      <span><span className="activity-title">{item.title}</span>{' '}<span className="activity-description">{item.description}</span></span>
      <span aria-hidden="true">→</span>
    </a>
  </li>)}</ul>;
}
export function App() {
  const [openCategory, setCategory] = useState<string | null>(null);
  const [openGroup, setGroup] = useState<string | null>(null);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return <><a className="skip-link" href="#main">跳至主要內容</a>
    <header className="site-header"><a href={`${import.meta.env.BASE_URL}index.html`}>原版首頁</a><ThemeSelect /></header>
    <main id="main" tabIndex={-1} className="hub-card">
      <div className="hub-heading"><img src={`${import.meta.env.BASE_URL}assets/images/logo.webp`} alt="" width="98" height="56" /><h1>大耳狗教學網</h1></div>
      <p className="subtitle">選擇一個主題開始</p><p className="byline">By Anita 老師</p>
      <nav aria-label="課程與活動" className="category-list">{categories.map(category =>
        <Disclosure key={category.id} id={category.id} title={category.title} description={category.description}
          open={openCategory === category.id} onToggle={() => setCategory(openCategory === category.id ? null : category.id)}>
          {category.groups ? category.groups.map(group =>
            <Disclosure key={group.id} id={group.id} title={group.title} nested
              open={openGroup === group.id} onToggle={() => setGroup(openGroup === group.id ? null : group.id)}>
              <ActivityLinks items={group.items} />
            </Disclosure>) : <ActivityLinks items={category.items!} />}
        </Disclosure>
      )}</nav>
    </main>
    <footer><VersionLabel />{local && <aside className="dev-tools" aria-label="開發工具"><p>開發工具（僅 localhost 顯示）</p>
      <a href={`${import.meta.env.BASE_URL}pages/math-rpg-pixi-spike.html`}>數學勇者 · Pixi 角色 Spike</a>
    </aside>}</footer>
  </>;
}

