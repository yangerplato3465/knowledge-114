# ITEMS · 物品與線索

**只有偵探事件簿有物品系統。** 數學勇者的強化卡不是物品（拿了立即生效、
不進背包、不能組合），那屬於 [SKILLS.md](SKILLS.md)。

---

## 偵探事件簿的三種「可收集物」

引擎（`assets/js/detective/engine.js`）的 `state` 裡分得很清楚：

| 種類 | 存在哪 | 畫面上 | 用途 |
|---|---|---|---|
| **clue 線索** | `state.clues[]` | 線索面板，**一筆一行** | 解鎖對話、解鎖指認 |
| **item 物品** | `state.items[]` | 下方物品欄，**12 格** | 出示、組合、開謎題 |
| **object 場景物件** | `state.objPositions` | 場景中，可拖移 | 拖到別的物件上組裝 |

查詢用 `hasClue(id)` / `hasItem(id)`，資料用 `clueById` / `itemById` 取。

## 物品欄的硬限制

**12 格，滿了就是滿了**（沒有翻頁、沒有自動擴充）。設計案件時要自己算總量。

線索面板**一筆一行**，寫太長會被切掉。

這兩條和其他版面限制在 [detective-authoring.md](detective-authoring.md) 第 2 節。

## 黃金貓頭鷹案的物品清單

| 編號 | 名稱 | 型別 | 說明 |
|---|---|---|---|
| SP01 | 密碼紙條 | object → item | 可拖移、可收進物品欄，開凱撒密碼謎題 |
| SP03 | 空白貓頭鷹底座 | object | 校長桌左半，點擊查看，銘牌 EST.1990 是線索 |
| ITEM01A | 解密盤外圈底座 | object | **固定在桌上**，等內圈裝回來 |
| ITEM01B | 解密盤內圈轉輪 | object | 可拖移，滾在桌子右邊地板上 |
| ITEM02/03/04 | 紅／藍／紫透鏡 | item | 出現在物品欄，用來照畫 |
| UI02 | 鑑識報告紙條 | object | 推理室，可拖移 |
| HIDDEN01/02 | 單片眼鏡 / 右手施力 | clue | 藏在 SP04 透鏡謎題裡 |

## 組裝機制的三個陷阱

`ITEM01B` 拖回 `ITEM01A` 是這個系統唯一的組裝範例。
[detective-authoring.md](detective-authoring.md) 第 5 節整理了三個實際踩到的坑：

1. **判定框常常比美術大** —— 玩家會抱怨「明明沒碰到卻黏上去」
2. **疊放順序跟著玩家的拿取順序走**，不是宣告順序
3. **組裝是雙向的** —— A 拖到 B 和 B 拖到 A 都要成立，否則玩家會以為壞了

## 互動欄位（objects / hotspots 通用）

```
look / after / gives / givesItem / requires / locked /
needsClue / lockedClue / puzzle / solvedText / reopen / goto / exit
```

- `gives` 給線索、`givesItem` 給物品
- `reopen: true` —— 謎題解開後還是點得開，面板保留玩家填過的內容。
  **只給「查完還要回去看」的東西用**（例如推理板），一般謎題解開就結束了
- `exit` 只是標記出口，畫面上不會多畫箭頭
- **沒寫 `after` 的熱點會自動退回 `look`** —— 這是刻意的，避免查過的東西變成啞巴

`look` / `after` / `locked` / `lockedClue` / `intro` / `introBack` 與提示文字
**都可以寫成函式**，吃引擎的進度查詢 api（`hasClue` / `hasItem` / `examined` /
`stored` / `scene` / `solved`）回傳當下該講的話。玩家點擊順序是自由的，
寫死的句子常會指著還沒出現或已經結案的東西講。

## 存檔會存什麼

`snapshotState()` 必須涵蓋 `state` 之外的三個東西：
**`visitedScenes`、`dropPlayed`、`objPositions`** —— 它們驅動開場文字、
掉落動畫與物件擺放位置。漏掉任何一個，讀檔後畫面就不對。

`SAVE_VERSION` 目前是 **2**（多重結局加入 `misjudge`、`closed`、`flags` 時升的）。
形狀改變就要升版號。

Firestore 規則限制 `progress.size() <= 28` 個頂層 key，**加存檔欄位超過會靜默壞掉**。

---

## 其他頁面

- **數學勇者** — 沒有物品。強化卡見 [SKILLS.md](SKILLS.md)
- **極速博物館** — 古物與碎片不是玩家物品，是關卡結構本身
- **字尾大分流** — 收集籃裡的單字是**陣列元素**，是教學展示不是物品系統
- **班級 RPG** — 場上有一枚金幣，但還沒有拾取或背包機制
- **素材下載 / 上傳** — 那是真的檔案庫，不是遊戲物品
