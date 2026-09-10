# ART_STYLE · 配色、字體、素材流程

---

## 色彩：日系水藍色系

**唯一的真相來源是 `assets/css/theme.css`**，不要在頁面裡硬寫十六進位色。
（註：舊版 CLAUDE.md 寫的是「暖燕麥／布丁色系」，那已經被換掉了，以 theme.css 為準。）

命名來自日本傳統色：薄水色 usumizuiro／水色 mizuiro／空色 sorairo／御空色 misorairo。

| 用途 | 變數 | 淺色 | 深色 |
|---|---|---|---|
| 頁面底 | `--bg` | `#eaf2ef` | `#10141c` |
| 卡片 | `--surface` | `#ffffff` | `#1a2030` |
| 內嵌／hover | `--surface-2` | `#e8f1ef` | `#232c3e` |
| 邊框 | `--border` | `#d7e4ea` | `#2f3a4f` |
| 標題文字 | `--ink` | `#2f3e60` | `#e8eef7` |
| 內文 | `--ink-soft` | `#4a566c` | `#c3cddd` |
| 次要 | `--muted` | `#7e8ca0` | `#93a0b4` |
| 主色 | `--primary` | `#6d86c6` | `#93a9db` |
| 連結／重點 | `--accent` | `#4f86b5` | `#77a9d2` |

語意色 `--good` / `--bad` / `--warn` / `--info` 各自帶 `-bg` 與 `-border` 三件套，
深色模式有另外調過的可讀版本。按鈕漸層用 `--grad`。

### 頁面專屬色

每頁可以在 `body` 上宣告自己的重點色，但**必須用 theme.css 的變數當底**：

```css
/* quick-quiz：空色 */
body { --g1: #5b90c9; --g2: #93c1e6; }

/* word-sort：-ful 暖色、-less 冷色（冷暖對比本身就是提示） */
body { --ful: #d98026; --less: #3f7fb5; }
```

**頁面專屬色的深色版一定要寫兩次**（`[data-theme="dark"]` 和
`@media (prefers-color-scheme: dark)`），理由見 [UI.md](UI.md)。

## 字體

```
'Fredoka'（英數，400/600/700） + 'Noto Sans TC'（中文，400/500/700）
```

Fredoka 圓潤、對兒童友善，數字辨識度好。兩者都從 Google Fonts CDN 載。
圖示用 Font Awesome 6.5.1，另外大量使用 **emoji 當圖示** —— 不用下載、
跨平台有、對這個網站的調性剛好。

圓角一律偏大（卡片 32px、按鈕多為 999px 膠囊）。

## 圖片格式

**一律 WebP。** 檔案在 `assets/images/<主題>/`：

```
assets/images/
  char/          班級 RPG 角色圖集（Mana Seed）
  detective/<案件名>/   每個案件自己一個資料夾
  math-rpg/      六隻怪 + 勇者 + 劍氣 + 六張場景
  magic-ink/
  favicon.webp  logo.webp
```

**偵探的案件美術一定要各自一個資料夾。** 第一案的檔名是通用名
（`background1.webp`、`suspect1.webp`），第二案丟在旁邊會直接蓋掉。

## 素材製作流程（數學勇者）

用 Gemini 產圖 → 去背 → ffmpeg 轉 WebP → 進遊戲。
完整的產圖 prompt 與硬規則在 `assets/images/math-rpg/PROMPTS.md`。

### ★ 兩條去背路線，不能混用

這是這個專案最容易搞錯的一件事。

| 素材 | 底色 | 腳本 | 原理 |
|---|---|---|---|
| **角色**（hero / enemy） | **洋紅** | `.claude/math-rpg-keyer.ps1` | HSV 色相去背 |
| **發光特效**（slash） | **純黑** | `.claude/math-rpg-fx.sh` | 亮度轉 alpha |

**為什麼特效不能用門檻去背**：劍氣邊緣是連續光暈、沒有輪廓線，任何門檻都會在
「還看得見的微光」處切一刀留下硬邊。改用 `alpha = max(R,G,B)` 就沒有門檻 ——
純黑→全透明、白核心→全不透明，中間逐像素平滑過渡。

**為什麼用 `max` 而不是標準 luma**：藍色在 luma 只佔 0.07 權重，
會讓藍色光暈整片消失。

### ★ 特效不能畫在角色圖上

`keyer.ps1` 抓的是「全圖不透明像素的外框」再正規化高度。
特效畫進角色圖會把外框撐大，**角色本體就被等比縮小**（小巨龍的火焰踩過這個坑）。
所以劍氣是獨立的圖，也因此才能自己做飛行與淡出。

### 角色縮放表

`PROMPTS.md` 為每隻怪定了 `s`（縮放）與 `outH`（輸出高度），
讓體型差在畫面上讀得出來：

| 關 | 角色 | s | outH |
|---|---|---|---|
| 1 | 暗影小獸 | 0.68 | 348 |
| 2 | 骨翼渡鴉 | 0.76 | 389 |
| 3 | 提燈幽魂 | 0.83 | 425 |
| 4 | 骨龍 | 0.89 | 456 |
| 5 | 黑騎士 | 0.94 | 481 |
| 6 | 暗黑魔王 | 1.00 | 512 |

勇者 0.95。

### 場景圖

`.claude/math-rpg-stages.sh`（ffmpeg 批次）。輸出 **1600×286 寬扁帶狀**，
**裁切位置逐張手抓**，讓每張圖的地面線對齊角色腳底。理由見 [WORLD.md](WORLD.md)。

## 像素美術（班級 RPG）

Mana Seed Character Base，512×512 的 8×8 格。
**`scaleMode = 'nearest'`** —— 像素圖被平滑就毀了。切格規則見 [CHARACTERS.md](CHARACTERS.md)。

## 偵探事件簿的美術策略

**先向量、後換圖。** 場景先用程式畫的向量 props 做出來，正式美術到位時
把 props 換成 `{ t:'img', src: IMG + '…' }`，**熱點座標完全不用動**。
AI 展覽館現在就停在這個階段。

可用的圖形指令：

```js
{ t:'rect', x,y,w,h,c, r?,a?,s?外框色,sw? }   { t:'circle', x,y,rad,c }
{ t:'ellipse', x,y,rx,ry,c }                  { t:'poly', pts:[...],c }
{ t:'line', pts:[...],c,w }                   { t:'emoji', s,x,y,size,rot?,a? }
{ t:'text', s,x,y,size,c,weight?,ax?,ay? }    { t:'img', src,x,y,w,h,tint? }
```

`tint` 是乘上去的顏色，用來把平光的向量素材壓成房間的色溫（解密盤就是這樣做的）。

座標一律以 **960 × 600** 畫面為準；`objects` 的 `art` 座標以**物件左上角**為原點。

## 這台機器的影像工具

- **有** Python 3.13 + Pillow 12.3、ffmpeg（winget Gyan build）
- **沒有** ImageMagick、Node.js
- 逐像素運算（去背、羽化、找 alpha bbox）用 Python/Pillow 或
  PowerShell + 內嵌 C# 的 `System.Drawing`；裁切縮放轉檔用 ffmpeg 一行搞定
