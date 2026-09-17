import { useEffect, useRef, useState } from 'react';
import { PageLayout } from '../../components/PageLayout';
import { traitOf, UPGRADES } from './model';
import { questionPools, type QuestionPool } from './questions';
import { useBattle } from './useBattle';
import { PixiBattle } from './PixiBattle';
import { BattleControls, BattleDialog, HowTo } from './BattleControls';
import '../../styles/global.css';
import './math-rpg.css';

const enemies = ['暗影小獸', '骨翼渡鴉', '提燈幽魂', '骨龍', '黑騎士', '暗黑魔王'];
function Countdown({ deadline, next = false, paused = false }: { deadline: number | null; next?: boolean; paused?: boolean }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (deadline === null) return;
    const update = () => setLeft(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [deadline]);
  return <span role="timer" aria-live="off">{paused ? '已暫停' : deadline === null ? '回合結算中' : next ? `${left} 秒後繼續` : `剩餘 ${left} 秒`}</span>;
}
function Battle({ pool, title, leave }: { pool: QuestionPool; title: string; leave: () => void }) {
  const { view, answer, upgrade, reset, pause, resume } = useBattle(pool);
  const [dialog, setDialog] = useState<'quit' | 'help' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const phase = view?.snapshot.phase;
  const questionId = view?.snapshot.questionId;
  useEffect(() => {
    if (phase === 'question' || phase === 'upgrade' || phase === 'victory' || phase === 'defeat') heading.current?.focus();
  }, [phase, questionId]);
  if (!view) return <p role="status">準備戰鬥中…</p>;
  const { snapshot, question, feedback } = view;
  const { state } = snapshot;
  const ended = phase === 'victory' || phase === 'defeat';
  const trait = traitOf(state.enemyIndex);
  const openDialog = (kind: 'quit' | 'help') => { pause(); setDialog(kind); };
  const closeDialog = () => { setDialog(null); resume(); };
  return <div ref={card} className="mr-battle-root">
    <div className="mr-toolbar"><span>{title}</span><button onClick={() => ended ? leave() : openDialog('quit')}>結束並選題庫</button><button onClick={() => openDialog('help')}>玩法說明</button></div>
    <BattleControls root={card} paused={!!snapshot.paused} />
    <ol className="mr-map" aria-label="六關旅程">{enemies.map((name, i) => <li key={name} aria-current={i === state.enemyIndex ? 'step' : undefined}>
      <span>{i + 1}</span>{name}{i < state.enemyIndex || phase === 'victory' ? ' ✓' : ''}</li>)}</ol>
    <div className="mr-hud"><span>連擊 {state.combo}</span><span>護甲 {state.playerArmor}</span><span>護盾 {state.playerShield}</span>
      <span>流血 {state.playerStatus.bleed}／迷霧 {state.playerStatus.fog}</span>{state.enemyEnraged && <strong>魔王狂暴</strong>}</div>
    <p className="mr-trait">第 {state.enemyIndex + 1} 關 · {trait.special ? `每 ${trait.special.every} 次攻擊發動「${trait.special.name}」` : trait.armor ? `重甲：抵銷 ${trait.armor} 點傷害` : '保持連擊，突破第一關！'}{trait.enrage && '；半血後狂暴，攻擊力提升並連續使用特殊攻擊。'}</p>
    <div ref={stage} className="mr-stage" aria-label="戰場" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}assets/images/math-rpg/stage${state.enemyIndex + 1}.webp")` }}>
      <figure><figcaption>勇者 <span data-testid="player-hp">{Math.max(0, view.playerHP)} / {state.playerMax}</span></figcaption>
        <progress aria-label="勇者生命" value={Math.max(0, view.playerHP)} max={state.playerMax} />
        <img data-character="hero" src={`${import.meta.env.BASE_URL}assets/images/math-rpg/hero.webp`} alt="" /></figure>
      <span className="mr-versus" aria-hidden="true">VS</span>
      <figure><figcaption>{enemies[state.enemyIndex]} <span>{Math.max(0, view.enemyHP)} / {state.enemyMax}</span></figcaption>
        <progress aria-label="敵人生命" value={Math.max(0, view.enemyHP)} max={state.enemyMax} />
        <img data-character="enemy" src={`${import.meta.env.BASE_URL}assets/images/math-rpg/enemy${state.enemyIndex + 1}.webp`} alt="" /></figure>
    </div>
    {phase === 'upgrade' ? <section className="mr-panel" aria-labelledby="mr-prompt"><h2 id="mr-prompt" ref={heading} tabIndex={-1}>打倒敵人！選擇一項強化</h2>
      <div className="mr-upgrades">{snapshot.offers.map(title => <button key={title} disabled={!!snapshot.selectedUpgrade || !!snapshot.paused} className={snapshot.selectedUpgrade === title ? 'mr-chosen' : snapshot.selectedUpgrade ? 'mr-dimmed' : ''} onClick={() => upgrade(title)}><strong>{title}</strong><span>{UPGRADES.find(item => item.title === title)!.desc}</span></button>)}</div>
      {snapshot.selectedUpgrade && <p role="status">已選擇 {snapshot.selectedUpgrade}，準備迎戰下一關…</p>}
    </section> : ended ? <section className={`mr-panel mr-result ${phase}`}><h2 ref={heading} tabIndex={-1}>{phase === 'victory' ? '六關全破！勇者勝利！' : '勇者倒下了，再挑戰一次吧！'}</h2><p>剩餘生命：{Math.max(0, state.playerHP)} / {state.playerMax} · 到達第 {state.enemyIndex + 1} 關</p><button onClick={reset}>再玩一次</button></section> :
      <section className="mr-panel" aria-labelledby="mr-prompt"><Countdown deadline={snapshot.phase === 'question' ? snapshot.deadline : snapshot.nextDeadline ?? null} next={snapshot.phase !== 'question'} paused={snapshot.paused} />
        <h2 id="mr-prompt" ref={heading} tabIndex={-1}>{question.q}</h2>
        <div className="mr-options">{question.a.map((option, i) => <button key={`${questionId}-${i}`} disabled={phase !== 'question' || snapshot.paused}
          className={phase !== 'question' && i === question.correct ? 'mr-correct' : ''} onClick={() => answer(i)}>
          {option}{phase !== 'question' && i === question.correct && <small>正確答案</small>}</button>)}</div>
        <p className="mr-feedback" role="status">{feedback || '答對攻擊敵人，答錯或超時會受到攻擊。'}</p>
      </section>}
    <PixiBattle snapshot={snapshot} stage={stage} card={card} />
    {dialog && <BattleDialog title={dialog === 'quit' ? '要離開這場戰鬥嗎？' : '遊戲玩法'} onClose={closeDialog}>
      {dialog === 'quit' ? <><p>目前進度不會保留，重新開始會回到第一關。</p><button onClick={closeDialog}>繼續戰鬥</button><button onClick={leave}>確認離開</button></> : <><HowTo /><button onClick={closeDialog}>繼續戰鬥</button></>}
    </BattleDialog>}
  </div>;
}
export function MathRpg() {
  const [grade, setGrade] = useState(Object.keys(questionPools)[0]);
  const [poolName, setPoolName] = useState(Object.keys(questionPools[grade])[0]);
  const [playing, setPlaying] = useState(false);
  const start = useRef<HTMLButtonElement>(null);
  const wasPlaying = useRef(false);
  useEffect(() => { if (wasPlaying.current && !playing) start.current?.focus(); wasPlaying.current = playing; }, [playing]);
  return <PageLayout><div className="mr-card"><h1>數學勇者</h1>
    <p>答題闖關 · 六段冒險旅程。<a href={`${import.meta.env.BASE_URL}pages/math-rpg.html`}>開啟完整特效舊版</a></p>
    {playing ? <Battle pool={questionPools[grade][poolName]} title={`${grade} · ${poolName}`} leave={() => setPlaying(false)} /> :
      <section className="mr-panel"><h2>選擇你的冒險</h2><p>六場戰鬥，每關可選一項強化。支援鍵盤 Tab 與 Enter 作答。</p>
        <details><summary>開始前看看遊戲玩法</summary><HowTo /></details>
        <div className="mr-settings"><label>年級<select value={grade} onChange={e => { setGrade(e.target.value); setPoolName(Object.keys(questionPools[e.target.value])[0]); }}>{Object.keys(questionPools).map(name => <option key={name}>{name}</option>)}</select></label>
          <label>題庫<select value={poolName} onChange={e => setPoolName(e.target.value)}>{Object.keys(questionPools[grade]).map(name => <option key={name}>{name}</option>)}</select></label></div>
        <button ref={start} onClick={() => setPlaying(true)}>開始冒險</button>
      </section>}
  </div></PageLayout>;
}
