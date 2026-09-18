export function LessonNav({ items }: { items: { id: string; label: string }[] }) {
  return <nav className="lesson-nav" aria-label="教材章節"><span>課堂路線</span>{items.map((item, i) =>
    <a key={item.id} href={`#${item.id}`}><span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{item.label}</a>
  )}</nav>;
}
