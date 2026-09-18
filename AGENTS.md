# 專案工作指引

適用整個 repository。以繁體中文溝通；先完成修改與驗證，再回報結果。

## 快速定位

- React + Vite + TypeScript 多頁網站；index.html 是正式首頁，pages/*.html 都掛載 React。不要恢復舊頁或 next/ 副本。
- 首頁／導覽：src/app、src/content/navigation.ts；教材：src/lessons；數學勇者：src/games/math-rpg。
- 素材上下載：src/features/materials；共用元件／主題：src/components、src/features/theme。
- 班級與偵探仍由 React 外殼接 assets/js/class-rpg*、assets/js/detective。它們是現役依賴，不能當廢碼刪除。
- 只讀任務需要的文件：[架構](docs/TECH_ARCHITECTURE.md)、[遊戲規則](docs/GAMEPLAY.md)、[偵探](docs/detective-authoring.md)、[待辦](docs/TODO.md)。
- 數學勇者目前維護中，僅保留維護頁與 questions.ts 題庫；新玩法、架構、UI 與美術待使用者討論定案，不恢復舊戰鬥。

## 工作方式

- 先看 git status 與相關程式／測試，保留使用者既有修改；用 rg 精準搜尋，不預先通讀整個專案。
- 新功能優先放 src，沿用現有元件和樣式；只修有證據的問題，不順帶改玩法、升級套件或重寫框架。
- 首頁維持介紹與入口；活動清單、老師工具、功能頁 CSS、教材、Firebase、Pixi 不可進首頁依賴圖。
- 使用 import.meta.env.BASE_URL 組網站資源／首頁路徑，需支援 / 與 /knowledge-114/。
- Effect 的計時器、監聽、訂閱、請求都要清理；過期非同步回呼不能啟動模組或覆蓋新狀態。
- 主題色取 assets/css/theme.css；檢查明／暗／跟隨系統模式。保留觸控按鈕、標籤與鍵盤操作。
- Pixi 只管繪圖，DOM 管題目與操作。使用本地 vendor，不手改 minified 檔；動畫降級不能改遊戲規則。

## 不可破壞的資料契約

- 偵探 ID owl／ai-museum、code.js 的 PEPPER／PBKDF2／正規化與 localStorage keys 不可隨意改。
- 維持驗碼 → 讀取進度 → engine；讀取失敗禁止存檔，離場先 flush，切組完整 reload。改存檔格式須規劃相容／遷移。
- 班級維持 ownerId 篩選、訂閱世代隔離、Firestore 原子交易與復原衝突檢查；成長公式唯一來源為 class-rpg-model.js。
- 不寫真實學生資料、不將權杖放入測試／文件；不要以 UI 隱藏代替 Firestore 權限。

## 驗證與交付

- Node.js 24、pnpm 11；pnpm dev 開發，pnpm preview 預覽 dist，不能直接靜態提供 TSX 原始碼。
- pnpm check：引用／文件／JS 語法；pnpm test：回歸；pnpm build：型別、建置、產物與效能預算。
- 先跑相關測試，再完成上述檢查；改路由或資源時另驗證 VITE_BASE_PATH=/knowledge-114/ 建置。
- UI 或載入流程有變更時做瀏覽器驗證；涉及雲端權限／存檔時說明未驗證範圍，不把模擬測試當實機驗收。
- 僅部署 dist；推送、部署及 Firebase 規則發布須有使用者授權。
- 文件只留現況、原因與必要限制，不新增逐次工作日誌或重複規格；數值與欄位優先連到程式來源。
