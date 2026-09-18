import { Icon } from './Icon';
import type { Activity } from '../content/navigation';

export function ResourceLinks({ items }: { items: Activity[] }) {
  return <ul className="resource-list">{items.map(item => <li key={item.path}>
    <a href={import.meta.env.BASE_URL + 'pages/' + item.path + '.html'}>
      <span><strong>{item.title}</strong><span>{item.description}</span></span><Icon name="arrow" />
    </a>
  </li>)}</ul>;
}
