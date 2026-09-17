# 新版入口載入清單 · 2026-09-17

以下是 production build 的路由邊界。雜湊檔名每次建置會變，因此記錄責任與載入條件，不鎖定檔名。

| 入口 | React 功能 chunk | Pixi | Firebase／外部資料 | 大型素材與條件 |
|---|---|---|---|---|
| `index.html` | 導覽、Disclosure、主題、版號 | 不載入 | 不載入 | logo；不得載入遊戲模組 |
| `pages/magic-ink.html` | 教材與互動 | 不載入 | 不載入 | 教材 WebP，非首屏延遲 |
| `pages/water-acid-base.html` | 教材與實驗 | 不載入 | 不載入 | SVG／MathML，無遊戲 runtime |
| `pages/math-rpg.html` | 題庫、戰鬥 session、HUD | 進入戰鬥後載入本地 UMD 8.20.1 | 不載入 | 場景／角色 WebP；音樂由使用者開啟後載入 |
| `pages/class-rpg.html` | React 表單外殼 | 不載入 | adapter 載入 Firebase Auth／Firestore 11.0.2 | 無遊戲貼圖 |
| `pages/class-rpg-game.html` | React 世界外殼 | 本地 ESM 8.20.1 | 名冊 adapter 載入 Firebase | `char1.webp` 圖集 |
| 兩個 `pages/detective-*.html` | React gate 外殼 | 驗證成功後由 engine 載入本地 ESM 8.20.1 | gate 按需載入 Firebase | 先載 boot scene，其餘場景背景載入 |
| `pages/downloads.html`／`upload.html` | 素材 UI 與 Contents adapter | 不載入 | GitHub Contents API | 使用者選取檔案才讀內容 |

| `pages/detective-admin.html` | React 後台表單 | 不載入 | 驗證碼管理 Firebase 模組 | 僅老師登入後可操作 |

## Build 護欄

- Vite plugin 追蹤首頁依賴圖，禁止 Pixi、Firebase、`src/games`、`src/lessons` 與舊遊戲腳本。
- `check-performance-budget.mjs` 限制首頁功能 chunk 12 KB、共用 React shell 240 KB，並禁止 Pixi 進 Vite chunks。
- `check-build.mjs` 驗證每個實體 HTML 的 base path 與產物存在，拒絕已下架入口與舊站副本。
- `smoke-url.mjs` 在 Pages 部署後驗證代表入口、動態資源 MIME、404 與音訊 Range。
