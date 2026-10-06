import { useEffect, useRef, useState } from 'react';
import { TutorialDemo } from './TutorialDemo';

const pages = [
  { title: '歡迎來到魔法禁書庫', eyebrow: '一段找尋出口的冒險', body: '米洛誤入了藏著色彩魔法的神祕空間。幫助他穿過浮空小徑，找出能離開這裡的傳送出口！', hint: '米洛會一直向右跑。按空白鍵、↑、W 或「跳躍」跨過缺口；只能一段跳，落地後才能再跳。碰到終點傳送門就能離開。' },
  { title: '點亮，才站得穩', eyebrow: '用光，讓地板成為道路', body: '點亮紅燈，紅色地板就會變成實體；沒有對應的燈光，地板會透明，踩上去就會掉落。藍色也是一樣。', hint: '按「紅燈 1」或「藍燈 2」切換，再按一次就關閉。不必一直按住；先起跳，再切換下一段地板的顏色。' },
  { title: '兩盞燈，一起亮', eyebrow: '紅色 ＋ 藍色 ＝ 紫色', body: '紅燈與藍燈可以一起開啟，融合成紫色光。這時紫色地板可以站，紅色與藍色地板會透明。', hint: '兩盞燈各自保持開關，可以依序按，也可以雙指同時按。正常地板永遠能站；跌落會回到最近落腳區。' },
];
const crossroadsPage = { title: '消散方塊，選擇岔路', eyebrow: '四星・晶石岔路', body: '直立方塊會擋住跳躍！光色相同時，方塊淡到幾乎透明，就能穿過；光色不同會撞上並掉入洞中。紫色方塊要同時開紅、藍兩燈。', hint: '方塊與地板規則不同：同色方塊消散，同色地板可踩。上下平台同時出現時，下路平台較寬、跳躍較少；提早起跳可走上路，挑戰連跳換色。兩路都通往出口。' };
export function Tutorial({ initial, crossroads = false, onClose, onStart }: { initial: boolean; crossroads?: boolean; onClose(): void; onStart(): void }) {
  const contents = crossroads ? [...pages, crossroadsPage] : pages;
  const lastPage = contents.length - 1;
  const [page, setPage] = useState(crossroads ? 3 : 0);
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
