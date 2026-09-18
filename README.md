# 大耳狗教學網

Anita 老師的國小互動教學網站，使用 React + Vite + TypeScript。

## 開發

需要 Node.js 24、pnpm 11.19.0。

- 安裝：pnpm install --frozen-lockfile
- 啟動：pnpm dev → http://127.0.0.1:5173/
- 驗證：pnpm check、pnpm test、pnpm build
- 產物預覽：pnpm preview → http://127.0.0.1:4173/

所有入口都是 React；請透過 Vite 啟動，不要直接開 HTML 或用靜態伺服器提供原始碼。

## 維護

- [AGENTS.md](AGENTS.md)：工作指引與資料限制。
- [架構](docs/TECH_ARCHITECTURE.md)、[遊戲規則](docs/GAMEPLAY.md)、[偵探製作](docs/detective-authoring.md)、[待辦](docs/TODO.md)。
- [本地引擎](assets/vendor/README.md)。數學勇者目前維護中，題庫保留於 src/games/math-rpg/questions.ts；新玩法與介面待討論。

GitHub Actions 驗證後發布 dist 至 GitHub Pages；VITE_BASE_PATH=/knowledge-114/。修改不代表已推送或部署。版本標籤取 config.json，只顯示版號。Firebase 規則另行發布。
