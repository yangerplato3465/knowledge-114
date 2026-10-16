import { lazy, Suspense } from 'react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Icon } from '../components/Icon';

const MiloCompanion = lazy(() => import('../components/MiloCompanion').then(module => ({ default: module.MiloCompanion })));

export function App() {
  const base = import.meta.env.BASE_URL;
  return <div className="home-page">
    <a className="skip-link" href="#main">跳至主要內容</a><SiteHeader navigation />
    <main id="main" tabIndex={-1} className="learning-home">
      <section className="home-hero" aria-labelledby="welcome-title">
        <picture className="home-landscape" aria-hidden="true">
          <source media="(max-width: 680px)" srcSet={base + 'assets/images/site/forest-arrival-small.webp'} />
          <img src={base + 'assets/images/site/forest-arrival.webp'} alt="" width="1536" height="1024" fetchPriority="high" />
        </picture>
        <div className="hero-copy">
          <p className="home-eyebrow">暮光森林・學習驛站</p>
          <h1 id="welcome-title">好奇心，<br />是你的<span>小小魔法。</span></h1>
          <p className="hero-description">翻開書頁，提起一盞燈。<br />和米洛一起，讓好奇心帶路。</p>
          <Suspense fallback={<div className="milo-stage-placeholder" aria-hidden="true" />}><MiloCompanion /></Suspense>
        </div>
        <nav className="hero-actions" aria-label="開始學習">
          <a className="world-portal" href={base + 'pages/downloads.html'}><span className="portal-art"><img src={base + 'assets/images/site/library.webp'} alt="" width="256" height="256" /></span><span className="portal-caption"><small>帶走靈感</small><strong>素材下載 <Icon name="download" /></strong></span></a>
          <a className="world-portal world-portal-activities" href={base + 'pages/activities.html'}><span className="portal-art"><img src={base + 'assets/images/site/lantern.webp'} alt="" width="256" height="256" /></span><span className="portal-caption"><small>提燈出發</small><strong>探索學習活動 <Icon name="arrow" /></strong></span></a>
        </nav>
      </section>
      <p className="home-note"><span>慢慢來，我們一起探索。</span><span>每個新發現，都是森林裡的一點光。</span></p>
    </main><SiteFooter />
  </div>;
}
