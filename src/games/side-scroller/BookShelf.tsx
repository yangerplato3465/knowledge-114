import { useLayoutEffect, useRef } from 'react';
import type { Level } from './model';

export function BookShelf({ difficulty, levels, current, loading, onClose, onSelect }: {
  difficulty: number;
  levels: readonly Level[];
  current: Level;
  loading: boolean;
  onClose(): void;
  onSelect(level: Level): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current!;
    if (typeof element.showModal === 'function') element.showModal(); else element.setAttribute('open', '');
    return () => { if (typeof element.close === 'function') element.close(); };
  }, []);
  return <dialog className="ss-shelf" ref={dialog} aria-labelledby="ss-shelf-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="ss-shelf-heading">
      <div><span className="ss-shelf-eyebrow">魔法禁書庫 · 選一本書</span><h2 id="ss-shelf-title">{difficulty} 星書架</h2>
        <p>每本書藏著一條同星級的路線。選好後先巡覽小徑，再開始冒險。</p></div>
      <button type="button" className="ss-shelf-close" onClick={onClose}>返回遊戲</button>
    </div>
    <div className="ss-shelf-books" role="group" aria-label={`${difficulty} 星關卡`}>
      {levels.map((book, index) => <button className="ss-book" type="button" key={book.id}
        aria-label={`${difficulty} 星第 ${index + 1} 關：${book.name}。${book.focus ?? ''}`}
        aria-current={current.id === book.id ? 'true' : undefined}
        disabled={loading} onClick={() => onSelect(book)}>
        <span className="ss-book-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className="ss-book-mark" aria-hidden="true">✦</span>
        <strong>{book.name}</strong><small>{book.focus}</small>
        <span className="ss-book-status">{current.id === book.id ? '目前路線' : '選這一本'}</span>
      </button>)}
    </div>
    <p className="ss-shelf-footer" role="status">{loading ? '正在展開書頁…' : `共 ${levels.length} 關，可自由選擇`}</p>
  </dialog>;
}
