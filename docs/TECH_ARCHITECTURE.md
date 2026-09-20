# 網站架構

React＋Vite 多頁網站，瀏覽器直連 GitHub／Firebase，無前端 Router。`index.html`／`pages/*.html` 由 `src/*-main.tsx` 掛載，[Vite](../vite.config.ts) 自動收集入口。

## 模組定位

| 功能 | 程式位置 | 邊界 |
|---|---|---|
| 首頁、學生活動、老師工具 | `src/app`、`src/content` | 首頁不載入活動／老師清單；目錄分頁載入 |
| 導覽、主題 | `src/components`、`src/features/theme` | `SiteHeader` 學生導覽、`TeacherHeader` 老師導覽、`ActivityTrail` 返回活動；`PageLayout` 組版 |
| 科學教材 | `src/lessons` | React 內容與互動，各教材獨立入口 |
| 素材上下載 | `src/features/materials` | GitHub Contents API；清單可取消，寫入依序執行 |
| 數學勇者 | `src/games/math-rpg` | 五關試玩版；`battle.ts` 純函式戰鬥／數值、React 操作、本地 Pixi 佔位戰場；`question-deck.ts` 管理五上／六上單元，五上小數、因數與倍數動態題庫開放 |
| 班級／偵探 | `src/features/class-rpg`、`src/features/detective` | React 外殼接 `assets/js/class-rpg*`／`assets/js/detective`；仍有直接操作 DOM 的模組 |

## 載入與樣式

- 首頁依賴隔離由 Vite 檢查；體積上限見 [效能預算](../scripts/check-performance-budget.mjs)。版本由 [config.json](../config.json) 建置時嵌入，僅顯示版號。
- `LegacyModule` 只管理 script 標籤；班級／偵探須完整頁面切換，不能假設 React 卸載已解除訂閱。偵探驗碼與讀進度完成後才載引擎。
- 配色在 `assets/css/theme.css`；`src/styles` 內 `base.css` 共用、`global.css` 首頁、`directory.css` 目錄、`ui.css` 功能覆寫；舊樣式置於 `legacy` layer。
- 班級／偵探使用本地 [Pixi ESM](../assets/vendor/README.md)，Firebase SDK 仍需 CDN／網路。
- Vite 產生 HTML／JS／CSS，[copy-static](../scripts/copy-static.mjs) 補入現役資源與素材；[check-build](../scripts/check-build.mjs) 檢查入口與禁用產物。發布方式見 [README](../README.md#部署)。

## 資料契約

- 素材：`api.ts` 讀寫 `main` 的 `assets/uploads`，下載取 GitHub 原始檔；權杖 key 為 `gh_upload_token`，與部署平台無關。
- 班級：`classes/{classId}/students/{studentId}` 以 `ownerId` 隔離；獎勵與 `rewardHistory` 同交易，復原驗證所有 after 值；限制見 `assets/js/class-rpg.js`。
- 成長只由 `class-rpg-model.js` 計算，`expOffset` 保留舊生進度；世界頁唯讀，`class-rpg-world-data.js` 忽略過期訂閱，不把每幀座標寫入雲端。
- 偵探的 ID、驗碼、存檔欄位與遷移要求集中於 [偵探指南](detective-authoring.md)；`pages/firestore.rules.txt` 不會隨網站部署自動生效。

## 擴充前的注意事項

- 保留多頁隔離；改 SPA 前須先處理班級／偵探的初始化與銷毀。
- 抽取 `src/*-main.tsx` 的重複掛載程式時，保留 StrictMode 差異與獨立 CSS。
- `ui.css` 可依功能拆分以減少分頁載入量；首頁已隔離。
