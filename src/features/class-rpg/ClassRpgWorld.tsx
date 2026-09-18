import { ThemeSelect } from '../theme/ThemeProvider';
import { LegacyModule } from '../../components/LegacyModule';
import { LoadingStatus } from '../../components/Feedback';

export function ClassRpgWorld() {
  return <div className="game-shell"><div className="game-bar"><a href={`${import.meta.env.BASE_URL}pages/class-rpg.html`} className="back-link">← 回班級管理</a><h1>冒險世界</h1><span id="worldCount" className="hint">等待班級名冊</span><ThemeSelect /></div>
    <div className="world-controls"><label>班級<select id="worldClass" disabled><option>等待登入…</option></select></label><label>角色名冊<select id="studentFocus" disabled><option>選擇學生</option></select></label><button id="pauseWorld" disabled aria-pressed="false">暫停散步</button></div>
    <LoadingStatus id="worldStatus">正在準備班級世界…</LoadingStatus><div id="gameContainer"><LoadingStatus id="gameLoading" className="game-loading">遊戲載入中…</LoadingStatus></div><div id="characterInfo" role="status">點選角色或使用名冊，查看能力與成長。</div>
    <LegacyModule src="assets/js/class-rpg-game.js" loading="正在啟動角色世界…" /></div>;
}
