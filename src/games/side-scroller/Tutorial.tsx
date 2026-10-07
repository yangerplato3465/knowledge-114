import { useEffect, useRef, useState } from 'react';
import { TutorialDemo } from './TutorialDemo';

const pages = [
  { title: '歡迎來到魔法禁書庫', eyebrow: '陪米洛找到出口', body: '米洛會一直向前跑。跳過缺口，穿過小徑，碰到傳送門就過關！', hint: '空白鍵、↑、W 或「跳躍」起跳。落地後才能再跳；掉落會回到最近的落腳處。' },
  { title: '點亮，才站得穩', eyebrow: '同色地板，點燈就能踩', body: '紅地板開紅燈，藍地板開藍燈。沒點對顏色就會掉下去；普通地板隨時能踩。', hint: '按 1 或「紅燈」、2 或「藍燈」切換開關。遇到換色路段，先跳起來再換燈。' },
  { title: '兩盞燈，一起亮', eyebrow: '紅 ＋ 藍 ＝ 紫', body: '兩盞燈一起亮，就能踩紫地板。此時紅、藍地板都不能踩。', hint: '每盞燈按一下開、再按一下關。關掉其中一盞，就會回到另一盞燈的顏色。' },
];
const crossroadsPage = { title: '淡化方塊，選擇岔路', eyebrow: '四、五星的新挑戰', body: '遇到空中方塊，點亮同色燈就能穿過。沒點對顏色，撞上就會掉落。', hint: '下路平台較寬；提早起跳能走上路，挑戰連跳換燈。兩條路都通往出口。' };
export function Tutorial({ initial, onClose, onStart }: { initial: boolean; onClose(): void; onStart(): void }) {
  const contents = [...pages, crossroadsPage];
  const lastPage = contents.length - 1;
  const [page, setPage] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const element = dialog.current!;
    if (typeof element.showModal === 'function') element.showModal(); else element.setAttribute('open', '');
    return () => { if (typeof element.close === 'function') element.close(); };
  }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [page]);
  return <dialog className="ss-manual" ref={dialog} aria-labelledby="ss-manual-title" aria-describedby="ss-manual-body"
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'ArrowRight') { event.preventDefault(); setPage(value => Math.min(lastPage, value + 1)); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); setPage(value => Math.max(0, value - 1)); }
    }}>
    <img className="ss-manual-frame" src={`${import.meta.env.BASE_URL}assets/images/side-scroller/manual-frame-v1.webp`} alt="" aria-hidden="true" />
    <div className="ss-manual-content">
      <div className="ss-manual-top"><span>旅人手冊 · {page + 1} / {contents.length}</span><button type="button" onClick={onClose}>{initial ? '先看世界' : '返回遊戲'}</button></div>
      <div className="ss-manual-window" onPointerDown={event => {
        if (event.pointerType === 'touch' && !(event.target as HTMLElement).closest('button')) swipe.current = { x: event.clientX, y: event.clientY };
      }} onPointerUp={event => {
        const start = swipe.current; swipe.current = null; if (!start) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) setPage(value => Math.max(0, Math.min(lastPage, value + (dx < 0 ? 1 : -1))));
      }} onPointerCancel={() => { swipe.current = null; }}>
        <div key={page} className="ss-manual-page">
          <p className="ss-manual-eyebrow">{contents[page].eyebrow}</p>
          <h2 id="ss-manual-title" tabIndex={-1} ref={heading}>{contents[page].title}</h2>
          <p id="ss-manual-body">{contents[page].body}</p>
          <TutorialDemo page={page} />
          <p className="ss-manual-hint">{contents[page].hint}</p>
        </div>
      </div>
      <nav className="ss-manual-nav" aria-label="手冊翻頁">
        <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>上一頁</button>
        <div className="ss-manual-pages" aria-label={`第 ${page + 1} 頁，共 ${contents.length} 頁`}><span className="ss-manual-page-count">{page + 1} / {contents.length}</span>{contents.map((_, i) => <button type="button" key={i} aria-label={`前往第 ${i + 1} 頁`} aria-current={page === i ? 'page' : undefined} onClick={() => setPage(i)}>{i + 1}</button>)}</div>
        {page < lastPage ? <button className="ss-manual-next" type="button" onClick={() => setPage(value => value + 1)}>下一頁</button> : <button className="ss-manual-next" type="button" onClick={initial ? onStart : onClose}>{initial ? '開始冒險' : '返回遊戲'}</button>}
      </nav>
    </div>
  </dialog>;
}
