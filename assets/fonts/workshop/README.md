# 工作坊展示字體

`workshop-rounded.woff2` 是供魔法工坊使用的繁體中文圓體子集，依 SIL Open Font License 1.1 發布，完整授權見 `OFL.txt`。

來源：[justfont / jf open 粉圓 1.1](https://github.com/justfont/open-huninn-font/blob/master/font/jf-openhuninn-1.1.ttf)。子集字體已更名為 **Workshop Rounded**，保留原始版權資訊。數字與標題由 Pixi 加粗、描邊及陰影；對話使用一般字重。

重建：安裝 `fonttools`、`brotli` 後，執行 `python scripts/prepare-workshop-font.py 原始字體.ttf`。字集取自 `src/games/magic-workshop/*.ts*` 與數字、常用符號；新增場景文案時同步重建。執行時由遊戲按需載入，失敗則使用系統繁體中文字體。
