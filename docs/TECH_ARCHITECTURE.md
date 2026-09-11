# TECH_ARCHITECTURE · 技術架構

---

## 一句話

**純靜態網站。沒有建置流程、沒有套件管理、沒有測試框架。**
HTML/CSS/JS 直接放上靜態主機就會動。

- 部署：GitHub repo `yangerplato3465/knowledge-114`，從根目錄靜態託管
- GitHub Actions 在部署前執行引用、JavaScript 語法與共用功能回歸檢查；遊戲操作與視覺仍須瀏覽器驗證。指令見 [README](../README.md)。
- 版號在 `config.json`（`version` + `lastUpdated`），首頁執行時 `fetch` 進來顯示。
  發版時要一起 bump，git tag 跟著同一個號

## 檔案結構

```
index.html                首頁（自帶 inline style，獨立於其他頁）
config.json               版號
CLAUDE.md                 給 AI 助理的架構不變式
pages/<name>.html         一課 / 一個遊戲一頁
assets/
  css/<name>.css          theme.css 是唯一共用的
  js/<name>.js            + <name>-pools.js 之類的資料檔
  js/detective/           偵探是唯一有子模組的
  images/<主題>/
  audio/music.mp3         10.7 MB（見下面的坑）
  vendor/pixi.min.js      PixiJS 8.20.1 UMD，818 KB（全域 PIXI）
  vendor/pixi.esm.min.js  PixiJS 8.6.6 ESM，666 KB（import）
  uploads/
docs/                     本批文件 + 三份既有深入文件
.claude/                  開發用腳本（不會部署）
```

**每一頁基本上是獨立的**，沒有共用元件框架。同名 helper 在不同頁是不同實作。

## 本地開發

伺服器：`.claude/serve.ps1`，固定 `http://localhost:8080/`。

```powershell
powershell -NoProfile -File "C:\Users\nini9\Work\knowledge-114\.claude\serve.ps1"
```

也可以用 `python -m http.server`。**用 `file://` 開不行** —— 首頁要 `fetch config.json`。

### ★ 連不上的時候先確認是不是還活著

`Get-NetTCPConnection -LocalPort 8080 -State Listen` 顯示 **OwningProcess = 4（System）
是正常的** —— `HttpListener` 把 prefix 註冊在 http.sys 核心層，不是使用者程序在監聽。
看到 4 不代表沒有伺服器。

- **逾時 = 卡死；connection refused = 真的沒開。**
- 重複啟動會噴 `conflicts with an existing registration`，那代表已經可以連了。
  現在 serve.ps1 有 preflight，會印 `Already serving...` 並乾淨退出。
- 錯誤寫在 `.claude/serve.log`。

**歷史地雷**：舊版 serve.ps1 是單執行緒 + 阻塞式 write。`assets/audio/music.mp3`
有 10.7 MB，頁面用 `<audio preload="auto">` 抓它，自動播放被擋掉後瀏覽器停止讀取
→ 那個 write 永遠不返回 → **整台伺服器再也不處理任何請求**。
2026-08-19 改寫成 runspace pool 多執行緒 + HTTP Range + 分塊串流 + `WriteTimeout`。

## 相依與載入順序

**沒有模組打包器。** 順序靠 `<script>` 標籤，而且有幾處**順序不能顛倒**：

| 頁面 | 順序 |
|---|---|
| math-rpg | `math-rpg-pools.js`（定義 `QUESTION_POOLS`）→ `math-rpg.js` |
| word-sort | `word-sort-pools.js`（定義 `WORD_SORT_POOLS`）→ `word-sort.js` |
| 所有頁 | `theme.js` 一律最後 |

例外：`class-rpg.js`、`class-rpg-game.js` 與 `assets/js/detective/*` 是
**ES module**（`type="module"`），用 `import` 而不是 `<script src>`。
Firebase 從 CDN import，**Pixi 從本地 `assets/vendor/pixi.esm.min.js`**。

## 第三方

| 東西 | 來源 | 為什麼 |
|---|---|---|
| PixiJS 8.20.1 UMD | **本地 `assets/vendor/pixi.min.js`** | 教室不一定有網路 |
| PixiJS 8.6.6 ESM | **本地 `assets/vendor/pixi.esm.min.js`** | 同上（2026-09-10 從 CDN 改過來） |
| Firebase 11.0.2 | gstatic CDN，ESM | |
| Google Fonts / Font Awesome | CDN | 掛掉只是變醜，可以賭 |

**為什麼 Pixi 要 vendor**：字型和圖示掛掉只是字醜、圖示變方框，遊戲照樣能玩；
**Pixi 掛掉是整個戰鬥區空白**。這兩件事的嚴重性差太多，不能一起賭。

代價：818 KB 是**完整包**。當時沒有 Node.js，未製作只含需要模組的瘦身版。低階機器要 parse 這 818 KB，
**這是導入 Pixi 唯一真正的成本**。

兩份版本不同是刻意的，理由與「ESM 那份為什麼副檔名是 `.js` 不是 `.mjs`」
都寫在 `assets/vendor/README.md`（有重新下載的指令）。**不要手改 vendor 裡的檔案。**

**`.mjs` 的地雷**：`serve.ps1` 的 MIME 表原本沒有 `.mjs`，回傳空的 Content-Type，
瀏覽器就依規範拒絕執行模組。已補上對應，但**新增任何模組檔請優先用 `.js` 副檔名** ——
正式主機可能有同樣的缺口，而且會用同樣的方式無聲失敗。

## Firebase

兩個地方用到，專案 `classroom-rpg-a931a`：

**班級 RPG** — Auth（老師登入）+ Firestore：

```
classes/{classId}                     ownerId 綁老師
classes/{classId}/students/{id}       學生角色
```

**偵探事件簿的解鎖碼** — 在 `pages/detective-admin.html` 產生（owner-only），
對 Firestore 驗證。

- 文件 ID = `PBKDF2(gameId + ':' + normalizedCode)`，推導邏輯在
  `detective/code.js`，**兩端共用**
- **改 `PEPPER`、迭代次數或正規化函式 = 所有已發出的碼全部失效**
- 規則在 `pages/firestore.rules.txt`（**不是自動部署的**）。
  `allow list: if isOwner()` 是防止有人 dump 整個碼表的那道鎖；
  `isOwner()` 是 email 允許清單，**發布規則前要先改**
- 未登入的 client 只能寫 `progress` / `progressAt`，且 `progress.size() <= 28`

## 偵探事件簿的架構

```
assets/js/detective/
  engine.js  ui.js  puzzles.js  interrogation.js  spotdiff.js  wave.js
  gate.js  code.js  admin.js
  cases/<case>.js        ← 只有資料，沒有 Pixi 程式碼
```

一個案件 = 三個都帶案件名的東西：
`pages/detective-<case>.html` + `cases/<case>.js` + `images/detective/<case>/`。

**`cases/*.js` 比其他檔深一層**，所以它的 `IMG` 常數要往回走三層
（`../../../images/detective/<case>/`）。引擎不寫死任何圖片路徑 ——
每張圖都從案件檔自己的 `IMG` 解析，換美術只要改一行。

### ★ 檔名可以改，id 不能

第一案的檔名是 `golden-owl` 但 id 是 `'owl'`，**這個不一致不准「整理掉」**。
id 餵進 `PBKDF2(id + ':' + code)` 和
`localStorage['detective.unlock.<id>']` / `detective.groups.<id>`，
**改了就讓所有已發出的碼失效、所有小組的存檔變孤兒**。

檔名隨時可以改；**id 在第一組碼發出去的那一刻就凍結了**。

### 頁面不直接載引擎

`detective-<case>.html` 載的是 `gate.js`，驗證解鎖碼通過後才 `import()` engine.js。
開發時設 `localStorage['detective.dev.<id>'] = '1'` 可繞過（不驗碼、不讀寫進度，
頂欄會標示「開發模式」）。

**只有 session 不算繞過** —— `readSession()` 一定要有 `codeId`，
否則任何殘留的 localStorage 都變成免費通行證。

### localStorage key

```
detective.unlock.<gameId>      本機這一組的 session（exp / codeId / label，不存明碼）
detective.groups.<gameId>      這台裝置記住的所有小組
detective.gateFocus.<gameId>
detective.dev.<gameId>         開發繞過
knowledge114-theme             深淺主題
tf-best                        快問快答最佳成績
```

**每次切換小組都走 `location.reload()`**，絕不原地換 —— 引擎的 state 是在模組
求值時建好的，重新指向另一份存檔等於要手動重設整個遊戲。

## 測試與驗證的實務

共用功能已有 Node.js 內建測試，以及 Python 靜態引用檢查（見 README）。遊戲實際可行的驗證做法（都在 `http://localhost:8080/` 上做）：

- **Pixi 遊戲可以用 `javascript_tool` 全自動玩過關。**
  `globalThis.__PIXI_APP__` 是標準勾子（`detective.js` 與 `word-sort-fx.js` 都有掛），
  從那裡拿 stage 走訪整棵樹找節點
- **瀏覽器窗格沒顯示時 rAF 是凍結的** → Pixi 從不 render → `hitTest` 全部失效。
  每次 dispatch 指標事件前要先 `app.render()`；場景轉場要手動
  `app.ticker.update(...)` 推完
- **CSS 動畫同樣受 rAF 凍結影響**，`getComputedStyle` 讀到的是起點不是終點，
  很容易誤判成 CSS 寫錯
- 版面驗證用 `getBoundingClientRect()` 量，比截圖精確
- `resize_window` **不會**自動觸發頁面的 resize 事件，要自己
  `dispatchEvent(new Event('resize'))`
- `javascript_tool` 跑在 isolated world：讀得到 DOM，**讀不到頁面的 `const`/`let` 全域**
（`function` 宣告掛在 window 上所以叫得到）

## 這台開發機的限制

| | |
|---|---|
| Node.js / npm / npx | 原環境未安裝；本次可使用 Codex 隨附的 Node.js 執行檢查。不同電腦請先確認 PATH；網站本身不依賴 Node。 |
| Python | 有，3.13.15 ARM64，**在 PATH 上**，含 Pillow 12.3 |
| ffmpeg | 有 |
| ImageMagick | 沒有 |

**不要用 PowerShell 讀寫含中文的原始碼。** Windows PowerShell 5.1 的
`Get-Content` 在檔案沒有 BOM 時預設用 cp950 解碼，這個專案的 js 全是
**無 BOM UTF-8 且滿是中文註解**，讀進來就變亂碼，寫回去等於整份毀掉
（2026-08-03 毀過 `detective-puzzles.js`）。`perl -0777 -i -pe` 配 `\x{...}`
逸出也有同一類的雙重編碼問題。
