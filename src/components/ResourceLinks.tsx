import { Icon } from './Icon';
import type { Activity } from '../content/navigation';
import { ForestArt, type ForestObject } from './ForestArt';

const artwork: Record<string, ForestObject> = {
  'water-acid-base': 'science', 'magic-ink': 'ledger', 'math-rpg': 'adventure',
  'magic-workshop': 'science', 'side-scroller': 'adventure', 'detective-golden-owl': 'key', 'detective-new': 'key',
  upload: 'library', 'class-rpg': 'ledger', 'detective-admin': 'key',
};

export function artworkForActivity(path: string): ForestObject {
  return artwork[path] || 'library';
}

export function ResourceLinks({ items }: { items: Activity[] }) {
  return <ul className="resource-list">{items.map(item => <li key={item.path}>
    <a href={import.meta.env.BASE_URL + 'pages/' + item.path + '.html'}>
      <ForestArt name={artworkForActivity(item.path)} />
      <span><strong>{item.title}</strong><span>{item.description}</span></span><Icon name="arrow" />
    </a>
  </li>)}</ul>;
}
