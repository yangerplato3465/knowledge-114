import { useEffect, useState } from 'react';
import { LoadingStatus } from '../../components/Feedback';

interface DetectiveCaseProps { gameId: 'owl' | 'ai-museum'; caseFile: 'golden-owl' | 'ai-museum'; placeholder: string }

export function DetectiveCase({ gameId, caseFile, placeholder }: DetectiveCaseProps) {
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    window.DETECTIVE_GAME_ID = gameId;
    const data = document.createElement('script');
    data.src = `${import.meta.env.BASE_URL}assets/js/detective/cases/${caseFile}.js`;
    const gate = document.createElement('script');
    gate.type = 'module'; gate.src = `${import.meta.env.BASE_URL}assets/js/detective/gate.js`;
    data.addEventListener('load', () => document.body.append(gate), { once: true });
    data.addEventListener('error', () => setLoadError(true), { once: true });
    gate.addEventListener('error', () => setLoadError(true), { once: true });
    document.body.append(data);
    return () => { data.remove(); gate.remove(); };
  }, [caseFile, gameId]);
  return <><div className="game-bar"><a href={`${import.meta.env.BASE_URL}next/index.html`} className="back-link">← 回學習主頁</a><h1>偵探事件簿</h1>
    <div id="groupSwitch" className="group-switch" hidden><button type="button" id="groupBtn" className="group-tag" aria-haspopup="true" aria-expanded="false" title="切換組別"/><div id="groupMenu" className="group-menu" hidden /></div></div>
    <div id="gameContainer"><LoadingStatus id="gameLoading" className="game-loading">{loadError ? '案件載入失敗，請重新整理後再試。' : '案件卷宗載入中…'}</LoadingStatus></div>
    <div id="gate" className="gate" hidden><div className="gate-card"><div className="gate-icon" aria-hidden="true">🔒</div><h2>需要遊戲驗證碼</h2><p className="gate-hint">這個案件只能在課堂上遊玩。<br/>請輸入老師當堂提供的驗證碼。</p>
      <div id="gateGroups" className="gate-groups" hidden><p className="gate-groups-title">這台裝置上的組別</p><div id="gateGroupList" className="gate-group-list"/><button type="button" id="gateForget" className="gate-forget">清除這台記住的組別</button><div className="gate-or">或輸入驗證碼</div></div>
      <label className="sr-only" htmlFor="gateCode">遊戲驗證碼</label><input id="gateCode" type="text" autoComplete="off" spellCheck="false" autoCapitalize="characters" maxLength={16} placeholder={placeholder}/><button type="button" id="gateBtn" className="gate-btn">開啟案件</button><div id="gateErr" className="gate-err" role="alert"/><a href={`${import.meta.env.BASE_URL}next/index.html`} className="gate-back">← 回學習主頁</a>
    </div></div></>;
}

declare global { interface Window { DETECTIVE_GAME_ID?: string } }
