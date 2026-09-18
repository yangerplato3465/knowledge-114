import { ThemeSelect } from '../theme/ThemeProvider';
import { Icon } from '../../components/Icon';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { LoadingStatus } from '../../components/Feedback';
import { leaveCase } from './leaveCase';

interface DetectiveCaseProps { gameId: 'owl' | 'ai-museum'; caseFile: 'golden-owl' | 'ai-museum'; placeholder: string }

export function DetectiveCase({ gameId, caseFile, placeholder }: DetectiveCaseProps) {
  const [loadError, setLoadError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const exitPending = useRef(false);
  async function returnToActivities(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (exitPending.current) return;
    const destination = event.currentTarget.href;
    exitPending.current = true;
    setLeaving(true);
    try { await leaveCase(() => window.location.assign(destination)); }
    finally { exitPending.current = false; setLeaving(false); }
  }
  useEffect(() => {
    setLoadError(false);
    let active = true;
    window.DETECTIVE_GAME_ID = gameId;
    const data = document.createElement('script');
    data.src = `${import.meta.env.BASE_URL}assets/js/detective/cases/${caseFile}.js`;
    const gate = document.createElement('script');
    gate.type = 'module'; gate.src = `${import.meta.env.BASE_URL}assets/js/detective/gate.js`;
    const startGate = () => { if (active) document.body.append(gate); };
    const fail = () => { if (active) setLoadError(true); };
    data.addEventListener('load', startGate, { once: true });
    data.addEventListener('error', fail, { once: true });
    gate.addEventListener('error', fail, { once: true });
    document.body.append(data);
    return () => {
      active = false;
      data.removeEventListener('load', startGate);
      data.removeEventListener('error', fail);
      gate.removeEventListener('error', fail);
      data.remove(); gate.remove();
    };
  }, [caseFile, gameId]);
  return <div className="game-shell"><div className="game-bar"><a href={`${import.meta.env.BASE_URL}pages/activities.html`} className="back-link" onClick={returnToActivities} aria-busy={leaving}>{leaving ? '正在儲存進度…' : '← 回學習活動'}</a><h1>偵探事件簿</h1><ThemeSelect />
    <div id="groupSwitch" className="group-switch" hidden><button type="button" id="groupBtn" className="group-tag" aria-haspopup="true" aria-expanded="false" title="切換組別"/><div id="groupMenu" className="group-menu" hidden /></div></div>
    <div id="gameContainer"><LoadingStatus id="gameLoading" className="game-loading">{loadError ? '案件載入失敗，請重新整理後再試。' : '案件卷宗載入中…'}</LoadingStatus></div>
    <div id="gate" className="gate" hidden><div className="gate-card"><div className="gate-theme"><ThemeSelect /></div><div className="gate-icon"><Icon name="search" /></div><p className="case-label">{gameId === 'owl' ? '黃金貓頭鷹雕像失竊事件' : 'AI 展覽館的消失記憶'}</p><h2>需要遊戲驗證碼</h2><p className="gate-hint">這個案件只能在課堂上遊玩。<br/>請輸入老師當堂提供的驗證碼。</p>
      <div id="gateGroups" className="gate-groups" hidden><p className="gate-groups-title">這台裝置上的組別</p><div id="gateGroupList" className="gate-group-list"/><button type="button" id="gateForget" className="gate-forget">清除這台記住的組別</button><div className="gate-or">或輸入驗證碼</div></div>
      <label htmlFor="gateCode">遊戲驗證碼</label><input id="gateCode" type="text" autoComplete="off" spellCheck="false" autoCapitalize="characters" maxLength={16} placeholder={placeholder}/><button type="button" id="gateBtn" className="gate-btn">開啟案件</button><div id="gateErr" className="gate-err" role="alert"/><a href={`${import.meta.env.BASE_URL}pages/activities.html`} className="gate-back">← 回學習活動</a>
    </div></div></div>;
}

declare global { interface Window { DETECTIVE_GAME_ID?: string } }
