# 新版入口載入清單 · 2026-09-17

以下是 production build 的路由邊界。雜湊檔名每次建置會變，因此記錄責任與載入條件，不鎖定檔名。

| 入口 | React 功能 chunk | Pixi | Firebase／外部資料 | 大型素材與條件 |
|---|---|---|---|---|
| `next/index.html` | 導覽、Disclosure、主題、版號 | 不載入 | 不載入 | logo；不得載入遊戲模組 |
| `next/magic-ink.html` | 教材與互動 | 不載入 | 不載入 | 教材 WebP，非首屏延遲 |
| `next/water-acid-base.html` | 教材與實驗 | 不載入 | 不載入 | SVG／MathML，無遊戲 runtime |
| `next/quick-quiz.html` | 設定、205 題題庫、倒數 | 不載入 | 不載入 | 無大型媒體 |
| `next/word-sort.html` | 分類與快遞流程 | 選題後載入本地 UMD 8.20.1 | 不載入 | 彩帶為可移除增強 |
| `next/math-rpg.html` | 題庫、戰鬥 session、HUD | 進入戰鬥後載入本地 UMD 8.20.1 | 不載入 | 場景／角色 WebP；音樂由使用者開啟後載入 |
| `next/class-rpg.html` | React 表單外殼 | 不載入 | adapter 載入 Firebase Auth／Firestore 11.0.2 | 無遊戲貼圖 |
| `next/class-rpg-game.html` | React 世界外殼 | 本地 ESM 8.20.1 | 名冊 adapter 載入 Firebase | `char1.webp` 圖集 |
| 兩個 `next/detective-*.html` | React gate 外殼 | 驗證成功後由 engine 載入本地 ESM 8.20.1 | gate 按需載入 Firebase | 先載 boot scene，其餘場景背景載入 |
| `next/downloads.html`／`upload.html` | 素材 UI 與 Contents adapter | 不載入 | GitHub Contents API | 使用者選取檔案才讀內容 |

## Build 護欄

- Vite plugin 追蹤首頁依賴圖，禁止 Pixi、Firebase、`src/games`、`src/lessons` 與舊遊戲腳本。
- `check-performance-budget.mjs` 限制首頁功能 chunk 12 KB、共用 React shell 240 KB，並禁止 Pixi 進 Vite chunks。
- `check-build.mjs` 驗證每個實體 HTML 的 base path 與產物存在，並逐 byte 比對舊站回退檔案。
- `smoke-url.mjs` 在 Pages 部署後驗證代表入口、動態資源 MIME、404 與音訊 Range。
