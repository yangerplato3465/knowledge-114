# assets/vendor

第三方函式庫的本地副本。**不要改這裡的檔案**，要換版本就重新下載。

這裡有**兩份 PixiJS，格式不同、給不同的載入方式用**，不是重複：

| 檔案 | 版本 | 格式 | 誰在用 |
|---|---|---|---|
| `pixi.min.js` | 8.20.1（818 KB） | UMD，掛全域 `PIXI` | 數學勇者、字尾大分流（`<script src>`） |
| `pixi.esm.min.js` | 8.6.6（666 KB） | ESM，`import {} from` | 偵探事件簿、班級 RPG（`type="module"`） |

版本不同是**刻意的**：2026-09-10 把偵探與班級 RPG 從 CDN 改成本地時，
刻意抓了跟原本 CDN 完全相同的 8.6.6，讓那次改動**純粹只是拿掉網路依賴、
零行為變化**。要升到 8.20.1 是另一件事，該單獨做、單獨測 ——
把「拿掉網路依賴」和「升級函式庫」混在一次改，出問題會分不清是哪個造成的。

## 抓下來的指令

```bash
# UMD（全域 PIXI）
curl -sL "https://cdn.jsdelivr.net/npm/pixi.js@8.20.1/dist/pixi.min.js" -o assets/vendor/pixi.min.js
sed -i 's|//# sourceMappingURL=pixi\.min\.js\.map||' assets/vendor/pixi.min.js

# ESM（import）—— 注意副檔名刻意用 .js 不是 .mjs，見下面
curl -sL "https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs" -o assets/vendor/pixi.esm.min.js
sed -i 's|//# sourceMappingURL=pixi\.min\.mjs\.map||' assets/vendor/pixi.esm.min.js
```

（`sed` 那行拿掉 sourcemap 註解 —— `.map` 檔沒有一起下載，留著只會在 devtools 噴 404。）

## ★ ESM 那份為什麼副檔名是 .js 不是 .mjs

**因為 `.mjs` 會被靜態主機餵成空的 Content-Type，瀏覽器就依規範拒絕執行它。**

實際踩到的（2026-09-10）：檔案原本命名 `pixi.min.mjs`，`serve.ps1` 的 MIME 表
沒有 `.mjs` 這一項 → 回傳空的 Content-Type → 瀏覽器噴
`Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of ""`
→ 整個偵探引擎載不起來。

`serve.ps1` 已經補上 `.mjs` 對應，但**正式主機可能有一模一樣的缺口，
而且會用一模一樣的方式無聲失敗**。`.js` 是每一台靜態主機都保證處理對的副檔名，
而瀏覽器判斷「這是不是模組」是看 `type="module"` 與 MIME，**不是看副檔名**，
所以叫 `.js` 完全合法。

### 為什麼不用 CDN

這個遊戲要在學校電腦跑，**教室不一定有網路**。

頁面現在確實還吃 Google Fonts 和 FontAwesome 的 CDN，
但那兩個掛掉只是字醜、圖示變方框，遊戲照樣能玩。
Pixi 掛掉是**整個戰鬥區空白** —— 這兩件事的嚴重性差太多，不能一起賭。

順帶一提，這台機器沒有 Node.js（`npm install` 跑不了），所以只能用 curl 手動抓。
也因此**沒辦法自己 build 一份只含需要模組的瘦身版**，818 KB 是完整包。
低階機器要 parse 這 818 KB，這是導入 Pixi 唯一真正的成本。
