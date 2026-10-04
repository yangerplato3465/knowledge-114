# 暮光森林美術庫

[世界觀](../README.md) · [角色圖鑑與造型母圖](../characters.md) · [工坊場景設計](../../games/magic-workshop/art.md)

## 先找正確的圖

| 需求 | 位置與判讀 |
| --- | --- |
| 六位居民的造型、表情與動作原稿 | [角色圖鑑](../characters.md)；實體檔案按人物放在 `characters/<角色英文識別名>/` |
| 工坊背景、物件及整張素材表 | 下方按類別列出的 `workshop/` 原稿 |
| 網站首頁、活動入口與教師工作室 | [網站原稿與產製規格](site/manifest.json)；介面分工見 [網站設計](../../project/site-design.md) |
| 尺寸、格位、錨點、留白、產圖提示與生成紀錄 | [製作清單](#製作清單與重建)，不在多個 MD 重複抄寫規格 |
| 實際載入的 WebP | [工坊 display](../../../assets/images/magic-workshop/display/)；程式使用原 URL，未複製第二份共用素材 |
| 星燈小徑的場景與道具 | [案件素材](../../../assets/images/detective/starlight/)；原有場景／道具 WebP 未找到對應高解析原稿；四處互動背景、獨立物件及共用圖示見[互動素材清單](manifests/starlight-interactives-manifest.json)，開場角色母圖見[開場製作清單](manifests/starlight-opening-manifest.json) |

**原稿與執行圖分工**：此資料夾保留完整原圖供後續產製，不隨網站發布。中間切幀不另存入美術庫，加工直接使用完整母圖。PNG 檔名沿用生成版本便於追溯，人物資料夾與圖鑑提供可讀名稱。WebP 是縮圖／切幀的遊戲素材，不等於另一份原稿。歷史版本有不同像素與構圖，保留作來源比對，不能因版本號大就直接更換遊戲圖。

**採用依據**：角色造型依圖鑑；工坊目前工作台、石泉與釜分別採用 `workbench-twilight-v1`、`spring-stone-v4`、`recycler-muted-v4`，實際載入與尺寸以 [play-scene.ts](../../../src/games/magic-workshop/play-scene.ts)、[art.ts](../../../src/games/magic-workshop/art.ts)、[ui-art.ts](../../../src/games/magic-workshop/ui-art.ts) 與 [rustic-art.ts](../../../src/games/magic-workshop/rustic-art.ts) 為準。來源 manifest 記錄生成當時的狀態，不取代現役程式。

## 共用視覺語言

細緻手繪奇幻繪本、圓潤親切角色、木頭／玻璃／紙張／布料的材質。柔和上左暖光與青綠魔力相呼應；道具接觸陰影、角色比例與場景透視須一致。每款遊戲可以改主色與時段，保留共同材質與角色辨識。

| 用途 | 基準色 |
| --- | --- |
| 暮色暗部 | 靛紫 `#25213F` |
| 木構件 | 暖棕 `#79513B` |
| 羊皮紙／暖光 | 奶油米 `#F4DDA8` |
| 魔力 | 青綠 `#65E0D0` |
| 次要魔法色 | 淡紫 `#B79AF4` |
| 完成亮點 | 金黃 `#FFD66B` |

生成提示是歷史來源資料，與目前準則衝突時以 [世界觀](../README.md)、[角色圖鑑](../characters.md) 及 [AGENTS](../../../AGENTS.md) 為準。新圖先定義每幀尺寸、格位、錨點與安全留白，驗收原圖和每個切出幀；舊原稿的歷史驗收紀錄不代表已符合最新留白標準，重新使用前仍須檢查。

## 工坊原稿分類

角色原稿已在圖鑑逐一連結，此處只列場景與道具。尺寸為檔案實測像素；「來源紀錄」是生成／加工關係，不代表現役採用。

| 分類 | 原稿 | 像素尺寸 | 來源紀錄 |
| --- | --- | --- | --- |
| 背景 | [workbench-twilight-v1.png](workshop/backgrounds/workbench-twilight-v1.png) | 1536 × 1024 | [workbench](manifests/workbench-manifest.json) |
| 背景 | [workshop-panorama-v1.png](workshop/backgrounds/workshop-panorama-v1.png) | 2172 × 724 | [display](manifests/display-manifest.json) · [manifest](manifests/manifest.json) |
| 道具 | [bottle-empty-v1.png](workshop/props/bottle-empty-v1.png) | 1254 × 1254 | [batch-2](manifests/batch-2-manifest.json) · [display](manifests/display-manifest.json) |
| 道具 | [bottle-magic-ring-v1.png](workshop/props/bottle-magic-ring-v1.png) | 1254 × 1254 | [display](manifests/display-manifest.json) · [effects](manifests/effects-manifest.json) |
| 道具 | [exit-fullscreen-v2.png](workshop/props/exit-fullscreen-v2.png) | 1254 × 1254 | [rustic](manifests/rustic-manifest.json) |
| 道具 | [magic-spring-v1.png](workshop/props/magic-spring-v1.png) | 1254 × 1254 | [display](manifests/display-manifest.json) · [stations](manifests/stations-manifest.json) |
| 道具 | [potion-gift-v2.png](workshop/props/potion-gift-v2.png) | 1254 × 1254 | [batch-2](manifests/batch-2-manifest.json) · [display](manifests/display-manifest.json) |
| 道具 | [recycler-muted-v4.png](workshop/props/recycler-muted-v4.png) | 1254 × 1254 | [muted-props](manifests/muted-props-manifest.json) |
| 道具 | [recycler-warm-v3.png](workshop/props/recycler-warm-v3.png) | 1254 × 1254 | [warm-props](manifests/warm-props-manifest.json) |
| 道具 | [recycling-cauldron-v1.png](workshop/props/recycling-cauldron-v1.png) | 1254 × 1254 | [display](manifests/display-manifest.json) · [stations](manifests/stations-manifest.json) |
| 道具 | [spring-stone-v4.png](workshop/props/spring-stone-v4.png) | 1254 × 1254 | [muted-props](manifests/muted-props-manifest.json) |
| 道具 | [spring-warm-v3.png](workshop/props/spring-warm-v3.png) | 1254 × 1254 | [warm-props](manifests/warm-props-manifest.json) |
| 道具 | [water-stream-v2.png](workshop/props/water-stream-v2.png) | 1254 × 1254 | [water-stream](manifests/water-stream-manifest.json) |
| 完整素材表 | [rustic-workshop-v2.png](workshop/sheets/rustic-workshop-v2.png) | 1254 × 1254 | [rustic](manifests/rustic-manifest.json) |
| 完整素材表 | [workshop-effects-v1.png](workshop/sheets/workshop-effects-v1.png) | 1536 × 1024 | [ui](manifests/ui-manifest.json) |
| 完整素材表 | [workshop-icons-v1.png](workshop/sheets/workshop-icons-v1.png) | 1536 × 1024 | [ui](manifests/ui-manifest.json) |
| 完整素材表 | [workshop-panels-v1.png](workshop/sheets/workshop-panels-v1.png) | 1536 × 1024 | [ui](manifests/ui-manifest.json) |

## 星燈小徑素材

共用木牌沿用工坊執行圖，不再複製；本案調查中的米洛小頭像取自下列偵探變裝定稿幀。以下圖片的故事用途以 [案件腳本](../../../assets/js/detective/cases/starlight.js) 為準，案件獨有場景規則見 [設計](../../games/detective/starlight.md)。若找回高解析原稿，存入本美術庫並補上原稿到 WebP 的來源關係。

| 類別 | 現有 WebP |
| --- | --- |
| 場景 | [星燈小徑](../../../assets/images/detective/starlight/trail.webp) · [守燈亭](../../../assets/images/detective/starlight/keeper-hut.webp) · [夜花坡](../../../assets/images/detective/starlight/nightflower-slope.webp) · [石橋舊郵路](../../../assets/images/detective/starlight/postal-bridge.webp) |
| 道具 | [燈罩](../../../assets/images/detective/starlight/brass-hood.webp) · [遮光布](../../../assets/images/detective/starlight/shade-cloth.webp) · [夜花札記](../../../assets/images/detective/starlight/flower-notes.webp) · [郵路拓片](../../../assets/images/detective/starlight/route-rubbing.webp) |
| 介面插圖 | [調查卷宗](../../../assets/images/detective/starlight/investigation-board.webp) · [對話卷軸](../../../assets/images/detective/starlight/dialogue-scroll.webp) |
| 開場角色動畫 | [奧利背向步態](../../../assets/images/detective/starlight/oli-opening-rear-walk-v1.webp) · [奧利反應](../../../assets/images/detective/starlight/oli-opening-reactions-v1.webp) · [諾爾反應](../../../assets/images/detective/starlight/noel-opening-reactions-v1.webp) · [米洛向左步態](../../../assets/images/detective/starlight/milo-opening-left-walk-v1.webp) · [偵探變裝關鍵幀](../../../assets/images/detective/starlight/milo-detective-transform-v2-keys.webp) · [變裝銜接幀](../../../assets/images/detective/starlight/milo-detective-transform-v2-inbetweens.webp)；原稿與格位見[開場製作清單](manifests/starlight-opening-manifest.json) |
| 本案新互動素材 | [小徑互動背景](../../../assets/images/detective/starlight/trail-interactive-v1.webp) · [守燈亭互動背景](../../../assets/images/detective/starlight/keeper-hut-interactive-v1.webp) · [夜花坡互動背景](../../../assets/images/detective/starlight/nightflower-slope-interactive-v1.webp) · [石橋互動背景](../../../assets/images/detective/starlight/postal-bridge-interactive-v1.webp)；獨立物件、共用放大鏡與拖曳手勢的原稿見[互動素材清單](manifests/starlight-interactives-manifest.json) |

## 製作清單與重建

清單內的 PNG basename 由 [workshop_art_paths.py](../../../scripts/workshop_art_paths.py) 在此美術庫唯一解析；WebP basename 指向工坊 `display/`。提示詞、生成識別與舊驗收記錄原樣保留。不要把 manifest 裡舊的 `runtime` 或 `status` 字段當作現在的選圖表。

| 清單 | 用途 |
| --- | --- |
| [batch-2-manifest.json](manifests/batch-2-manifest.json) | 露米、奧利、諾爾與布諾造型原稿 |
| [display-manifest.json](manifests/display-manifest.json) | 完整畫布縮成 WebP 的尺寸與可見範圍 |
| [effects-manifest.json](manifests/effects-manifest.json) | 早期瓶身光環等效果來源 |
| [guest-animation-manifest.json](manifests/guest-animation-manifest.json) | 五位客人完整六幀步態表與固定格規格 |
| [guest-gaze-manifest.json](manifests/guest-gaze-manifest.json) | 露米、諾爾、菲恩的正視修正 |
| [manifest.json](manifests/manifest.json) | 初批背景、米洛、菲恩與道具原稿；早期透明殘點紀錄 |
| [muted-props-manifest.json](manifests/muted-props-manifest.json) | 現役石泉與低亮度釜 |
| [reactions-manifest.json](manifests/reactions-manifest.json) | 六位居民感謝表情與原造型的對應 |
| [rustic-manifest.json](manifests/rustic-manifest.json) | 樸素道具素材表；其中泉／釜是歷史版本 |
| [stations-manifest.json](manifests/stations-manifest.json) | 初期魔力泉與回收釜來源 |
| [starlight-opening-manifest.json](manifests/starlight-opening-manifest.json) | 星燈小徑開場角色動畫原稿、格位與執行圖 |
| [starlight-interactives-manifest.json](manifests/starlight-interactives-manifest.json) | 星燈小徑四處互動背景、獨立物件與共用偵探圖示的原稿、尺寸和執行圖 |
| [ui-manifest.json](manifests/ui-manifest.json) | 魔法書、結晶、紙張、木牌與特效素材表 |
| [warm-props-manifest.json](manifests/warm-props-manifest.json) | 暖色泉／釜的中間版本 |
| [water-stream-manifest.json](manifests/water-stream-manifest.json) | 連續水流原稿 |
| [workbench-manifest.json](manifests/workbench-manifest.json) | 現役工作台背景 |

使用安裝 Pillow 的 Python，於專案根目錄執行下列腳本；來源由共同路徑模組解析，執行圖仍輸出到既有 `display/`，不透過搬動 PNG 改網站 URL。

| 加工 | 腳本 |
| --- | --- |
| 角色、反應與初期道具整張縮圖 | [prepare-magic-workshop-art.py](../../../scripts/prepare-magic-workshop-art.py) |
| 客人固定格步態 | [prepare-workshop-guests.py](../../../scripts/prepare-workshop-guests.py) |
| 客人正視修正 | [prepare-workshop-gaze.py](../../../scripts/prepare-workshop-gaze.py) |
| 石泉、釜、見習筆記與出口 | [prepare-workshop-rustic.py](../../../scripts/prepare-workshop-rustic.py) |
| UI 素材表與水流 | [prepare-workshop-ui.py](../../../scripts/prepare-workshop-ui.py) |
| 四處互動背景、現場實物與共用偵探圖示 | [prepare-starlight-interactives.py](../../../scripts/prepare-starlight-interactives.py) |

現有腳本不是所有歷史素材的全量產生器；未涵蓋項目保留現役 WebP 與來源紀錄，不以重新壓縮代替來源追溯。製作腳本會寫入 WebP／部分 TypeScript 素材中繼資料，執行後須檢查差異與留白。字體授權與來源見 [字體說明](../../../assets/fonts/workshop/README.md)；音效與 BGM 見 [工坊設計](../../games/magic-workshop/design.md#動畫素材與音訊)。
