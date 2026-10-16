import { ForestArt } from '../../components/ForestArt';
import { TeacherHeader } from '../../components/TeacherHeader';
import { Icon } from '../../components/Icon';
import { LegacyModule } from '../../components/LegacyModule';

export function DetectiveAdmin() { return <>
    <div className="wrap admin-shell"><TeacherHeader current="detective-admin" /><div className="admin-heading"><div><p className="page-kicker"><Icon name="lock" />老師工作室</p>

        <h1>偵探事件簿 · 驗證碼管理</h1>
        <p className="subtitle">為各組準備案件驗證碼，查看有效期限與調查進度。</p></div><ForestArt name="key" /></div>


        <div id="loginScreen" className="login-screen" style={{"display":"none"}}>
            <div className="login-card">
                <div className="lock"><Icon name="lock" /></div>
                <h2>管理者登入</h2>
                <p className="hint">只有指定帳號能產生驗證碼</p>
                <div className="field">
                    <label htmlFor="loginEmail">電子郵件</label>
                    <input id="loginEmail" type="email" autoComplete="username" placeholder="teacher@example.com" />
                </div>
                <div className="field">
                    <label htmlFor="loginPassword">密碼</label>
                    <input id="loginPassword" type="password" autoComplete="current-password" placeholder="••••••••" />
                </div>
                <button className="btn" id="loginBtn">登入</button>
                <div className="login-err" id="loginErr"></div>
            </div>
        </div>


        <div id="app">
            <div className="auth-bar">
                <span className="who">目前帳號：<b id="whoEmail">—</b> <span className="whoami" id="whoUid"></span></span>
                <button className="btn btn-ghost btn-sm logout" id="logoutBtn" style={{"marginLeft":"auto"}}>
                     登出
                </button>
            </div>

            <div className="card">
                <h2>產生驗證碼</h2>
                <div className="row" style={{"marginBottom":"12px"}}>
                    <div>
                        <label htmlFor="f_game">選擇案件</label>
                        <select id="f_game" defaultValue=""></select>
                    </div>
                    <div>

                        <label htmlFor="f_hours">有效時間</label>
                        <select id="f_hours" defaultValue="168">
                            <option value="1">1 小時</option>
                            <option value="2">2 小時（單堂課）</option>
                            <option value="4">4 小時（半天）</option>
                            <option value="8">8 小時</option>
                            <option value="12">12 小時（當天）</option>
                            <option value="24">1 天</option>
                            <option value="48">2 天</option>
                            <option value="72">3 天</option>
                            <option value="168">7 天（跨週續玩）</option>
                            <option value="336">14 天</option>
                            <option value="720">30 天</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="f_count">組數</label>
                        <select id="f_count" defaultValue="1">
                            <option value="1">1 組</option>
                            <option value="2">2 組</option>
                            <option value="3">3 組</option>
                            <option value="4">4 組</option>
                            <option value="5">5 組</option>
                            <option value="6">6 組</option>
                            <option value="8">8 組</option>
                        </select>
                    </div>
                </div>
                <div className="row" style={{"marginBottom":"14px"}}>
                    <div style={{"flex":"2"}}>
                        <label htmlFor="f_note">班級／組別名稱</label>
                        <input id="f_note" placeholder="例：A 班（多組時會自動加上第 1 組、第 2 組…）" />
                    </div>
                    <div>
                        <label htmlFor="f_max">使用次數上限（0 = 不限）</label>
                        <input id="f_max" type="number" defaultValue="0" min="0" />
                    </div>
                </div>
                <button className="btn" id="genBtn">產生驗證碼</button>

                <div id="fresh" className="fresh" style={{"display":"none"}}></div>
            </div>

            <div className="card">
                <h2>已發出的驗證碼</h2>
                <div className="row" style={{"marginBottom":"14px"}}>
                    <div>
                        <label htmlFor="filterGame">篩選案件</label>
                        <select id="filterGame" defaultValue=""></select>
                    </div>
                    <button className="btn btn-ghost" id="refreshBtn"> 重新整理</button>
                    <button className="btn btn-danger" id="purgeBtn"> 清除已失效的驗證碼</button>
                </div>
                <div id="codeList" className="codes"></div>
                <div id="codeEmpty" className="state" style={{"display":"none"}}>還沒有發出任何驗證碼。</div>
            </div>

            <div className="card">
                <h2>首次使用設定</h2>
                <details className="setup">
                    <summary>展開設定步驟（首次使用時完成）</summary>
                    <ol>
                        <li>把 <code>pages/firestore.rules.txt</code> 的內容整份貼到 Firebase 主控台 →
                            Firestore Database → 規則 → 發布。</li>
                        <li>規則裡的 <code>isOwner()</code> 使用電子郵件允許名單，目前已列入
                            <code>nini900219@gmail.com</code> 與 <code>yangerplato3465@gmail.com</code>。
                            你目前登入的是 <b id="setupEmail">登入後顯示</b> —— 如果它不在名單裡，
                            便無法產生驗證碼；請將帳號加入規則後重新發布。</li>
                        <li>（選用）Firestore → TTL → 對 <code>unlockCodes</code> 集合的
                            <code>expiresAt</code> 欄位建立政策，過期的碼會自動被清掉。
                            未設定自動清除時，過期驗證碼仍會被安全規則拒絕，但紀錄會持續保留。</li>
                    </ol>
                </details>
            </div>
        </div>
    </div>

    <div className="toast" id="toast"></div>





<LegacyModule src="assets/js/detective/admin.js" loading="正在連接驗證碼管理…" /></>; }
