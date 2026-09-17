# 學習主頁 · knowledge-114

Anita 老師的國小互動教學網站，使用繁體中文。正式新版以 React + Vite + TypeScript 建置，舊原生 HTML/CSS/JavaScript 頁面保留作相容回退。

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

完整新版驗證需要 Node.js 24、pnpm 11 與 Python 3。

```text
pnpm install --frozen-lockfile
python scripts/check_site.py
node scripts/check_js.cjs
pnpm test
pnpm build
```

檢查包含本地 HTML/CSS/模組引用、重複 HTML id、題庫載入順序、JavaScript 語法與素材/主題功能的回歸測試。
測試使用模擬資料，不會呼叫 GitHub 或 Firebase，也不會上傳或刪除檔案。
引用檢查不涵蓋 JavaScript 動態組合出的圖片路徑、外部連線可用性或遊戲手感；變更遊戲後仍須在瀏覽器實際操作。

## 部署

GitHub Actions 會在 main 推送與 PR 執行上述檢查。main 或手動執行必須通過檢查才部署到 GitHub Pages；PR 只檢查。
部署 `dist/`，包含新版 `next/`、雜湊 app assets，以及逐檔保留的 `index.html`、`config.json`、`assets/` 與 `pages/`。部署完成後會自動執行入口、MIME、404 與音訊 Range smoke test。
發版時更新 `config.json` 的版本與日期。Firebase 規則不由此流程部署。

## 網路與資料

Pixi 8.20.1 引擎已放在 `assets/vendor/`，分成 UMD／ESM 相容格式。Firebase 教師管理與偵探存檔、GitHub 素材管理仍需要網路。
切勿將真實權杖或學生資料放入測試、文件或版本庫。
# React 外殼開發

使用 Node.js 24 與 pnpm 11.19.0：`pnpm install --frozen-lockfile`、`pnpm dev`，開啟 `http://127.0.0.1:5173/next/`。原版入口與遊戲仍可使用。

驗證：`pnpm test`、`pnpm build`；產物預覽：`pnpm preview`。GitHub Pages 使用 `VITE_BASE_PATH=/knowledge-114/` 建置，CI 已設定。

詳見 [遷移進度](docs/MIGRATION_PROGRESS.md)與[入口載入清單](docs/migration-evidence/load-inventory.md)。首頁、教材、小遊戲、數學勇者、班級 RPG 與兩個偵探案件皆已有新版入口；舊頁仍保留回退。
