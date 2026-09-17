import { LegacyModule } from '../../components/LegacyModule';

export function ClassRpgAdmin() {
  return <div className="wrap">
    <a href={`${import.meta.env.BASE_URL}next/index.html`} className="back-link">← 回學習主頁</a>
    <a id="gameLink" href="class-rpg-game.html" target="_blank" rel="noreferrer" className="btn game-link">進入遊戲</a>
    <h1>班級 RPG</h1><p className="subtitle">建立班級、新增學生角色，資料即時儲存到雲端。老師專用。</p>
    <div id="loginScreen" className="login-screen" style={{display:'none'}}><div className="login-card"><div className="lock" aria-hidden="true">🔐</div><h2>老師登入</h2><p className="hint">請使用管理員配發的帳號登入</p>
      <div className="field"><label htmlFor="loginEmail">電子郵件</label><input id="loginEmail" type="email" autoComplete="username" /></div>
      <div className="field"><label htmlFor="loginPassword">密碼</label><input id="loginPassword" type="password" autoComplete="current-password" /></div>
      <button className="btn" id="loginBtn">登入</button><div className="login-err" id="loginErr" role="alert" /></div></div>
    <div id="app">
      <div className="auth-bar"><span className="who">登入為 <b id="whoEmail">—</b></span><button className="btn btn-ghost btn-sm" id="editNameBtn">改名稱</button><button className="btn btn-ghost btn-sm logout" id="logoutBtn">登出</button></div>
      <div className="card"><h2>選擇班級</h2><div className="class-bar"><div><label htmlFor="classSelect">目前班級</label><select id="classSelect"><option value="">載入中…</option></select></div><button className="btn btn-ghost" id="newClassBtn">建立新班級</button><button className="btn-danger btn btn-sm" id="delClassBtn">刪除此班級</button></div></div>
      <section className="card" aria-labelledby="rewardTitle"><h2 id="rewardTitle">課堂快速獎勵</h2><p id="connectionState" role="status" />
        <div className="row"><div><label htmlFor="selectionMode">選取方式</label><select id="selectionMode"><option value="individual">個人（點選下方角色）</option><option value="team">小隊</option><option value="all">全班</option></select></div><div id="teamField" hidden><label htmlFor="teamSelect">選擇小隊</label><select id="teamSelect" /></div><button id="clearSelection" className="btn btn-ghost">清除選取</button></div>
        <p id="selectionSummary" aria-live="polite">尚未選取學生</p><div className="row"><div><label htmlFor="rewardReason">獎勵原因</label><select id="rewardReason">{['專心投入','勇於嘗試','明顯進步','幫助同伴','小隊合作','完成任務','提出好問題','從錯誤中修正'].map(x=><option key={x}>{x}</option>)}</select></div><div><label htmlFor="rewardAmount">每人經驗值</label><input id="rewardAmount" type="number" min="1" max="1000" step="1" defaultValue="10" /></div></div>
        <div className="reward-actions" id="rewardDock"><button id="rewardBtn" className="btn" disabled>發送獎勵</button><button id="undoBtn" className="btn btn-ghost" disabled>復原上一筆獎勵</button></div><p className="hint">經驗值自動換算等級與能力；最高 50 級。</p></section>
      <div className="card"><h2>學生名冊 <span id="countBadge" /></h2><div id="studentList" className="students" /><div id="studentEmpty" className="state">尚未選擇班級。</div></div>
      <section className="card"><h2>本堂課操作紀錄</h2><ol id="rewardHistory" aria-live="polite" /></section>
      <details className="card" id="addCard"><summary>新增學生角色</summary><div className="row"><div><label htmlFor="f_name">姓名 *</label><input id="f_name" maxLength={60} /><label htmlFor="f_team">小隊（可留白）</label><input id="f_team" maxLength={60} /></div><div><label htmlFor="f_gender">性別</label><select id="f_gender"><option>男</option><option>女</option><option>其他</option></select></div></div>
        <div className="row"><div><label htmlFor="f_exp">經驗值</label><input id="f_exp" type="number" defaultValue="0" min="0" /></div><div><label htmlFor="f_gold">金幣</label><input id="f_gold" type="number" defaultValue="0" min="0" /></div></div>
        <div className="row"><div><label htmlFor="f_weapon">武器</label><input id="f_weapon" list="weaponOptions" /></div><div><label htmlFor="f_equipment">裝備</label><input id="f_equipment" list="armorOptions" /></div></div><button className="btn" id="addStudentBtn">新增學生</button></details>
    </div>
    <div id="toast" className="toast" role="status" /><dialog id="editDialog" aria-labelledby="dialogTitle"><form id="editForm"><h2 id="dialogTitle" /><div id="dialogFields" /><div className="reward-actions"><button type="submit" className="btn">儲存</button><button type="button" id="dialogCancel" className="btn btn-ghost">取消</button></div></form></dialog>
    <datalist id="weaponOptions"><option value="劍"/><option value="弓"/><option value="槌"/><option value="法杖"/></datalist><datalist id="armorOptions"><option value="布衣"/><option value="皮甲"/><option value="鐵甲"/></datalist>
    <LegacyModule src="assets/js/class-rpg.js" loading="正在連接班級資料…" />
  </div>;
}
