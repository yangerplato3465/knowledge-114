# 學習主頁 · knowledge-114

Anita 老師的國小互動教學網站，使用繁體中文。所有 11 個網頁入口統一由 React + Vite + TypeScript 建置；根目錄首頁即正式版，不再維護舊 HTML 網站或 next 預覽副本。

## 開發與驗證

使用 Node.js 24、pnpm 11.19.0：

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

開發入口為 http://127.0.0.1:5173/ 。必須透過 Vite 開發或預覽 dist；不要直接用靜態伺服器提供原始碼，也不能雙擊 HTML。

## 結構

- index.html：React 首頁入口。
- pages/*.html：React 多頁入口，保留既有正式網址；不是舊版頁面。
- src/：React 元件、教材、題庫、互動狀態與遊戲控制器。
- assets/：共用樣式、素材、本地 Pixi，以及仍在使用的班級／偵探 Firebase 與遊戲模組。
- tests/fixtures/：不發布的教材內容與數學規則回歸基準。

React 是唯一頁面框架，但班級管理、班級世界和偵探功能仍透過 LegacyModule／DetectiveCase 接入 imperative JavaScript。這些模組是現役功能依賴，不能當作舊頁刪除；其 DOM 狀態尚未全部改寫為 React hooks。Pixi 負責遊戲繪圖，Firebase 負責雲端資料。

## 部署

GitHub Actions 通過引用檢查、語法檢查、測試與建置後，部署 dist/。GitHub Pages 使用 VITE_BASE_PATH=/knowledge-114/。建置不再複製舊 HTML；檢查會拒絕已下架遊戲與 next/ 產物。

偵探後台位於 pages/detective-admin.html。Firebase 規則位於 pages/firestore.rules.txt，不由網站建置部署。真實登入、驗證碼與雲端存檔需在有權限的環境另行驗收；測試不寫入真實學生資料。

目前架構見 [TECH_ARCHITECTURE](docs/TECH_ARCHITECTURE.md)，切換紀錄見 [MIGRATION_PROGRESS](docs/MIGRATION_PROGRESS.md)。
