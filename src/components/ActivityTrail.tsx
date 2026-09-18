import { Icon } from './Icon';
import '../styles/activity-trail.css';

export function ActivityTrail({ title }: { title: string }) {
  return <nav className="activity-trail" aria-label="目前位置">
    <a href={`${import.meta.env.BASE_URL}pages/activities.html`}><Icon name="back" />回學習活動</a>
    <span aria-hidden="true">/</span><span aria-current="page">{title}</span>
  </nav>;
}
