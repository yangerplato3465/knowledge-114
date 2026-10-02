import '../styles/activity-trail.css';

export type ActivityCategoryId = 'science' | 'games' | 'detective';
const starNames: Record<ActivityCategoryId, string> = { science: '觀察座', games: '冒險座', detective: '線索座' };

export function ActivityTrail({ title, category, status }: { title: string; category: ActivityCategoryId; status?: string }) {
  return <nav className="activity-trail" aria-label="目前位置">
    <a href={`${import.meta.env.BASE_URL}pages/activities.html#${category}`}>← 回{starNames[category]}</a>
    <strong aria-current="page">{title}</strong>
    {status && <span className="activity-trail-status">{status}</span>}
  </nav>;
}
