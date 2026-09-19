# 本地 PixiJS

| 檔案 | 版本 | 用途 |
|---|---|---|
| pixi.esm.min.js | 8.20.1 | ESM；偵探、班級世界與數學勇者佔位戰場 |

僅保留現役 ESM 引擎。教室可能斷網，不改成 CDN runtime。
升版從 pixi.js 官方套件取得完整 dist，保留授權註解；不要手改壓縮內容。未附 map 時移除 sourceMappingURL，避免偵錯工具 404。
ESM 使用 .js 名稱；發布需確保 JavaScript MIME。變更後驗證引擎版本、偵探與班級世界入口、canvas 清理與完整建置。
