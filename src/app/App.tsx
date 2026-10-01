import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Icon } from '../components/Icon';

export function App() {
  const base = import.meta.env.BASE_URL;
  return <div className="home-page">
    <a className="skip-link" href="#main">跳至主要內容</a><SiteHeader home navigation />
    <main id="main" tabIndex={-1} className="learning-home">
      <section className="home-hero" aria-labelledby="welcome-title">
        <picture className="home-landscape" aria-hidden="true">
          <source media="(max-width: 680px)" srcSet={base + 'assets/images/site/forest-arrival-small.webp'} />
          <img src={base + 'assets/images/site/forest-arrival.webp'} alt="" width="1536" height="1024" fetchPriority="high" />
        </picture>
        <div className="hero-copy">
          <p className="home-eyebrow">暮光森林・學習驛站</p>
          <h1 id="welcome-title">好奇心，<br />是你的<span>小小魔法。</span></h1>
          <p className="hero-description">翻開一本書，或提起一盞燈。<br />和米洛一起，發現日常裡的新故事。</p>
          <div className="forest-welcome"><img src={base + 'assets/images/site/milo.webp'} alt="米洛，暮光森林的工坊學徒" width="320" height="320" /><p>今天想往哪裡走？<small>米洛在這裡陪你。</small></p></div>
        </div>
        <nav className="hero-actions" aria-label="開始學習">
          <a className="world-portal" href={base + 'pages/downloads.html'}><img src={base + 'assets/images/site/library.webp'} alt="" width="256" height="256" /><span><small>翻開靈感</small><strong>素材下載 <Icon name="download" /></strong></span></a>
          <a className="world-portal" href={base + 'pages/activities.html'}><img src={base + 'assets/images/site/lantern.webp'} alt="" width="256" height="256" /><span><small>點亮好奇</small><strong>探索學習活動 <Icon name="arrow" /></strong></span></a>
        </nav>
      </section>
      <p className="home-note">慢慢想，也很好。每個發現，都能讓森林亮一點。</p>
    </main><SiteFooter />
  </div>;
}
