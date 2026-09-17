# 遷移進度 · 2026-09-17

## Phase 4 第二批：數學勇者回合時間線

- 新增 src/games/math-rpg/turn.ts：純函式產出即時數值與毫秒時間線，分離命中、狀態附加／遞減、倒地、選卡、勝敗及下一題事件；不建立 DOM、Pixi 或計時器。
- 432 組邊界案例直接執行舊回合函式逐拍比較狀態與終點時間，另以 20 組種子連續模擬戰鬥至勝敗，跨關與選卡一併對照。
- 保留護盾擋附加狀態但不擋既有流血、先擷取流血傷害再附加新層數、擊殺跳過狀態結算等原版行為。
- 21 項 Node + 57 項 Vitest（78 項）、typecheck、production build 及舊站相容檢查通過。
- 尚未接入 React／Pixi；作答鎖、可取消排程器、重玩／卸載清理與瀏覽器驗收留待接線批次。舊腳本未改，本批未提交、推送或部署。

## Phase 4 第一批：數學勇者題庫與純規則

- 新增 src/games/math-rpg/questions.ts 與 model.ts，抽離 36 題固定題目、動態除法產生器、六關傷害／狀態公式與八張強化卡池。
- 初始狀態、傷害、換關與選卡結果直接對照舊碼；動態題目連續 1,000 題一致，100 組種子各五輪強化一致。
- 21 項 Node + 54 項 Vitest（75 項）與 production build 通過；舊入口、renderer 和資料契約未改。本批未提交、未部署。
- [規則與回合邊界紀錄](migration-evidence/math-rpg-rules.md) 已保存。仍待回合時間線、完整戰鬥模擬及 React／Pixi 接線，未將 Phase 4 整體或「完整 renderer 邊界」標記完成。

## 素材下載／上傳 React 移植

- 新增 `/next/downloads.html`、`/next/upload.html`，新版首頁改連新入口；沿用 PageLayout、ThemeProvider、ErrorBoundary 與原主題色彩。舊頁及素材原樣保留。
- `src/features/materials/api.ts` 集中 GitHub Contents API、清單驗證、檔名編碼、二進位 Base64、同名 SHA 更新及刪除。維持原 repo、main、assets/uploads 路徑及 gh_upload_token key；權杖只在既有記住偏好勾選且執行上傳時儲存，取消勾選立即移除。
- useMaterials 取消前次請求並忽略過期結果；上傳／刪除共用操作鎖，批次檔案依序處理，避免並行提交衝突。離場中止請求和後續批次，操作進行中保留離站提醒。中止請求不保證撤銷 GitHub 已接受的提交，應重新整理清單確認結果。
- 保留原生刪除確認，API 失敗提供可重試提示；格式不正確或前置查詢失敗不發送 PUT。檔名作純文字、連結固定可信 host 並編碼檔名。
- 驗證：21 項 Node + 48 項 Vitest（共 69 項）通過，typecheck、根路徑及 `/knowledge-114/` build 通過。新增素材測試覆蓋清單過濾、特殊檔名、格式錯誤、限流、請求競爭、Base64、SHA、批次序列、重複點擊、storage 封鎖、離場取消及刪除取消／衝突。
- 正式產物子路徑瀏覽器確認下載及管理清單讀到現有三個檔案；390px 無橫向溢出，下載／刪除／重新整理按鈕約 46px 高、上傳 48px。Enter 可重新整理，無 console error。沿用 UI/UX 技能的可見焦點與 44px 操作目標指引。
- 寫入流程使用模擬 API 與測試權杖驗證，未上傳或刪除正式素材；本批未提交、未部署。教室觸控與同條件效能驗收仍待補齊。

實作核對 [GitHub Contents API 官方文件](https://docs.github.com/en/rest/repos/contents)：同名更新使用既有 SHA，寫入與刪除依序處理。

## 字尾大分流：React 入口與特效 controller

- 新增 `/next/word-sort.html`，新版首頁導向新入口。沿用舊 CSS／主題與滿版教室配置，React 管理分類、收集、錯題、快遞任務、結果及重玩；舊入口與 vendor 保留。
- `useRound` 管理可取消的計時器與朗讀，`Courier` 以 ref 更新輸送帶 transform，不把每幀座標送進 React state；卸載清理 rAF、ResizeObserver、計時器及語音。
- `WordSortFX` 實作 GameController，選題後按需載入既有 UMD。每次 mount 有獨立 Application／貼圖；缺少 GPU／vendor 時 DOM 遊戲仍可完成。reduced-motion 清空彩帶，不停止必要的輸送帶玩法。全域 Pixi pools 不跨實例清除，避免 StrictMode 非同步重疊時破壞其他實例。
- 可見焦點、按鈕名稱、鍵盤「下一題」與窄螢幕覆寫依 UI/UX 技能內建指引補齊；未重設整站視覺。
- 21 項 Node + 34 項 Vitest 測試通過，包括 400 組規則等價、完整 12+3 流程、錯抓重試、重玩、快速離場、初始化失敗及資源釋放。根路徑與 `/knowledge-114/` build 通過。
- 瀏覽器新舊版均完成 12 題及 3 次快遞，確認 6/12 與六題錯題複習；新版重玩歸零。390px 無橫向溢出，主按鈕約 186×174px。正式產物子路徑可鍵盤開始與答題，實際 canvas 載入且離場移除；無 console error。
- 尚待教室觸控實機、完整拖曳／視覺細節驗收、同條件 lab performance 與 GPU 記憶體量測，未宣稱 Phase 3 全部完成。此批未提交、未部署。

下一批：依 [基準紀錄](migration-evidence/word-sort-baseline.md) 補齊字尾大分流的視覺／效能驗收，或續接素材下載／上傳頁。不要把瀏覽器完成流程視為教室實機通過。

## 字尾大分流：題庫與規則抽離

- 新增 src/games/word-sort 的 TypeScript 題庫、抽題與快遞任務模型，尚未接入正式頁面。
- 四组題庫逐欄相同；400 組固定亂數對照原函式，題序、快遞目標和選項一致。
- 21 項既有 Node + 28 項 Vitest 測試、typecheck 與 build 通過；既有入口保持原樣。
- [規則基準與待驗收項目](migration-evidence/word-sort-baseline.md) 已記錄。下一批接 React DOM 與 Pixi controller；瀏覽器完整流程與效能基準尚未完成，因此未勾選遊戲移植完成。

## 遊戲共用層：動態偏好指令

- 驗證：21 項既有 Node 測試、24 項 React／模型測試、TypeScript 與 production build 全部通過；產物相容檢查確認舊站檔案完整保留。
- 新增 useReducedMotion，訂閱系統偏好並於卸載解除監聽；無 matchMedia 時採減少動態。
- GameController.dispatch 成為必要型別介面；PixiHost 等待 mount 完成後、resume 前送出最新 set-reduced-motion，偏好變更不重建 controller。
- 暫停仍由 paused 與頁面可見性控制，減少動態不得停止遊戲規則或答題計時。
- 本批只完成共用接線；尚未接入真實 Pixi 遊戲，GPU 清理、粒子停用及教室實機驗收仍待遊戲移植。
- 參考 React 官方 [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) 的瀏覽器 API 訂閱方式。


## Phase 3：水與酸鹼教材 · 2026-09-14

- [x] 新增 `/next/water-acid-base.html`，新版首頁導向新入口；五張投影片、段落、MathML 公式、SVG 圖解及三題選項保留，文字與答案直接比對舊版。
- [x] React 管理 NaOH／指示劑投放、溫度、離子、作答與重設；維持 600／500ms 投放、最多六片、每片升溫 14.5°C、最高 85°C。重設與卸載取消尚未完成的投放，不依賴 animationend 更新資料。
- [x] 沿用 PageLayout、ThemeProvider 與 ErrorBoundary；教材獨立入口，首頁不載入教材、Pixi 或 Firebase。舊頁與素材逐檔比對保持完整。
- [x] 21 項既有測試、22 項 React／模型測試、typecheck、根路徑與 Pages 子路徑 build、169 個本機引用與 36 個 script 語法檢查通過。
- [x] Edge 瀏覽器確認變色、1920／1100／390px 無橫向溢出、深色／reduced-motion／Enter 投放與零 pageerror。窄螢幕截圖見 [驗證截圖](migration-evidence/water-acid-base-mobile.png)。
- [ ] 教室觸控實機與同條件 lab performance；未宣稱 CWV 通過。

教材 JS 28.06 KB（gzip 7.09 KB），不含共用 React runtime；這是產物大小而非效能量測。`scripts/migrate_water_acid_base.mjs` 是一次性轉換工具，明確執行會覆寫 LessonContent 與 questions，不在 build／CI 執行。實作核對 [React TypeScript 官方文件](https://react.dev/learn/typescript)。

本批未 commit、未正式部署。預覽：`http://127.0.0.1:4180/knowledge-114/next/water-acid-base.html`。下一批可處理字尾大分流，但移植前須補齊該遊戲基準；教室驗收仍待實機。

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
