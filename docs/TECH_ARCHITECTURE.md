# 架構

## 程式入口

- index.html 是介紹首頁；pages/activities.html 列學生活動，pages/teacher-tools.html 集中老師入口。各自使用 src/*-main.tsx；Vite 自動收集功能入口。
- src/lessons：兩個科學教材；src/games/math-rpg：維護頁、獨立題庫與題庫回歸測試；題庫不進維護頁依賴圖。
- src/features/materials：GitHub Contents API、可取消清單、序列化上傳／刪除；維持 main 分支的 assets/uploads 與 gh_upload_token key。
- src/features/class-rpg、detective：React DOM 配現役 imperative 模組；尚未全部改為 React hooks。僅以完整頁面切換使用，移除 script 不等於解除模組內部訂閱。
- assets/js/class-rpg-firebase.js：班級 Firebase；world-data.js 管訂閱，model.js 管成長，wander.js 管移動。
- assets/js/detective：案件、驗碼、存檔、謎題及 Pixi 引擎。資料契約見 [偵探指南](detective-authoring.md)。

## 載入與發布

- 首頁只含介紹／導覽／主題／版本；活動清單、老師工具、教材和遊戲分頁打包。config.json 只存版號，建置時嵌入，無日期或版本 API 請求。數學勇者維護頁不載入遊戲引擎；偵探驗碼後才載 engine。
- assets/css 由 Vite 打包；copy-static.mjs 只複製現役 runtime、媒體、素材及設定，排除開發文件與重複 CSS。素材庫中的使用者檔案保留。
- check-build.mjs 驗證全部入口、base 與禁用產物；check-performance-budget.mjs 限首頁功能 JS／CSS 各 12 KB、最大共用 chunk 240 KB，禁止首頁引入目錄資料與功能頁樣式。
- smoke-url.mjs 檢查全部入口、去重資源、MIME、404 與音訊 Range；本機 Vite fallback 才加 --allow-spa-fallback。
- tests/fixtures 僅作回歸基準，不發布。正式部署只取 dist；pages/firestore.rules.txt 不會自動發布成 Firebase 規則。

## 介面與資料

- UI 採柔和學習工作室風格：首頁只作介紹與引導；SiteHeader／SiteFooter 共用導覽；src/styles/base.css 是輕量共用樣式，global.css 僅首頁，directory.css 僅目錄，ui.css 僅功能頁，舊頁樣式放入 legacy cascade layer，確保開發與打包後優先序一致。主題取 assets/css/theme.css；局部深色變數需兼顧 data-theme 與 prefers-color-scheme。內容、表單與測試資料使用繁體中文。
- 班級集合：classes/{classId}/students/{studentId}，ownerId 隔離；批次獎勵與 rewardHistory 同交易，最多 100 人／40 筆紀錄。復原只限本堂獎勵且須全部學生仍符合 after 值。
- 成長由 model.js 推導 HP／ATK／DEF，固定 expOffset 保留舊生進度；不得每次獎勵重算補值。世界頁唯讀，不把每幀座標寫進 Firestore。
- 雲端驗證需要實際權限；本機測試只用模擬資料。
