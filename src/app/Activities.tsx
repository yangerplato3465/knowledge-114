import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ResourceLinks } from '../components/ResourceLinks';
import { categories } from '../content/navigation';

export function Activities() {
  return <><a className="skip-link" href="#main">跳至主要內容</a><SiteHeader navigation current="activities" />
    <main id="main" className="directory-page" tabIndex={-1}>
      <div className="directory-intro"><p className="page-kicker">一起探索</p><h1>學習活動</h1><p className="page-lead">選一個感興趣的主題，開始今天的新發現。</p></div>
      <nav className="directory-tabs" aria-label="活動分類">{categories.map(category => <a key={category.id} href={'#' + category.id}>{category.title}</a>)}</nav>
      <div className="directory-sections">{categories.map(category => <section className="directory-section" key={category.id} id={category.id} aria-labelledby={category.id + '-title'}>
        <div><h2 id={category.id + '-title'}>{category.title}</h2><p>{category.description}</p></div><ResourceLinks items={category.items} />
      </section>)}</div>
    </main><SiteFooter />
  </>;
}
