# 技術架構 · 2026-09-17

唯一頁面框架為 React 19 + Vite + TypeScript。首頁是 index.html，其餘 10 個入口在 pages/，所有 HTML 都只掛載 React root。沒有 next/ 雙軌或獨立舊 HTML 回退頁。

## 功能邊界

- 首頁：純導覽，建置護欄禁止載入遊戲、Pixi 與 Firebase。
- 科學教材、數學勇者、素材管理：React 管理介面與互動狀態。
- 班級管理／世界、兩個偵探案件、偵探後台：React 建立頁面 DOM，assets/js 的現役 imperative 模組負責 Firebase 與遊戲流程；尚非全部 React hooks 狀態管理。
- Pixi 是繪圖引擎，不是並存的網頁框架；保留本地 UMD／ESM 8.20.1，依遊戲需要載入。
- 共用 CSS 留在 assets/css；沿用樣式不代表保留舊頁框架。

## 建置

pnpm dev 提供開發站；pnpm build 執行型別、Vite、靜態素材複製、入口與效能預算檢查。只發布 dist/。copy-static.mjs 不複製來源 HTML，避免覆蓋 React 建置結果。

所有正式 pages/ 網址不變，根首頁改為 React。next/ 與測試用 Pixi HTML 已移除。教材內容基準與數學規則參考僅放在 tests/fixtures，不進入發布產物。

## 資料契約

偵探 game ID、驗證碼衍生演算法、儲存 key、進度讀取失敗時禁止寫入、切換組別完整 reload、離場先 flush 及班級 owner filter／交易語意均保留。不要把 assets/js/class-rpg* 或 assets/js/detective 當成可刪除的舊網站。

下一階段若要把剩餘 imperative UI 改為 React state，需逐項抽離資料 adapter 和生命週期，並驗證有效帳號、群組存檔、權限失敗及離線路徑。
