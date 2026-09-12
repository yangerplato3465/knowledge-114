# UI · 介面語言與各頁硬限制

---

## 共用的東西

只有三樣是真正跨頁共用的，其他一律各頁自理。

| 檔案 | 內容 |
|---|---|
| `assets/css/theme.css` | 色票（CSS 變數）＋ 深色模式 |
| `assets/js/theme.js` | 深淺主題切換，注入右下角浮動鈕 |
| CDN | Google Fonts（Fredoka + Noto Sans TC）、Font Awesome 6.5.1 |

**沒有共用元件框架。** 同名的 helper（例如 `checkAnswer`）在不同頁面是
不同的實作、不同的簽章。**不要假設邏輯跨頁共用**，除非它來自 `assets/js` 的引入檔。

`assets/css/styles.css` 與 `assets/js/script.js` **只有 water-acid-base 在用**，
名字像共用檔但其實不是。

### 一頁的標準骨架

```html
<link rel="stylesheet" href="../assets/css/theme.css">
<link rel="stylesheet" href="../assets/css/<page>.css">
...
<a href="../index.html" class="back-link">回到學習主頁</a>
<script src="../assets/js/<page>.js"></script>
<script src="../assets/js/theme.js"></script>   <!-- 一律放最後 -->
```

## 首頁 `index.html`

自帶 inline `<style>` 的獨立頁面。結構是**分類 → 子群組 → 按鈕**：

```
教學內容
  ├─ 📚 課程          水與酸鹼 / 神奇的墨水
  └─ 🎮 互動學習小遊戲  數學勇者 / 極速博物館 / 字尾大分流 / 快問快答
偵探事件簿            黃金貓頭鷹 / AI 展覽館
素材                  素材下載 / 上傳素材
班級 RPG              班級冒險者管理
```

**新增一頁 = 建 `pages/<name>.html` ＋ 在對應的 `.subgroup-inner` 加一顆 `.page-btn`。**
子群組可折疊（`toggleSubgroup`），所以以後加案件首頁不會一直長高。

版號來自執行時 `fetch('config.json')`，顯示成 `v{version} · {lastUpdated}`。

## 深色模式

`theme.css` 用兩套選擇器：

```css
:root[data-theme="dark"]              { ... }   /* 手動切到深色 */
@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"])   { ... }   /* 跟隨系統，且沒手動選淺色 */
}
```

**頁面專屬的 CSS 變數必須把深色值寫兩次，照同一套規則。**
只寫前者的話，系統是深色但沒點過切換鈕的人會看到深色背景配淺色元件
（字尾大分流實際踩過這個坑）。

---

## 各頁的硬限制

### 偵探事件簿（最嚴格）

設計畫布 **960 × 600**。以下數字超過就跑版，**沒有自動處理**：

| 限制 | 值 | 說明 |
|---|---|---|
| 可互動範圍 | **y ≤ 446** | 下面 154px 是對話框與物品欄的地盤 |
| 對話框高度 | **70px 天花板** | 文字超過就被切 |
| 線索面板 | 一筆**一行** | |
| 物品欄 | **12 格** | 沒有翻頁 |

**`alpha = 0` 不等於退出 hit-test。** 預設的 `passive` 子樹會把 hit 吃掉又不回傳
target，搜尋就此停住掉回 stage，底下的熱點永遠輪不到 —— 症狀是「有時候點得開、
有時候沒反應」。**純裝飾的東西（滑鼠名牌、光暈、遮罩）一律要 `eventMode = 'none'`。**

場景層級（由下往上）：
`sceneLayer → boardLayer → hotLayer → objLayer → fxLayer → labelLayer → hudLayer → dragLayer → overlayLayer → closingLayer`

`objLayer` 必須疊在 `hotLayer` 上面，否則物件被拖到熱點上時會被吃掉。

完整清單見 [detective-authoring.md](detective-authoring.md)。

### 字尾大分流（觸控大電視）

這頁的版面規則是**功能需求不是美感偏好**，改動前先讀 `word-sort.css` 開頭註解。

- **滿版一屏永不捲動**（`100dvh` + `overflow: hidden`）—— 站著玩的人沒辦法一邊扶螢幕一邊捲頁
- **可按的東西全在畫面下三分之一**（靶區從 74~78% 高度起算）—— 上緣要墊腳才碰得到
- **點擊是主要操作，拖曳是附加的** —— 觸控電視的拖曳延遲很明顯
- **沒有 hover**，提示改成點下去才出現
- 字級一律 `clamp()` + `vmin`。1920×1080 下主字約 97px、靶區 65px
- `body.playing` 時隱藏 `.theme-toggle` —— 它固定右下角，正好壓在 `-less` 按鈕上
- 長按選字／右鍵選單／雙指縮放全部關掉

畫面由上而下：`topbar → 佇列 HUD → 舞台(卡片) → 收集籃 → 兩個大靶區`。
**收集籃的左右半邊必須對齊下面兩顆按鈕** —— 「按了哪一顆 → 東西掉進哪個陣列」
靠空間對應來讀。

### 極速博物館

任務卡尺寸是**算出來的**（`fitCards()`），不是寫死的：

| 常數 | 值 | 理由 |
|---|---|---|
| `CARD_MIN` | 104px | 再小就按不準 |
| `CARD_MAX` | 320px | 圖示與文字的 clamp 也都頂到上限了 |
| `WIDE_MAX` | 1.9 | 再寬中間會顯得空 |
| `ASPECT_MAX` | 0.90 | 再高就變成直立長條 |

**修復線固定 3 條、欄數固定**，這樣任務卡每關一樣大、位置也不會跳。
欄數浮動的話卡片得跟著縮，同一台電視上每關手感都不一樣。

提示訊息（toast）有完整的節流：`TOAST_LIFE 2200ms`、同訊息冷卻 2200ms、
不同訊息最小間隔 350ms、畫面上最多 3 則。

### 數學勇者

戰鬥區容器約 **6:1**，所以場景圖是 1600×286 的寬扁帶狀。

Pixi 上線後畫面分成**兩張 canvas ＋ DOM**：血條與題目按鈕**決定不搬進 Pixi**
（見 [math-rpg-pixi.md](math-rpg-pixi.md) 第 8 節）。

**已知缺口**：CSS 那邊有完整的 `prefers-reduced-motion` 區塊
（`.fx, .confetti { display: none }`），但 **Pixi 的粒子完全不受那個 media query 管**。
見 [TODO.md](TODO.md)。

### 快問快答

進度環半徑 42（`RING_CIRC = 2π × 42`）。秒數 1–60、題數上限 = 題庫總數。

---

## 動畫重播的通用手法

CSS 動畫要重播必須先移除 class、強制 reflow、再加回去：

```js
el.classList.remove('bump');
void el.offsetWidth;        // ← 沒這行的話兩次設定會被合併掉
el.classList.add('bump');
```

water-acid-base、字尾大分流都用這招。同一個道理也用在 FLIP 動畫的 Invert 階段。
## React 外殼預覽（2026-09-12）

原子筆教材已新增 `/next/magic-ink.html`。沿用既有教材圖文與版型，冷知識／隨堂考、吸水大賽、彩虹橋改由 React 管理；猜測選項使用可鍵盤操作按鈕與 aria-pressed，結果使用 status。圖片保留 lazy 策略並補齊固有尺寸，reduced-motion 停用教材動畫過渡。

快問快答已新增 `/next/quick-quiz.html`：React 管理設定、倒數環、題目與揭答。維持老師帶領口頭是非題、不計分的流程；設定／題目／結果切換移動焦點，揭答提供 status，操作按鈕至少 48px，reduced-motion 停用倒數環過渡動畫。原遊戲入口保留。

`/next/` 使用原有 `assets/css/theme.css` 作為色彩唯一來源。主題選單提供系統／淺色／深色，沿用 `knowledge114-theme` 並支援跨分頁同步；導覽提供跳至主要內容與可見 focus。現已移植完整四分類、11 個活動及版號；分類使用 button 與 hidden，支援鍵盤展開且收合內容不進入 Tab 順序。活動仍以完整頁面導覽進入舊遊戲，尚未更動遊戲 HUD 或教室觸控版面。
