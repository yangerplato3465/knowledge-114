# 專案工作指引

適用全專案；使用繁體中文。先完成修改與驗證，再回報。

## 開始工作

- 先看 `git status`、保留既有修改；用 `rg` 找相關程式／測試，只改本次範圍。
- 本站是 React＋Vite＋TypeScript 多頁網站；`index.html`／`pages/*.html` 各有入口，不恢復舊頁或 `next/`。
- 按需查閱：[架構／模組定位](docs/TECH_ARCHITECTURE.md)、[玩法](docs/GAMEPLAY.md)、[偵探](docs/detective-authoring.md)、[待辦](docs/TODO.md)、[啟動／部署](README.md)。

## 修改邊界

- 新功能放 `src`、沿用共用元件；首頁只作介紹／入口，不引入清單資料、功能頁 CSS、教材、Firebase 或 Pixi。
- 數學勇者為五關操作／平衡原型：遵循 `docs/math-rpg-design.md`；使用五上／六上單元目錄，目前五上第一單元、合併第 2–3 單元、第 4 與第 5 單元有新題庫，不恢復已移除的舊題庫或舊戰鬥；其餘題庫、美術與獎勵待使用者定案。
- `assets/js/class-rpg*`、`assets/js/detective` 是現役依賴；保留完整頁面切換，移除 script 不等於清除訂閱。
- 網站路徑使用 `import.meta.env.BASE_URL`，支援 `/` 與 `/knowledge-114/`。只發布 `dist`，不可發布原始 TSX。
- Effect 清理計時器、監聽、訂閱與請求；過期回呼不可啟動模組或覆蓋新狀態。
- 沿用 `assets/css/theme.css`，支援明／暗／系統、鍵盤與觸控。新遊戲以 DOM 承載題目／操作，Pixi 繪圖；用本地 vendor，不手改壓縮檔，動畫降級不改玩法。
- 偵探：保留 ID／驗碼參數／儲存 keys；驗碼 → 讀進度 → engine，讀取失敗禁止寫入，離場先 flush，切組 reload；改存檔格式須相容遷移。
- 班級：保留 `ownerId` 篩選、訂閱世代隔離、原子交易與復原衝突檢查；成長公式只在 `class-rpg-model.js`。
- 不放真實學生資料或權杖於測試／文件；UI 隱藏不能替代 Firestore 權限。推送、部署、規則發布須經使用者授權。

## 驗證與交付

- 純文件：`pnpm check`、`git diff --check`。程式修改：先相關測試，再 `pnpm check`、`pnpm test`、`pnpm build`。
- 路由／資源／部署修改另驗證 `VITE_BASE_PATH=/knowledge-114/` 建置；UI／載入修改做瀏覽器驗證；雲端模擬測試不等於實機驗收。
- 文件只留現況與必要限制，數值連回程式，不加重複規格／日誌。回報變更、驗證及未驗證範圍。
