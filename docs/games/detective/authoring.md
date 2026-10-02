# 偵探案件製作

## 入口與資料

- 案件欄位範例：assets/js/detective/cases/golden-owl.js 檔頭。新增案件需 cases 資料、獨立 images/detective/<case>/、React entry 與 pages HTML、code.js 的 DETECTIVE_GAMES、navigation.ts 入口。
- golden-owl 的永久 ID 是 owl。已發碼後不可改現役案件 ID、PEPPER、PBKDF2 迭代或正規化，否則舊碼與存檔無法讀取。
- 圖片以案件 script URL 建立絕對位置，不以頁面 URL 猜路徑；每案分資料夾，避免覆蓋同名圖片。
- 載入順序固定：案件資料 → gate 驗碼 → 讀進度 → engine。session 必須含 codeId；僅 exp 不能授權。

## 存檔與權限

- 一碼一組存檔，維持 detective.unlock.<id>／detective.groups.<id> keys；記住組別不存明文碼。
- 讀取失敗時 saveBlocked 禁止寫入，避免空白覆蓋舊進度。退出先 await DETECTIVE_FLUSH，切組完整 reload。
- snapshotState 須涵蓋 state、visitedScenes、dropPlayed、objPositions、pickOrder、misjudge、closed、flags；謎題進度寫 ctx.flags，再呼叫 ctx.save。
- 還原視為不可信資料：未知 ID 丟棄，格式驗證；改 SAVE_VERSION 要處理舊存檔，不能默默丟失課堂進度。
- Firestore 規則限制 progress 最多 28 個頂層欄位；list 僅 owner，過期以 request.time 判斷。改 UI 不等於改權限。
- localhost、127.0.0.1 與本機 IPv6 位址自動進入不存檔的試玩模式；正式網址仍須驗碼。舊版 `detective.dev.<id>` 旗標不能在正式網址旁路驗證。
- 新發驗證碼為案件三碼英文加四碼數字（例：`STR-0042`）；舊碼繼續依原始字串驗證，不能截短，避免既有組別與進度失效。

## 設計與視覺

- 畫布 960×600；場景、物品欄與對話區分層，互動熱點不得落在底部 UI 後方。
- 兩個案件共用橫向手機版：直向時立即以 CSS 旋轉整個遊戲區，並將觸控座標反向映射回 Pixi 畫布；橫向時直接填滿可用視窗。手機收起網站頁首，遊戲畫面內保留「回線索座」入口，讓容器全螢幕時仍可離開；桌機使用頁面返回列，遊戲內不顯示浮動返回鍵。切換組別在手機浮於畫面邊緣。固定畫布縮放後的文字與觸控大小仍須用實機驗收。
- 對話框高 70px，會縮至 12px；solvedText 預留系統附加的「新線索」一行，完整解說放 after。
- 線索 desc 只寫一行結論；道具欄最多 12 格。任何解題資訊都要能再次點擊讀取。
- 回饋不透露錯誤格數／類別，避免逐格試答案；密碼由多來源資訊推理，不直接截取單一數字。
- 拖曳按完整 hit box 排版；pickOrder 決定上層，組裝需支援兩個拖曳方向。
- 多結局由最嚴格條件先判；accuseMinClues 與按鈕鎖定門檻一致，misjudgeLimit 控制誤判結案。
- 場景先載首幕，其餘按需載入；任何繞過 transitionTo 的顯示路徑也須等待圖片。
- 驗收重點：長對話、線索再次閱讀、熱點遮擋、雙向拖曳、切組、失敗讀檔禁止寫入、退出 flush 與重新整理還原。
