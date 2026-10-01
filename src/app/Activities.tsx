import { ForestAtmosphere } from '../components/ForestArt';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ResourceLinks } from '../components/ResourceLinks';
import { categories } from '../content/navigation';

export function Activities() {
  return <><a className="skip-link" href="#main">跳至主要內容</a><SiteHeader navigation current="activities" />
    <main id="main" className="directory-page" tabIndex={-1}><ForestAtmosphere />
      <div className="directory-intro forest-intro"><div><p className="page-kicker">森林探索手帖</p><h1>學習活動</h1><p className="page-lead">選一條好奇的小徑，<br />讓今天多一個新發現。</p></div></div>
      <nav className="directory-tabs" aria-label="活動分類">{categories.map(category => <a key={category.id} href={'#' + category.id}>{category.title}</a>)}</nav>
      <div className="directory-sections">{categories.map(category => <section className="directory-section" key={category.id} id={category.id} aria-labelledby={category.id + '-title'}>
        <div className="category-heading"><span className="category-number" aria-hidden="true">{String(categories.indexOf(category) + 1).padStart(2, '0')}</span><h2 id={category.id + '-title'}>{category.title}</h2><p>{category.description}</p></div><ResourceLinks items={category.items} />
      </section>)}</div>
    </main><SiteFooter />
  </>;
}
