import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Icon } from '../components/Icon';

export function App() {
  const base = import.meta.env.BASE_URL;
  return <div className="home-page">
    <a className="skip-link" href="#main">跳至主要內容</a><SiteHeader home navigation />
    <main id="main" tabIndex={-1} className="learning-home">
      <section className="home-hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="home-eyebrow">Anita 老師的學習工作室</p>
          <h1 id="welcome-title">把好奇心，<br />帶進今天的課堂。</h1>
          <p className="hero-description">從一個小問題，開始一場新發現。<br />動手實驗、動腦解謎，讓學習更有趣。</p>
          <nav className="hero-actions" aria-label="開始學習">
            <a className="primary-link" href={base + 'pages/downloads.html'}><Icon name="download" />素材下載</a>
            <a className="secondary-link" href={base + 'pages/activities.html'}>探索學習活動<Icon name="arrow" /></a>
          </nav>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-notebook"><span>今天的探索筆記</span><Icon name="book" /><i /><i /><i /></div>
          <div className="art-signature"><img src={base + 'assets/images/logo.webp'} alt="" width="98" height="56" /><span>一起發現，一起長大。</span></div>
        </div>
      </section>
      <p className="home-note">為課堂裡的每一份好奇，準備一點靈感。</p>
    </main>
    <SiteFooter />
  </div>;
}
