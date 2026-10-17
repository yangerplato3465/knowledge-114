import { useEffect, useRef, useState } from 'react';
import { ForestArt } from '../components/ForestArt';
import { Icon } from '../components/Icon';
import { artworkForActivity } from '../components/ResourceLinks';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { categories, type ActivityCategory } from '../content/navigation';
import atlasImage from '../../assets/images/site/star-atlas.webp';

function categoryFromHash() {
  const id = window.location.hash.slice(1);
  return categories.find(category => category.id === id) || null;
}

export function Activities() {
  const [activeCategory, setActiveCategory] = useState<ActivityCategory | null>(categoryFromHash);
  const [query, setQuery] = useState('');
  const [mobileFocus, setMobileFocus] = useState(categories[0].id);
  const [zoomCategory, setZoomCategory] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusHeading = useRef(false);
  const zoomTimer = useRef<number | null>(null);

  useEffect(() => {
    const syncFromUrl = () => {
      if (window.location.hash === '#main') return;
      if (zoomTimer.current !== null) window.clearTimeout(zoomTimer.current);
      zoomTimer.current = null;
      setZoomCategory(null);
      shouldFocusHeading.current = true;
      setActiveCategory(categoryFromHash());
      setQuery('');
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
      if (zoomTimer.current !== null) window.clearTimeout(zoomTimer.current);
    };
  }, []);

  useEffect(() => {
    if (shouldFocusHeading.current) {
      headingRef.current?.focus();
      shouldFocusHeading.current = false;
    }
  }, [activeCategory]);

  const navigate = (category: ActivityCategory | null) => {
    if (zoomTimer.current !== null) window.clearTimeout(zoomTimer.current);
    zoomTimer.current = null;
    setZoomCategory(null);
    window.history.pushState(null, '', category ? '#' + category.id : window.location.pathname + window.location.search);
    shouldFocusHeading.current = true;
    setActiveCategory(category);
    setQuery('');
  };

  const enterConstellation = (category: ActivityCategory) => {
    if (zoomTimer.current !== null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { navigate(category); return; }
    setZoomCategory(category.id);
    zoomTimer.current = window.setTimeout(() => navigate(category), 700);
  };

  const visibleActivities = activeCategory?.items.filter(item =>
    (item.title + ' ' + item.description).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  ) || [];

  return <><a className="skip-link" href="#main">跳至主要內容</a><SiteHeader navigation current="activities" />
    <main id="main" className="star-atlas" tabIndex={-1}>
      {!activeCategory ? <section className={'star-sky star-focus-' + mobileFocus + (zoomCategory ? ' is-zooming star-zoom-' + zoomCategory : '')} aria-labelledby="sky-title">
        <div className="star-sky-copy"><p className="star-eyebrow">暮光森林 · 學習活動</p><h1 id="sky-title" ref={headingRef} tabIndex={-1}>星燈星圖</h1>
          <p>今晚，想循著哪一束光出發？</p><span className="star-sky-hint">選個星座，找一項想探索的活動。</span></div>
        <div className="star-chart"><img className="star-sky-art" src={atlasImage} alt="" aria-hidden="true" width="1536" height="1024" fetchPriority="high" />
        <div className="star-choices" role="group" aria-label="活動星座">{categories.map(category => <button key={category.id} type="button"
          className={'star-choice star-choice-' + category.id + (mobileFocus === category.id ? ' is-mobile-active' : '')} onClick={() => enterConstellation(category)}>
          <span className="star-choice-caption"><strong className="star-choice-name">{category.starName}</strong>
            <span className="star-choice-subtitle">{category.title}</span><span className="star-choice-count">{category.items.length} 個活動 <span aria-hidden="true">↗</span></span></span>
        </button>)}</div>
        <div className="star-mobile-nav" role="group" aria-label="選擇星座">{categories.map(category => <button key={category.id} type="button" aria-pressed={mobileFocus === category.id}
          onClick={() => setMobileFocus(category.id)}>{category.starName}</button>)}</div>
        </div>
        <div className="star-sky-foot" aria-hidden="true">✦　循著星光，找找今天的新發現　✦</div>
      </section> : <section className="star-interior" aria-labelledby="constellation-title">
        <div className="star-interior-head"><button type="button" className="star-back" onClick={() => navigate(null)}>← 返回星圖</button>
          <span className="star-interior-marker">星燈星圖 / {activeCategory.starName}</span></div>
        <div className="star-interior-title"><p className="star-eyebrow">{activeCategory.title}</p>
          <h1 id="constellation-title" ref={headingRef} tabIndex={-1}>{activeCategory.starName}</h1><p>{activeCategory.description}</p></div>
        <div className="star-journal" role="region" aria-label="活動目錄">
          <div className="star-journal-head"><span aria-hidden="true">✦</span><div><p>活動目錄</p><h2>選一項活動，開始探索</h2></div><span className="star-journal-count">{activeCategory.items.length} 個活動</span></div>
            {activeCategory.items.length > 6 && <label className="star-search">尋找活動<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="輸入活動名稱或內容" /></label>}
            <ul className="star-activity-list">{visibleActivities.map((item, index) => <li key={item.path}>
              <a className="star-activity" href={import.meta.env.BASE_URL + 'pages/' + item.path + '.html'} aria-labelledby={'activity-title-' + item.path} aria-describedby={'activity-description-' + item.path}>
                <span className="star-activity-art"><ForestArt name={artworkForActivity(item.path)} /></span>
                <span className="star-activity-text"><span className="star-activity-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><strong id={'activity-title-' + item.path}>{item.title}</strong><small id={'activity-description-' + item.path}>{item.description}</small></span>
                <span className="star-activity-enter" aria-hidden="true">進入活動 <Icon name="arrow" /></span>
              </a>
            </li>)}</ul>
            {visibleActivities.length === 0 && <p className="star-empty">找不到符合的活動，試試其他關鍵字。</p>}
        </div>
      </section>}
    </main><SiteFooter />
  </>;
}
