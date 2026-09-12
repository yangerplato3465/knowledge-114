# 遷移進度 · 2026-09-12

## Phase 3：原子筆教材

- [x] 新增 `/next/magic-ink.html` 與 React 教材頁，新版首頁已改連新入口；原 HTML／JS／CSS 保留。
- [x] 保留原教材段落、標題、配方與安全提醒、圖片及說明；測試直接比對原 HTML。DOM 圖片補齊實際寬高，首屏封面不延遲載入。
- [x] 四題冷知識及一題隨堂考以 React 狀態鎖定作答；冷知識只計四題，不重複累計。
- [x] 吸水大賽保留 92／55／4% 水位及 4.8 秒揭曉；彩虹橋保留 0.6／1.8／2.3／4.9 秒階段與正確混色結算。離頁取消 timer，重玩重置狀態。
- [x] 保留視覺結構與原 CSS，新增鍵盤按鈕、aria-pressed、結果 status 和 reduced-motion 過渡停用。
- [x] 21 項舊測試 + 18 項 React／模型測試、typecheck、根路徑／Pages 子路徑建置通過。首頁建置邊界新增禁止載入 lessons 模組。
- [x] 瀏覽器實測吸水大賽紙巾勝出、彩虹橋 2/2、冷知識 4/4，深色畫面可讀。
- [ ] 教室觸控實機、窄螢幕與效能量測；酸鹼教材尚未移植。

教材 JSX 由 `scripts/migrate_magic_ink.py` 一次性轉換原 HTML（需要 Python 與 Pillow），後續可直接維護 React 元件；不需在 build 或 CI 執行轉換，重新執行會覆寫 LessonContent、兩個 View 與 questions。圖片、教材內容仍以資料等價為本次範圍。

本批未 commit、未部署；本機 React 教材預覽：`http://127.0.0.1:4175/knowledge-114/next/magic-ink.html`。

## Phase 3：快問快答

- [x] 新增 `next/quick-quiz.html` 與 React 頁面；新版首頁導向新入口，原 `pages/quick-quiz.html` 保留。
- [x] 205 題文字及布林答案與原版逐題比對通過；抽題仍採 Fisher–Yates，無重複抽取，不改題目內容。
- [x] 保留每題 1～60 秒、題數 1～205、快速選項、倒數後公布答案、手動下一題／完成、回設定與重玩。沒有增加計分或存檔。
- [x] 抽出 PageLayout，沿用 ThemeProvider 與 ErrorBoundary；倒數在回設定與卸載時取消，StrictMode 測試通過。
- [x] 頁面分入口打包，題庫只在快問快答載入；首頁依賴圖禁止引入遊戲模組。build 檢查兩個 React HTML 入口資源。
- [x] 21 項既有測試、13 項 React／模型測試通過；typecheck、根路徑與 GitHub Pages 子路徑 build、169 個本機引用檢查通過。
- [x] 瀏覽器實測設定 1 題／1 秒、倒數揭答、Enter 完成及重玩保留設定，深色畫面可正常閱讀。
- [ ] 教室觸控實機、窄螢幕與同條件效能量測。

本批沒有 commit 或正式部署。React 預覽為 `http://127.0.0.1:4174/knowledge-114/next/quick-quiz.html`；常用 `http://localhost:8080/` 仍提供原站。不能把本機預覽視為正式上線或完整 Phase 3 完成。

已完成 Phase 1 建置外殼，並接續完成 Phase 2 的完整首頁移植。尚未進行正式部署，也不代表全站遷移完成。

## Phase 2 首頁移植

- `/next/` 現在包含原首頁四個分類、11 個活動入口、科學／遊戲子分類、logo、作者、版號與僅本機顯示的 Spike 入口。
- 活動網址、標題與說明以測試直接對照原 `index.html`；所有活動仍完整 reload 進入原頁面。
- 抽出純資料 navigation、Disclosure 和 VersionLabel。分類維持同層互斥；使用語意 button、aria-expanded、hidden，收合內容不進入鍵盤順序。
- 版號沿用 config.json，HTTP／離線／格式錯誤不阻擋首頁；卸載取消 fetch。logo 使用真實 98×56 尺寸，保留字體載入與系統 fallback。
- 目前僅有首頁入口，build 會檢查全部 chunk 不含 Pixi、Firebase 或 assets/js 遊戲模組；未來增加遊戲入口時需改為僅追蹤首頁依賴圖。
- 驗證：21 項既有測試 + 8 項 React 測試、typecheck、根路徑及 `/knowledge-114/` build 通過。新版 JS 約 226.17 KB / gzip 71.75 KB，CSS 約 5.75 KB / gzip 1.91 KB。
- 瀏覽器確認深色桌面、淺色 390×844、分類展開、Enter 收合及正確版號。已恢復跟隨系統模式。
- 仍未完成 Phase 2 全部工作：Modal、Toast、共用載入狀態將於實際頁面使用時抽出，教室觸控及完整效能基準仍待驗收。沒有正式部署或 commit。

## 可回退基準

- 原始 commit：`4ab86702d7748db7278e5e765ce288407e6fcfd1`。
- 修改前工作區乾淨；舊 `index.html`、`pages/`、`assets/` 與 `config.json` 保持原樣。
- `check_site.py`：16 頁、169 個引用、0 錯誤。
- `check_js.cjs`：36 個 JavaScript 區塊通過。
- Node tests：21 項通過；新增 React tests：4 項通過。

## 已完成

- React / Vite / TypeScript 與 pnpm lockfile；實際版本以 lockfile 為準。
- `/next/index.html` 獨立預覽入口，全部導覽使用完整頁面跳轉。
- ErrorBoundary、GameShell、ThemeProvider、GameController、command/event 型別與 PixiHost。
- ThemeProvider 沿用 `knowledge114-theme`，支援 light/dark/system、跨分頁與封鎖 storage。
- PixiHost 使用每次掛載專屬容器，處理 StrictMode、非同步 mount 後離場、錯誤、resize 與背景暫停；以假 controller 測試，尚未接真實 Pixi 遊戲。
- 建置後原樣複製舊站，逐檔比對 bytes，確保舊遊戲與權限相關程式不被打包器改寫。
- 根路徑與 `/knowledge-114/` build 通過；新版 JS 約 222.55 KB / gzip 70.08 KB，CSS 約 4.11 KB / gzip 1.46 KB。這是產物大小，不是 CWV 或 Lighthouse 成績。
- CI 執行既有檢查、React 測試、typecheck、build、產物檢查，再上傳 dist；PR 不部署。
- 瀏覽器確認新版入口可顯示，使用既有 theme.css 的系統深色樣式。

## 保留的資料契約

`knowledge114-theme`、`tf-best`、所有 `detective.*` keys、game ID `owl`、PBKDF2/PEPPER/正規化、SAVE_VERSION 2、saveBlocked、flush-before-leave、完整 reload 小組切換及 Firestore `progress.size() <= 28` 均未改動。兩份既有 Pixi vendor 保留；未新增第三份 Pixi runtime。

## 仍待完成

Phase 0 的代表頁面截圖保存、各頁載入清單、同條件 lab performance 與主要遊戲完整流程仍待補齊；沒有 field data，不能宣稱 CWV 通過。尚未實際執行 GitHub Actions 或正式站 smoke test。後續移植遊戲前須補齊其基準，不應跳過。

下一批可開始普通教學頁與快問快答，按實際需要抽出 Modal、Toast 和載入狀態。PixiHost 真實 GPU 資源清理、reduced-motion command 接線與遊戲教室觸控驗收將隨遊戲移植完成。

## 開發與回退

`pnpm install --frozen-lockfile` → `pnpm dev` → 開啟 `/next/`。舊站入口是 `/index.html`。

`pnpm test`、`pnpm build`、`pnpm preview` 可驗證正式產物。自訂子路徑需在 build 和 preview 同時設定 `VITE_BASE_PATH`（以 `/` 開頭與結尾）。

回退外殼時，仍可直接以靜態伺服器提供原始根目錄；正式部署回退可用原始 commit 的舊 workflow。不要刪除或清空學生存檔。

實作參考：[Vite 官方指南](https://vite.dev/guide/)、[React TypeScript](https://react.dev/learn/typescript)。
