import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { PageLayout } from '../../components/PageLayout';
import { actionLabel, applyAction, shortestSolution, type Action } from './rules';
import { currentPuzzle, gameReducer, initialGame, performanceStars, TWO_STAR_ALLOWANCE, type GameState } from './session';
import { DIFFICULTY_SETTINGS, type Difficulty } from './puzzles';
import { WorkshopBackdrop } from './WorkshopBackdrop';
import { WorkbenchEffects } from './WorkbenchEffects';
import { Artwork } from './Artwork';
import { CharacterPortrait } from './CharacterPortrait';
import { GUIDE, GUESTS, artUrl } from './art';
import { useBottleDrag } from './useBottleDrag';
import { freshSeed } from './fresh-seed';
import { useOperationMotion } from './useOperationMotion';
import { DeliveryReceipt, type Receipt } from './DeliveryReceipt';
import { useMotionAllowed } from './motion';
import { useGuestPreload } from './useGuestPreload';
import { useWorkshopAudio } from './useWorkshopAudio';
import './magic-workshop.css';

function stars(count: number): string { return '★'.repeat(count); }

function Performance({ steps, minimumSteps, compact = false }: { steps: number; minimumSteps: number; compact?: boolean }) {
  const rating = performanceStars(steps, minimumSteps);
  return <div className="mw-performance"><strong aria-label={`通關表現 ${rating} 星，共 3 星`}>通關表現 <span className="mw-rating-stars" aria-hidden="true">{[0, 1, 2].map(index => <span key={index} className="mw-rating-star" data-earned={index < rating} style={{ '--star-order': index } as CSSProperties}>{index < rating ? '★' : '☆'}</span>)}</span></strong>
    <span>最短 {minimumSteps} 步{rating === 3 ? '，你做到了！' : '，再試試能不能更少！'}</span>
    {!compact && <details className="mw-help"><summary>怎麼拿星星？</summary><p>三星：{minimumSteps} 步完成。兩星：{minimumSteps + 1}～{minimumSteps + TWO_STAR_ALLOWANCE} 步完成。完成委託至少獲得一星！</p></details>}</div>;
}

function hintFor(game: GameState): string {
  const puzzle = currentPuzzle(game);
  const next = shortestSolution(puzzle, game.amounts)?.[0];
  if (!next) return '目前已經達到目標，可以交付。';
  if (game.hintLevel === 1) {
    if (next.kind === 'empty') return '這一步不一定要保留所有魔力液。想想哪一瓶需要先騰出空間。';
    if (next.kind === 'fill') return '觀察哪些瓶子還能補滿；補滿後再想下一次互倒會停在哪裡。';
    return '試著比較來源瓶剩下的量，與另一瓶還能裝下的量。';
  }
  return `下一步試試看：${actionLabel(next)}。`;
}

function BottleVessel({ amount, capacity }: { amount: number; capacity: number }) {
  return <span className="mw-bottle-vessel" aria-hidden="true"><span className="mw-bottle-mouth" /><span className="mw-bottle-glass"><span className="mw-bottle-liquid" style={{ height: `${amount / capacity * 100}%` }}><span className="mw-liquid-surface" /></span></span><Artwork art="bottle" width={160} height={240} /></span>;
}

function Bottle({ index, capacity, amount, selected, destination, disabled, onClick, handlers, dragging, hovered }: {
  index: number; capacity: number; amount: number; selected: boolean; destination: boolean; disabled: boolean; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handlers: ReturnType<typeof useBottleDrag>['handlers'] extends (index: number) => infer H ? H : never; dragging: boolean; hovered: boolean;
}) {
  return <button type="button" className="mw-bottle" data-selected={selected} data-destination={destination} data-drop={index} data-dragging={dragging} data-hovered={hovered} {...handlers}
    aria-pressed={selected} aria-label={`第 ${index + 1} 瓶，容量 ${capacity} 單位，目前 ${amount} 單位${selected ? '，已選取' : ''}`}
    disabled={disabled} onClick={onClick}>
    <span className="mw-bottle-name">第 {index + 1} 瓶</span>
    <img className="mw-magic-ring" src={artUrl('bottle-magic-ring-v1.png')} alt="" aria-hidden="true" draggable={false} />
    <BottleVessel amount={amount} capacity={capacity} />
    <span className="mw-bottle-amount"><strong>{amount}</strong><span> / {capacity} 單位</span></span>
    <span className="mw-bottle-callout">{disabled ? '準備交付' : selected ? '已選好' : destination ? '倒進這瓶' : '拖曳瓶子'}</span>
  </button>;
}

function Workbench({ game, dispatch }: { game: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  const puzzle = currentPuzzle(game);
  const playing = game.screen === 'playing';
  const selected = game.selected;
  const dnd = useBottleDrag(game, dispatch);
  useOperationMotion(dnd.board, game);
  const source = dnd.drag?.from ?? selected;
  const possible = (action: Action) => source !== null && applyAction(puzzle.capacities, game.amounts, action) !== null;
  const bottleClick = (index: number) => {
    if (!playing) return;
    if (selected === null) dispatch({ type: 'select', index });
    else if (selected === index) dispatch({ type: 'select', index: null });
    else {
      const action: Action = { kind: 'pour', from: selected, to: index };
      if (applyAction(puzzle.capacities, game.amounts, action)) dispatch({ type: 'operate', action });
      else dispatch({ type: 'select', index });
    }
  };
  return <section className="mw-workbench" aria-label="工坊工作桌">
    <div className="mw-workbench-top"><h2>量出剛剛好的魔力液</h2>
      <p className="mw-instruction" role="status">{game.screen === 'ready' ? '剛剛好！把魔力液交給客人吧。'
        : selected === null ? '拖曳瓶子到魔力泉補滿、回收釜倒空，或另一瓶互倒。也可以點選操作。'
          : `第 ${selected + 1} 瓶選好了。可以補滿、倒空，或倒進另一瓶；再點一次可取消。`}</p></div>
    <div className="mw-workbench-grid" ref={dnd.board} data-drag-active={!!dnd.drag}>
      {dnd.drag && <div className="mw-drag-preview" aria-hidden="true" style={{ left: dnd.drag.x, top: dnd.drag.y, width: dnd.drag.width }}><BottleVessel amount={game.amounts[dnd.drag.from]} capacity={puzzle.capacities[dnd.drag.from]} /><span>{dnd.drag.target === null ? '放到發光的位置' : dnd.drag.target === 'spring' ? '放開補滿' : dnd.drag.target === 'recycler' ? '放開倒空' : '放開倒入'}</span></div>}
      <WorkbenchEffects game={game} drag={dnd.drag} />
      <button type="button" className="mw-station mw-spring" data-drop="spring" data-hovered={dnd.drag?.target === 'spring'} disabled={!playing || !possible({ kind: 'fill', from: source ?? -1 })}
        onClick={() => dispatch({ type: 'operate', action: { kind: 'fill', from: selected! } })}>
        <Artwork art="spring" className="mw-station-art" /><strong>魔力泉</strong><span>拖來補滿</span></button>
      <div className="mw-bottles" data-count={puzzle.capacities.length}>
        {puzzle.capacities.map((capacity, index) => <Bottle key={index} index={index} capacity={capacity} amount={game.amounts[index]}
          selected={selected === index} destination={playing && source !== null && source !== index && dnd.valid(source, String(index))}
          disabled={!playing} handlers={dnd.handlers(index)} dragging={dnd.drag?.from === index} hovered={dnd.drag?.target === String(index)} onClick={event => { if (!dnd.consumeClick(event.detail)) bottleClick(index); }} />)}
      </div>
      <button type="button" className="mw-station mw-recycler" data-drop="recycler" data-hovered={dnd.drag?.target === 'recycler'} disabled={!playing || !possible({ kind: 'empty', from: source ?? -1 })}
        onClick={() => dispatch({ type: 'operate', action: { kind: 'empty', from: selected! } })}>
        <Artwork art="recycler" className="mw-station-art" /><strong>回收釜</strong><span>拖來倒空</span></button>
    </div>
    {game.screen === 'ready' && <div className="mw-ready" role="status"><Artwork art="gift" className="mw-ready-gift" /><div><strong>委託完成，準備交付！</strong><span>你用了 {game.history.length} 步完成！</span></div>
      <button className="mw-primary" onClick={() => dispatch({ type: 'deliver' })}>{game.practice ? '完成練習' : game.index === 4 ? '交付並看成果' : '交付，前往下一關'}</button></div>}
    {game.screen === 'ready' && !game.practice && <div className="mw-completion-rating" role="status"><Performance steps={game.history.length} minimumSteps={puzzle.minimumSteps} /></div>}
  </section>;
}

function Session({ game, dispatch, onFullscreen, fullscreen }: {
  game: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]>; onFullscreen: () => void; fullscreen: boolean;
}) {
  const puzzle = currentPuzzle(game);
  const targetBottle = game.amounts.findIndex(amount => amount === puzzle.target);
  const guest = game.practice ? GUIDE : GUESTS[game.index];
  return <>
    <div className="mw-session-bar">
      <div><p className="mw-eyebrow">{game.practice ? '第一次來工坊' : `${DIFFICULTY_SETTINGS[game.difficulty].name}委託 · 第 ${game.index + 1} / 5 關`}</p><h1>{game.practice ? '先試著量一次' : '今天的魔力委託'}</h1></div>
      <div className="mw-session-actions"><button onClick={onFullscreen}>{fullscreen ? '退出全螢幕' : '全螢幕'}</button><button onClick={() => dispatch({ type: 'home' })}>回到工坊首頁</button></div>
    </div>
    {!game.practice && <ol className="mw-progress" aria-label="五關進度">{game.deck.map((item, index) => <li key={item.id} aria-current={index === game.index ? 'step' : undefined} data-current={index === game.index} data-done={index < game.index}><span>第 {index + 1} 關</span><strong>{index < game.index ? '已完成' : index === game.index ? '挑戰中' : '待挑戰'}</strong></li>)}</ol>}
    <section className="mw-commission" aria-label="本關委託">
      <CharacterPortrait art={guest.art} happy={game.screen === 'ready'} />
      <div className="mw-visitor-copy"><p className="mw-eyebrow">{guest.title}</p><strong>{guest.name}</strong><p>{game.screen === 'ready' ? guest.dialogue.ready : guest.dialogue.request}</p></div>
      <div className="mw-commission-target"><span>需要</span><strong>{puzzle.target}</strong><span>單位魔力液</span></div>
      <div className="mw-commission-level"><span>題目難度</span><strong aria-label={game.practice ? '操作練習' : `${puzzle.difficulty} 星難度`}>{game.practice ? '操作練習' : stars(puzzle.difficulty)}</strong></div></section>
    <Workbench game={game} dispatch={dispatch} />
    <div className="mw-lower"><section className="mw-controls" aria-label="輔助操作"><div className="mw-step-count"><span>已用</span><strong>{game.history.length}</strong><span>步</span></div>
      <div className="mw-control-buttons"><button disabled={!game.history.length} onClick={() => dispatch({ type: 'undo' })}>復原一步</button><button disabled={!game.history.length} onClick={() => dispatch({ type: 'restart' })}>重試本關</button><button disabled={game.screen !== 'playing' || game.hintLevel === 2} onClick={() => dispatch({ type: 'hint' })}>{game.hintLevel === 0 ? '想一想提示' : '再給一點提示'}</button></div>
      {game.hintLevel > 0 && <p className="mw-hint" role="status">{hintFor(game)}</p>}
      {game.screen === 'ready' && <p className="mw-achieved">第 {targetBottle + 1} 瓶剛好有 {puzzle.target} 單位！</p>}
    </section>
    <details className="mw-log"><summary>查看操作紀錄（{game.history.length} 步）</summary><ol>{game.history.map((move, index) => <li key={index}>{actionLabel(move.action)}</li>)}</ol></details></div>
  </>;
}

function Home({ difficulty, onDifficulty, onStart, onPractice }: {
  difficulty: Difficulty; onDifficulty: (difficulty: Difficulty) => void; onStart: (seed?: number) => void; onPractice: () => void;
}) {
  const [seedInput, setSeedInput] = useState('');
  return <div className="mw-home"><div className="mw-home-guide"><CharacterPortrait art="guide" /><p>我是{GUIDE.name}，<br />一起開門迎接客人吧！</p></div><div className="mw-home-hero"><p className="mw-eyebrow">歡迎來到魔法工坊</p><h1>量得剛剛好，<br /><em>魔法就會發光。</em></h1>
    <p>補滿、倒空、倒進另一瓶，替客人量出剛剛好的魔力液。今天有五份委託等著你！</p>
    <form onSubmit={event => { event.preventDefault(); onStart(seedInput === '' ? undefined : Number(seedInput)); }}>
      <fieldset className="mw-difficulty"><legend>選擇這一局的難度</legend>
        {([3, 4, 5] as const).map(level => <label key={level} data-selected={difficulty === level}>
          <input type="radio" name="difficulty" value={level} checked={difficulty === level} onChange={() => onDifficulty(level)} />
          <strong>{stars(level)}</strong><span>{DIFFICULTY_SETTINGS[level].name}</span>
        </label>)}</fieldset>
      <p className="mw-difficulty-note">{DIFFICULTY_SETTINGS[difficulty].description}</p>
      <div className="mw-home-actions"><button className="mw-primary" type="submit">開始五關委託</button><button type="button" onClick={onPractice}>先做操作練習</button></div>
      <details className="mw-seed-entry"><summary>我有重玩代碼</summary><label>重玩代碼<input type="number" min="0" max="4294967295" step="1" value={seedInput} onChange={event => setSeedInput(event.target.value)} placeholder="輸入之前保存的代碼" /></label><p>選好原本的難度，再輸入代碼，就能重玩相同的五份委託。</p></details>
    </form></div>
    <details className="mw-help mw-home-help"><summary>怎麼玩？怎麼拿星星？</summary>
      <div className="mw-rule-strip"><article><strong>看清目標</strong><span>讓其中一瓶裝到客人要的量，就能完成委託。</span></article><article><strong>試著倒一倒</strong><span>拖曳瓶子到魔力泉補滿、回收釜倒空，或另一瓶互倒；放到空處不計步。也可以先點選瓶子再點目的地。倒進另一瓶時，會一直倒到一瓶空了或另一瓶滿了。</span></article><article><strong>放心試試</strong><span>想換個方法？可以復原一步、重新挑戰，或看看提示。</span></article></div>
      <p className="mw-home-note">每次補滿、倒空或倒進另一瓶算一步。多試幾步也能完成，交付不加步數。</p>
      <p className="mw-home-note">每關完成後會公布最短步數與通關表現：最短步數完成得三星，多 {TWO_STAR_ALLOWANCE} 步以內得兩星，完成就有一星！復原、重試與提示不額外扣星。</p>
    </details>
  </div>;
}

function Ending({ game, dispatch, onStart }: { game: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]>; onStart: () => void }) {
  if (game.screen === 'practice-done') return <div className="mw-ending"><div className="mw-ending-guide"><CharacterPortrait art="guide" happy /></div><p className="mw-eyebrow">練習成功</p><h1>練習完成，準備接委託！</h1>
    <p>{GUIDE.name}：你已經會操作魔法瓶了，來幫幫工坊的客人吧！</p><div className="mw-home-actions"><button className="mw-primary" onClick={onStart}>開始五關委託</button><button onClick={() => dispatch({ type: 'home' })}>回到工坊首頁</button></div></div>;
  const total = game.results.reduce((sum, result) => sum + result.steps, 0);
  return <div className="mw-ending"><div className="mw-ending-guide"><CharacterPortrait art="guide" happy /><span className="mw-ending-spark" aria-hidden="true">✦</span></div><p className="mw-eyebrow">今日委託全數完成</p><h1>五份委託，都交付了！</h1>
    <p>{GUIDE.name}：謝謝你的幫忙！看看這次收集了幾顆星，再來挑戰自己的步數吧。</p>
    <p className="mw-seed-result">挑戰難度：<strong>{stars(game.difficulty)}</strong></p>
    <ol className="mw-results">{game.results.map((result, index) => <li key={result.puzzleId}><span>第 {index + 1} 關</span><strong>{result.steps} 步</strong><Performance steps={result.steps} minimumSteps={result.minimumSteps} compact /></li>)}</ol>
    <p className="mw-total">這次一共用了 <strong>{total}</strong> 步</p><div className="mw-home-actions"><button className="mw-primary" onClick={() => dispatch({ type: 'start', seed: game.seed, difficulty: game.difficulty })}>再挑戰一次</button><button onClick={onStart}>接新委託</button><button onClick={() => dispatch({ type: 'home' })}>回到工坊首頁</button></div>
    <details className="mw-seed-entry"><summary>保存這次的委託</summary><p>記下難度 {stars(game.difficulty)} 和重玩代碼 <strong>{game.seed}</strong>，下次就能再挑戰。</p></details>
  </div>;
}

export function MagicWorkshop() {
  const [game, reduce] = useReducer(gameReducer, initialGame);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const clearReceipt = useCallback(() => setReceipt(null), []);
  const motion = useMotionAllowed();
  const respondWithSound = useWorkshopAudio();
  useGuestPreload(game);
  const dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> = event => {
    respondWithSound(game, event);
    if (event.type === 'deliver' && game.screen === 'ready') {
      const guest = game.practice ? GUIDE : GUESTS[game.index];
      setReceipt({ ...guest, version: game.effectVersion });
    } else if (event.type !== 'hint' && event.type !== 'select') clearReceipt();
    reduce(event);
  };
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const shell = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const page = game.screen === 'ready' ? 'playing' : game.screen;
  useEffect(() => {
    // Starting from the lower home controls must not leave the new visitor above the viewport.
    const heading = shell.current?.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    if (document.fullscreenElement === shell.current) shell.current?.scrollTo?.({ top: 0 });
    else shell.current?.scrollIntoView?.({ block: 'start' });
  }, [page, game.index, game.practice]);
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.current?.requestFullscreen?.();
  };
  const start = (seed?: number) => dispatch({ type: 'start', seed: seed ?? freshSeed(difficulty), difficulty });
  return <PageLayout activityTitle="魔法工坊"><section ref={shell} className="mw-shell" data-fullscreen={fullscreen} data-screen={game.screen} data-motion={motion}>
    {game.screen === 'home' && <WorkshopBackdrop game={game} />}
    {game.screen === 'home' ? <Home difficulty={difficulty} onDifficulty={setDifficulty} onStart={start} onPractice={() => dispatch({ type: 'practice' })} />
      : game.screen === 'finished' || game.screen === 'practice-done' ? <Ending game={game} dispatch={dispatch} onStart={() => start()} />
        : <Session game={game} dispatch={dispatch} onFullscreen={toggleFullscreen} fullscreen={fullscreen} />}
    {receipt && <DeliveryReceipt key={receipt.version} receipt={receipt} onDone={clearReceipt} />}
  </section></PageLayout>;
}
