import type { Activity } from '../content/navigation';
import type { ForestObject } from './ForestArt';
import { ForestEntryLink } from './ForestEntryLink';

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
    <ForestEntryLink href={import.meta.env.BASE_URL + 'pages/' + item.path + '.html'} artwork={artworkForActivity(item.path)} title={item.title} description={item.description} action="進入工具" />
  </li>)}</ul>;
}
