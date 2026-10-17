import { lazy, Suspense } from 'react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ForestEntryLink } from '../components/ForestEntryLink';

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
          <ForestEntryLink className="home-entry" href={base + 'pages/downloads.html'} artwork="library" title="素材下載" description="找找課堂需要的教材與素材。" action="尋找素材" icon="download" />
          <ForestEntryLink className="home-entry" href={base + 'pages/activities.html'} artwork="lantern" title="學習活動" description="選一個星座，開始實驗、解謎與冒險。" action="探索活動" />
        </nav>
      </section>
      <p className="home-note"><span>慢慢來，我們一起探索。</span><span>每個新發現，都是森林裡的一點光。</span></p>
    </main><SiteFooter />
  </div>;
}
