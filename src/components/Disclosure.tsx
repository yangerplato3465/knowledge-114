import type { ReactNode } from 'react';
export function Disclosure({ id, title, description, open, onToggle, nested = false, children }: {
  id: string; title: string; description?: string; open: boolean;
  onToggle: () => void; nested?: boolean; children: ReactNode;
}) {
  const Heading = nested ? 'h3' : 'h2';
  return <section className={nested ? 'subgroup' : 'category'}>
    <Heading><button type="button" className="category-head" id={`${id}-button`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle}>
      <span><span className="category-title">{title}</span>{description && <> <span className="category-description">{description}</span></>}</span>
      <span className="chevron" aria-hidden="true">{open ? '−' : '+'}</span>
    </button></Heading>
    <div id={`${id}-panel`} hidden={!open} aria-labelledby={`${id}-button`} className="category-panel">{children}</div>
  </section>;
}

