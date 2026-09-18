import { PageLayout } from '../../components/PageLayout';
import { Icon } from '../../components/Icon';
import '../../styles/maintenance.css';

export function MathRpg() {
  return <PageLayout activityTitle="數學勇者">
    <section className="hub-card maintenance-page" aria-labelledby="math-title">
      <p className="page-kicker">暫停開放</p>
      <h1 id="math-title">數學勇者</h1>
      <h2>維護中</h2>
      <p className="page-lead">遊戲玩法與畫面正在重新設計。<br />這段時間，先探索其他有趣的學習活動吧。</p>
      <a className="maintenance-link" href={`${import.meta.env.BASE_URL}pages/activities.html`}>探索其他學習活動<Icon name="arrow" /></a>
    </section>
  </PageLayout>;
}
