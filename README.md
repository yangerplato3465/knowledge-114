# 大耳狗教學網

Anita 老師的國小互動教學網站；React＋Vite＋TypeScript 多頁架構。

## 開發

使用 Node.js 24；pnpm 版本以 [package.json](package.json) 的 `packageManager` 為準。

- 安裝：`pnpm install --frozen-lockfile`
- 開發：`pnpm dev` → http://127.0.0.1:5173/
- 檢查：`pnpm check`、`pnpm test`、`pnpm build`
- 建置預覽：`pnpm preview` → http://127.0.0.1:4173/

## 部署

只發布建置後的 `dist`；直接發布原始 HTML／TSX 會造成空白頁。

- Netlify：[netlify.toml](netlify.toml) 指定 `pnpm build`、`dist`、根路徑 `/`。
- GitHub Pages：[workflow](.github/workflows/static.yml) 驗證並發布 `dist`，路徑為 `/knowledge-114/`。
- 部署後執行 `pnpm smoke:url <網站網址>`；Firebase 規則須另行發布。

## 文件

[專案導覽與分類](docs/README.md) · [暮光森林世界觀](docs/world/README.md) · [角色圖鑑與母圖](docs/world/characters.md) · [工作指引](AGENTS.md)
