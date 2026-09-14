# React + Vite + TypeScript + PixiJS 一次性架構遷移計畫

> 性質：一次性執行文件。完成遷移並將仍有效的架構決策回寫至 `TECH_ARCHITECTURE.md`、`DECISIONS.md`、`UI.md` 後，本文件即可封存；它不是新的永久規則來源。

## 1. 目標

在不破壞現有遊戲、存檔、Firebase 權限、教室離線可玩性與既有網址的前提下，建立新的 **React + Vite + TypeScript** 外殼，讓數學勇者、班級 RPG、偵探事件簿及未來小型遊戲都以 **PixiJS v8** 為主要遊戲渲染基礎。

本次遷移同時導入：

- 可重用的網站外殼、遊戲頁面、HUD、題目、對話框與設定元件；
- React 與 PixiJS 之間明確、低頻、可測試的事件邊界；
- 頁面／遊戲層級的程式碼分割；
- 圖片、音訊、字體與快取策略；
- Core Web Vitals、bundle 與 Pixi 執行效能的量測和回歸門檻；
- GitHub Actions 建置、檢查與 GitHub Pages 部署流程。

## 2. 非目標

第一輪遷移不得同時進行以下工作：

- 重做遊戲規則、題庫、戰鬥平衡或美術；
- 改 Firebase schema、Firestore 權限模型或解鎖碼演算法；
- 改偵探案件 ID、localStorage key 或既有存檔格式；
- 為了 React 而把所有 Pixi DisplayObject 改寫成 JSX；
- 同時統一 PixiJS 8.20.1 與 8.6.6；
- 將 DOM 血條、題目按鈕、登入與表單搬入 Canvas；
- 更換主機、CDN、Firebase 專案或正式網址。

上述事項若要進行，必須在架構外殼穩定後分成獨立變更、獨立測試。

## 3. 現況基準

盤點時網站為純靜態、多頁式 HTML/CSS/JavaScript：

- 16 個 HTML 頁面；
- 31 個 `assets/js` JavaScript 檔案；
- 10 個 `assets/css` CSS 檔案；
- 169 個本機資源引用，靜態引用檢查為 0 錯誤；
- 36 個 JavaScript 區塊通過語法檢查；
- 21 個既有 Node 回歸測試通過；
- PixiJS UMD 8.20.1 約 818 KB，ESM 8.6.6 約 666 KB；
- `assets/audio/music.mp3` 約 10.7 MB，是目前最大的線上資源；
- GitHub Actions 直接部署靜態檔案，尚無前端 build step。

遷移開始前，將上述檢查結果與代表頁面截圖保存為 baseline。若可取得正式網址，另記錄 PageSpeed Insights／CrUX 的 field data；若沒有 field data，只能稱為 lab baseline。

## 4. 核心架構決策

### 4.1 React 負責 DOM 與網站外殼

React 負責：

- 首頁、導覽、路由與頁面 layout；
- 題目、答案按鈕、血條、分數、計時器及結算；
- 表單、登入、教師管理、Modal、Toast 與錯誤訊息；
- 主題、鍵盤操作、螢幕閱讀器與 `prefers-reduced-motion` 設定；
- Firebase 資料訂閱與畫面狀態；
- 載入、錯誤與離線 fallback UI。

React state 不得作為每幀 Sprite 座標、粒子或動畫時間的資料來源。

### 4.2 PixiJS 負責高頻遊戲世界

PixiJS 負責：

- 場景、地圖、角色、敵人、Sprite 與粒子；
- ticker、相機、座標、命中測試、濾鏡與戰鬥動畫；
- 高頻移動與每幀更新；
- GPU 資源、紋理載入、場景切換及釋放。

每個遊戲至少提供以下 lifecycle：

```ts
export interface GameController {
  mount(container: HTMLElement): Promise<void>;
  resize(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

React component 在 mount 時建立 controller，在 unmount 時取消 ticker／事件／訂閱並呼叫 `destroy()`。重新建立 Pixi Application 時必須正確釋放全域資源。

### 4.3 `@pixi/react` 採選用，不是全站強制

適合使用 `@pixi/react`：

- 場景可自然表示為少量、穩定的 JSX 節點；
- 棋盤、卡牌、配對或選單型小遊戲；
- 畫面主要由低頻狀態決定；
- 元件重用價值高於每幀更新成本。

保留原生 PixiJS：

- 數學勇者的戰鬥、濾鏡與粒子；
- 班級 RPG 的多人移動世界；
- 偵探引擎既有場景與解謎互動；
- 每幀大量更新或已有成熟 imperative engine 的功能。

不要只為了 JSX 外觀重寫穩定的 Pixi engine。新遊戲需在設計階段選擇 declarative `@pixi/react` 或 imperative Pixi controller。

### 4.4 第一階段保留多頁／完整 reload 語意

初期採 Vite 可建置的多入口或具備完整 reload escape hatch 的架構，不強制所有功能成為永不 reload 的 SPA。偵探事件簿切換小組仍必須執行完整 reload，直到另有獨立設計與驗證證明可以安全改變。

GitHub Pages 子路徑必須透過 Vite `base` 正確處理。若使用 browser history routing，需同時解決 Pages deep-link fallback；第一階段優先保留實體輸出路徑或使用不破壞既有網址的策略。

## 5. 目標目錄

```text
knowledge-114/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── images/
│   ├── audio/
│   ├── uploads/
│   └── config.json
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   ├── layouts/
│   │   └── providers/
│   ├── components/
│   │   ├── GameShell/
│   │   ├── QuestionPanel/
│   │   ├── HealthBar/
│   │   ├── PauseMenu/
│   │   ├── ResultDialog/
│   │   └── ErrorBoundary/
│   ├── games/
│   │   ├── core/
│   │   │   ├── GameController.ts
│   │   │   ├── PixiHost.tsx
│   │   │   ├── AssetLoader.ts
│   │   │   ├── AudioManager.ts
│   │   │   └── game-events.ts
│   │   ├── math-rpg/
│   │   ├── class-rpg/
│   │   ├── detective/
│   │   └── word-sort/
│   ├── features/
│   │   ├── theme/
│   │   ├── firebase/
│   │   ├── storage/
│   │   └── reduced-motion/
│   ├── content/
│   │   ├── questions/
│   │   ├── lessons/
│   │   └── detective-cases/
│   ├── pages/
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── utilities.css
│   └── main.tsx
├── tests/
├── scripts/
├── docs/
└── dist/                 # 產物，不作為手動編輯來源
```

實際遷移時不要先移動全部素材。先讓 Vite 接管建置，再按頁面搬移，避免一次產生大量失效路徑。

## 6. 狀態與事件邊界

### React → Pixi

使用具型別的 command，不直接讓 Pixi 讀 React component 內部狀態：

```ts
type GameCommand =
  | { type: 'answer-selected'; answerId: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'set-reduced-motion'; enabled: boolean };
```

### Pixi → React

只發送 UI 或保存需要的低頻事件：

```ts
type GameEvent =
  | { type: 'ready' }
  | { type: 'health-changed'; current: number; max: number }
  | { type: 'question-requested'; questionId: string }
  | { type: 'stage-completed'; stage: number }
  | { type: 'fatal-error'; message: string };
```

禁止把 pointer move、粒子位置或每幀角色座標送進 React state。若 React 需要觀察遊戲狀態，使用節流後的 snapshot 或明確事件。

## 7. 必須保留的資料契約

- `knowledge114-theme`、`tf-best` 及偵探相關 localStorage key 保持相容。
- 黃金貓頭鷹檔名可調整，但 game ID `'owl'` 不得更改。
- `PEPPER`、PBKDF2 迭代次數及正規化函式不得在架構遷移中改動。
- `saveBlocked`、寫入失敗離站保護與 Firestore 權限語意保持不變。
- 偵探 `SAVE_VERSION` 只有在存檔 shape 真正改變時才更新，並需要 migration／fallback 測試。
- Firestore `progress.size() <= 28` 限制需納入測試。
- 題庫與遊戲平衡先保持資料等價，不趁 TypeScript 化重新調整數值。

## 8. 效能優化計畫

### 8.1 量測原則

區分 field 與 lab：

- field：CrUX、PageSpeed Insights field data、Search Console 或站內 `web-vitals` RUM；
- lab：Lighthouse、Chrome Performance/Network、bundle report、React Profiler、Pixi FPS／draw calls／GPU memory。

不得以單次 Lighthouse 分數宣稱 Core Web Vitals 通過。field pass 以第 75 百分位為準：

- LCP ≤ 2.5 秒；
- INP ≤ 200 ms；
- CLS ≤ 0.1。

Lighthouse 的 TBT 只能作為 INP 的 lab proxy。

### 8.2 程式碼分割

- 首頁與普通課程不得載入 PixiJS、Firebase admin 或其他遊戲程式碼。
- 每個遊戲以 route／entry dynamic import 形成獨立 chunk。
- 偵探引擎維持驗證通過後才載入的安全與效能特性。
- `@pixi/react`、Firebase、教師管理與大型內容資料按實際頁面延遲載入。
- 建置後檢查 chunk duplication；不要因每個遊戲各自 import 而輸出多份 Pixi core。
- 切分不得製造「入口載入 → 小 chunk → 才發現關鍵資源」的 request waterfall。

### 8.3 PixiJS

- 遷移初期維持既有版本與行為；統一版本是後續獨立階段。
- 統一後使用 npm/pnpm 套件與 ESM import，刪除 UMD／ESM 雙 vendor 前必須完成所有遊戲驗收。
- `extend()` 只註冊 `@pixi/react` 真正使用的 Pixi 類別。
- 不在 React render 中無條件建立 Texture、Graphics 或 callback。
- 動態文字頻繁更新時評估 BitmapText；一般可存取文字仍優先 DOM。
- 大量生成物件採 pooling；離場物件正確解除事件、移除並釋放。
- 依實測決定 culling、cacheAsTexture、resolution 與 antialias，不先全面啟用。
- 補上 Pixi 粒子和 ticker 對 `prefers-reduced-motion` 的統一控制。

### 8.4 圖片、音訊與字體

- 保留 WebP；針對效益明確的大圖評估 AVIF，並保留相容 fallback。
- 所有 DOM 圖片提供正確 intrinsic size 或 `aspect-ratio`，防止 CLS。
- 使用 `srcset`／`sizes` 避免在小螢幕下載桌面尺寸圖片。
- 首屏真正的 LCP 圖片不得 lazy-load；非首屏圖片與 iframe 才延遲載入。
- Pixi scene 只預載即將顯示的必要 texture，其餘背景載入；維持偵探目前先載 boot scene 的策略。
- 檢查 10.7 MB 音訊是否需要 `preload="none"`／`metadata`、位元率調整或按使用者操作才載入；不能重現舊伺服器阻塞問題。
- Google Fonts／Font Awesome 是否本地化需以離線需求、授權及 bundle 成本另行決定。

### 8.5 快取與壓縮

GitHub Pages 實際 response header 可控程度需先驗證；不得只寫設定卻未檢查線上回應。若未來導入可控 CDN／反向代理，建議：

- 具內容雜湊的 JS、CSS、圖片：`public, max-age=31536000, immutable`；
- HTML／manifest：短 freshness 或 `no-cache` 搭配 validator；
- 私人或個人化回應：依資料性質使用 `private` 或 `no-store`；
- Brotli／gzip 用於可壓縮文字，不重複壓縮已壓縮媒體。

`no-cache` 表示可儲存但使用前必須重新驗證；`no-store` 才是禁止儲存。不得對內容會變、URL 不變的資源設定 `immutable`。

### 8.6 暫定效能預算

以下只作第一輪警戒線，完成 baseline 後再定案，不應在沒有數據時當成絕對標準：

- 首頁初始路徑不包含 PixiJS 或 Firebase 遊戲模組；
- 每個遊戲只載入自己的邏輯與必要素材；
- 建置不得輸出重複的 Pixi runtime；
- 新增圖片必須有尺寸、格式與載入策略；
- production build 不得出現意外的 source-map 404；
- 同條件 lab 測試不得讓 LCP、TBT、CLS 或初始 JS 明顯退步；
- 低階教室設備需維持可操作幀率，FPS 門檻須由代表設備實測決定。

## 9. UI/UX 與無障礙門檻

- 可操作目標原則上至少 44 × 44 CSS px，特殊遊戲目標另依教室觸控設備放大。
- 不依賴 hover 傳達必要資訊。
- DOM 文字、題目與表單保留語意標籤、可見 focus、鍵盤順序及錯誤提示。
- Pixi canvas 需要對應名稱、操作說明和必要的 DOM fallback／狀態摘要。
- 顏色不能是唯一的成功、錯誤或遊戲狀態訊號。
- 動畫需尊重 reduced motion；停用裝飾粒子時不得破壞遊戲規則回饋。
- 維持目前觸控大電視的按鈕位置、尺寸及不捲動需求，除非另有教師端實機驗收。
- theme token 保持單一來源，React component 不散落硬編碼色碼。

## 10. 分階段執行

### Phase 0：凍結與 baseline

- [ ] 建立遷移分支或可回退工作區。
- [ ] 執行現有 `check_site.py`、`check_js.cjs` 與 Node tests。
- [ ] 記錄首頁、數學勇者、班級 RPG、字尾大分流、兩個偵探案件的主要流程。
- [ ] 記錄 localStorage／Firestore 契約與版本。
- [ ] 蒐集代表頁面的 lab performance；有正式 field data 時另外保存。
- [ ] 列出各頁載入的 JS、CSS、Pixi 版本、Firebase 與大型素材。

完成條件：現況有可重現的功能與效能基準，且沒有未解釋的既有測試失敗。

### Phase 1：只建立新外殼

- [ ] 建立 React + Vite + TypeScript 設定。
- [ ] 設定 GitHub Pages base path、production build 與 preview。
- [ ] 將現有靜態素材暫時以相容路徑提供，不大搬家。
- [ ] 建立 ErrorBoundary、GameShell、ThemeProvider 與 PixiHost lifecycle。
- [ ] 新舊網站可並行啟動，舊版仍是可用 fallback。
- [ ] 更新 CI：先執行舊測試，再 typecheck、build，最後上傳 `dist`。

完成條件：空的 React 外殼可建置並部署，不影響舊頁面。

### Phase 2：首頁與共用 DOM

- [ ] 搬首頁、版號、主題切換、導覽和共用按鈕。
- [ ] 抽出 layout、Modal、Toast、載入與錯誤狀態。
- [ ] 保持原 URL 或建立明確 redirect／相容入口。
- [ ] 驗證鍵盤、觸控、深色模式、系統主題與跨分頁同步。

完成條件：不載入任何遊戲時，首頁 chunk 不含 PixiJS 與 Firebase 遊戲碼。

### Phase 3：先搬簡單頁面與小遊戲

- [ ] 普通教學頁。
- [ ] 快問快答。
- [ ] 字尾大分流；Pixi 特效先透過 imperative controller 接入。
- [ ] 素材下載／上傳頁。
- [ ] 補齊舊測試對 React DOM 的等價覆蓋。

完成條件：簡單頁面功能等價，且能示範共用元件與 route-level splitting。

### Phase 4：數學勇者

- [ ] 先抽離題庫、規則、戰鬥模型與 Pixi renderer 邊界。
- [ ] React 接手題目、血條、選卡、設定與結果 UI。
- [ ] 現有 Pixi 戰鬥保持 imperative，不在首次遷移改成 `@pixi/react`。
- [ ] 保留兩 canvas + DOM 的既有決定。
- [ ] 加入 reduced-motion command，統一停用裝飾粒子。
- [ ] 跑完整數值模擬、功能測試與瀏覽器手感驗收。

完成條件：題數、傷害、卡池、關卡結果與舊版等價；Pixi lifecycle 可安全重進頁面。

### Phase 5：班級 RPG

- [ ] React 管理登入、名冊、教師操作及錯誤回復。
- [ ] Pixi 管角色世界與高頻移動。
- [ ] Firebase subscription 與 Pixi entity 之間使用 adapter，不互相直接依賴。
- [ ] 維持 owner 驗證、切班取消舊 subscription 與交易一致性。
- [ ] 新玩法另開功能變更，不混進架構搬遷。

完成條件：既有 21 項回歸測試及新增 lifecycle／訂閱測試通過。

### Phase 6：偵探事件簿

- [ ] 保留 gate 驗證通過後才 dynamic import engine。
- [ ] 保留完整 reload 的小組切換。
- [ ] 保留 `saveBlocked`、flush-before-leave 與離線可玩語意。
- [ ] 案件資料保持純資料模組，engine 不硬編碼圖片路徑。
- [ ] 驗證兩案完整流程、錯誤指控、結局、存檔恢復與權限失敗。

完成條件：既有解鎖碼和存檔可讀，Firebase 規則未被客戶端架構繞過。

### Phase 7：Pixi 統一與進階優化

- [ ] 在獨立變更中將兩份 Pixi 統一到經驗證版本。
- [ ] 確認所有 import、filters、ParticleContainer 與 renderer 行為。
- [ ] 確認產物只含一份 Pixi runtime 或能解釋例外。
- [ ] 評估 spritesheet、pooling、culling、BitmapText、prepare upload。
- [ ] 刪除舊 vendor 前保留可回退 commit／tag。

完成條件：所有遊戲功能、視覺、FPS、記憶體與載入驗收通過。

### Phase 8：切換部署與收尾

- [ ] GitHub Actions 執行 lint、typecheck、unit tests、build、引用檢查與 Pages upload。
- [ ] PR 不部署正式站；main 或手動工作流才部署。
- [ ] production smoke test 驗證 base path、MIME、404、音訊 Range、Firebase 與動態 chunk。
- [ ] 對比 baseline，標示 field／lab 數據來源。
- [ ] 更新正式架構文件與決策紀錄。
- [ ] 移除已無引用的舊檔前，再跑引用掃描與完整遊戲驗收。
- [ ] 封存本一次性文件。

## 11. 測試矩陣

每一階段至少覆蓋：

| 類型 | 驗證內容 |
|---|---|
| 靜態 | 路徑、重複 ID、遺失素材、production chunk 404 |
| TypeScript | `tsc --noEmit` 或專案 typecheck |
| 單元 | 題庫、戰鬥模型、存檔轉換、Firebase adapter |
| React | 主題、表單、HUD、ErrorBoundary、route lazy loading |
| Pixi | mount/destroy/re-enter、ticker、resize、事件清除、texture lifecycle |
| 整合 | 答題→攻擊→結算、登入→名冊→世界、解鎖→存檔→恢復 |
| 無障礙 | 鍵盤、focus、名稱、對比、reduced motion |
| 視覺 | 1920×1080 教室螢幕、一般桌機、窄螢幕 |
| 效能 | Lighthouse、trace、bundle report、代表設備 FPS |
| 部署 | GitHub Pages 子路徑、直接開啟 URL、重新整理、離線退化 |

## 12. 回退策略

- 每個 phase 使用獨立、可審查變更；不得等全部完成才第一次可部署。
- 新舊入口並存期間，保留舊頁面作為 fallback。
- 不刪除舊素材或 vendor，直到新產物通過完整引用與遊戲驗收。
- 資料格式保持向後相容；若不得不升級，先提供 migration 並保留舊讀取路徑。
- 發現存檔、Firebase 權限、解鎖碼或遊戲結果不一致時，停止該 phase，不進入下一階段。
- Core Web Vitals 或代表設備 FPS 明顯退步且找不到根因時，回退該 causal cluster，不用其他微調掩蓋。

## 13. 最終完成定義

只有在以下條件全部成立後，才視為架構遷移完成：

- 所有正式頁面由新 build 產物提供，既有重要 URL 可用；
- 現有測試及新增 React／Pixi lifecycle／整合測試通過；
- 數學勇者、班級 RPG、字尾大分流與兩個偵探案件完成實機流程驗收；
- 舊解鎖碼、存檔、localStorage 與 Firebase 權限保持相容；
- 首頁不載入 Pixi 或遊戲專屬 chunk；
- 每個遊戲按需載入，沒有非預期重複 Pixi runtime；
- production 沒有動態 chunk、MIME、base path 或 source-map 404；
- reduced motion 同時控制 DOM 與 Pixi 裝飾動畫；
- 效能報告清楚區分 field 與 lab，並提供同條件前後比較；
- `TECH_ARCHITECTURE.md`、`DECISIONS.md`、`UI.md` 已反映新架構；
- 本文件被標記完成並封存，不再成為與正式文件競爭的第二套規則。

## 14. 執行時參考來源

開始實作時應重新核對最新官方文件，不在本計畫中永久鎖死套件版本：

- React + TypeScript：https://react.dev/learn/typescript
- React 從 Vite 建立：https://react.dev/learn/build-a-react-app-from-scratch
- PixiJS React：https://react.pixijs.io/getting-started/
- PixiJS API：https://pixijs.download/release/docs/llms.txt
- GitHub Pages custom workflow：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Core Web Vitals：https://web.dev/articles/vitals
- HTTP Cache-Control：https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control

