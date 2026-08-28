# assets/vendor

第三方函式庫的本地副本。**不要改這裡的檔案**，要換版本就重新下載。

## pixi.min.js — PixiJS 8.20.1（818 KB）

抓下來的指令：

```bash
curl -sL "https://cdn.jsdelivr.net/npm/pixi.js@8.20.1/dist/pixi.min.js" -o assets/vendor/pixi.min.js
sed -i 's|//# sourceMappingURL=pixi\.min\.js\.map||' assets/vendor/pixi.min.js
```

（第二行拿掉 sourcemap 註解 —— `.map` 檔沒有一起下載，留著只會在 devtools 噴 404。）

### 為什麼不用 CDN

這個遊戲要在學校電腦跑，**教室不一定有網路**。

頁面現在確實還吃 Google Fonts 和 FontAwesome 的 CDN，
但那兩個掛掉只是字醜、圖示變方框，遊戲照樣能玩。
Pixi 掛掉是**整個戰鬥區空白** —— 這兩件事的嚴重性差太多，不能一起賭。

順帶一提，這台機器沒有 Node.js（`npm install` 跑不了），所以只能用 curl 手動抓。
也因此**沒辦法自己 build 一份只含需要模組的瘦身版**，818 KB 是完整包。
低階機器要 parse 這 818 KB，這是導入 Pixi 唯一真正的成本。
