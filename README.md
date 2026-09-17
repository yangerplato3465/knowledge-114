# 學習主頁 · knowledge-114

Anita 老師的國小互動教學網站，使用繁體中文。以原生 HTML、CSS、JavaScript 製作，無須安裝套件或建置即可提供靜態網頁。

## 開啟網站

在專案根目錄執行 `python -m http.server 8080 --bind 127.0.0.1`，瀏覽 `http://localhost:8080/`。
也可在 Windows 執行 `powershell -NoProfile -File .claude/serve.ps1`，使用原有支援音訊串流的開發伺服器；路徑會自動依專案位置決定。
請使用 HTTP 伺服器；直接雙擊 HTML 的 file 模式不能正常載入設定與模組。

## 從哪裡開始

- `index.html`：學生入口與課程清單。
- `pages/`：課程、遊戲、素材與教師管理頁面。
- `assets/js/`、`assets/css/`：各功能的程式與樣式。
- `assets/images/`、`assets/audio/`、`assets/uploads/`：美術、音訊與下載素材。
- [設計總覽](docs/GAME_BIBLE.md)：各教學活動及設計文件索引。
- [維護限制](CLAUDE.md)：任何協作者修改前都應閱讀，尤其是存檔、解鎖碼與觸控教學規則。
- [已知待辦](docs/TODO.md)：尚未完成的遊戲內容及驗收項目。

## 修改後檢查

需要 Python 3 與支援 `node:test` 的 Node.js；不需要 npm install。

```text
python scripts/check_site.py
node scripts/check_js.cjs
node --test tests/shared.test.cjs
```

檢查包含本地 HTML/CSS/模組引用、重複 HTML id、題庫載入順序、JavaScript 語法與素材/主題功能的回歸測試。
測試使用模擬資料，不會呼叫 GitHub 或 Firebase，也不會上傳或刪除檔案。
引用檢查不涵蓋 JavaScript 動態組合出的圖片路徑、外部連線可用性或遊戲手感；變更遊戲後仍須在瀏覽器實際操作。

## 部署

GitHub Actions 會在 main 推送與 PR 執行上述檢查。main 或手動執行必須通過檢查才部署到 GitHub Pages；PR 只檢查。
部署只包含 `index.html`、`config.json`、`assets/` 與 `pages/`。開發腳本、文件及測試不納入網站成品。
發版時更新 `config.json` 的版本與日期。Firebase 規則不由此流程部署。

## 網路與資料

Pixi 引擎已放在 `assets/vendor/`，保留各頁原有版本。Firebase 教師管理與偵探存檔、GitHub 素材管理仍需要網路。
切勿將真實權杖或學生資料放入測試、文件或版本庫。
# React 外殼開發

使用 Node.js 24 與 pnpm 11.19.0：`pnpm install --frozen-lockfile`、`pnpm dev`，開啟 `http://127.0.0.1:5173/next/`。原版入口與遊戲仍可使用。

驗證：`pnpm test`、`pnpm build`；產物預覽：`pnpm preview`。GitHub Pages 使用 `VITE_BASE_PATH=/knowledge-114/` 建置，CI 已設定。

詳見 [遷移進度](docs/MIGRATION_PROGRESS.md)。目前完成建置外殼，遊戲尚未搬入 React。
