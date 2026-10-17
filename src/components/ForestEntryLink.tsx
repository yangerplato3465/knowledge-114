import { useId, type ReactNode } from 'react';
import { ForestArt, type ForestObject } from './ForestArt';
import { Icon, type IconName } from './Icon';

export function ForestEntryLink({ href, title, description, artwork, action, icon = 'arrow', className = '', download, label }: {
  href: string; title: string; description: ReactNode; artwork: ForestObject; action: string;
  icon?: IconName; className?: string; download?: string; label?: string;
}) {
  const id = useId();
  return <a className={'forest-entry ' + className} href={href} download={download} aria-label={label ?? title} aria-describedby={id}>
    <span className="forest-entry-art"><ForestArt name={artwork} /></span>
    <span className="forest-entry-copy"><strong className="forest-entry-title">{title}</strong><span className="forest-entry-description" id={id}>{description}</span></span>
    <span className="forest-entry-action" aria-hidden="true">{action}<Icon name={icon} /></span>
  </a>;
}
