# 數學勇者 — 關卡背景設計手冊

角色手冊在 `PROMPTS.md`，這份是**背景**。兩者流程不共用：
背景不去背，走 `.claude\math-rpg-stages.sh`（ffmpeg 裁切／調色／轉 WebP）。

> 2026-08-26 建檔。起因是怪物在 2026-08-25 全面改成**黑描邊、高對比、暗色調**的
> 新風格，而背景還是 2026-08-20 那批**柔霧、無描邊、粉彩**的圖，兩者放在一起
> 角色像貼紙貼在水彩上。這份記錄重做的理由、設計規則與六張的定稿 prompt。

---

## 一、舊版為什麼要換（實測，不是感覺）

把 `hero.webp` 與 `enemyN.webp` 按遊戲實際比例（1280px 視窗下 1255x309 的
`.battle-stage`、角色高 13u、腳底 71%）疊回舊背景上跑一輪，六張全中：

| # | 症狀 | 根因 |
|---|---|---|
| 1 | **畫風不同世界** | 角色是硬邊 cel ＋粗黑描邊；背景是噴槍柔霧、零描邊、對比極低 |
| 2 | **角色浮空** | 1、4 關根本沒有「地面平面」（一路都是草坡漸層），腳底沒有可站立的明度斷點 |
| 3 | **骨龍消失** | 第 4 關是**淺灰綠柔霧**，骨白的龍貼上去等於白對白，全六關最糟的一張 |
| 4 | **黑騎士下半身埋進地面** | 第 5 關地面是暗褐色大色塊，深鋼藍的騎士腿部直接融掉 |
| 5 | **提燈失去作用** | 第 3 關右側（＝怪的位置）就是最大一叢青色水晶，跟幽魂的暖提燈搶光源 |
| 6 | **前景擋人** | 第 2 關樹幹、第 6 關火盆／柱子剛好落在 25% 與 75%，也就是兩個角色的位置 |
| 7 | **劍氣看不見** | 劍氣是白熱→青，第 1、2 關的畫面中央是**最亮的淺色霧**，白色劍氣飛過去整段消失 |
| 8 | **難度階梯反了** | 明度是 亮→亮→中→中亮→**最亮**→暗。第 5 關火山是六張裡最亮的一張 |

第 7、8 點靠肉眼看單張圖看不出來 —— 一定要**疊上角色**再判斷（指令見第四節）。

---

## 二、設計總則

### 1. 三個明度帶，分界線落在「胸口」不是腳底

戰鬥區只有 4.1:1 的一條窄帶，角色從 27% 高度站到 71%。把畫面切成三帶：

```
  0% ─────────────────────────────  天空／最遠   ← 只有頭頂以上
 27% ─────────────────────────────  ← 分界線
      角色身體帶（最平、最乾淨）
 71% ─────────────────────────────  地平線
      地面帶（比身體帶再暗一階）
100% ─────────────────────────────
```

**最容易錯的一步是把地平線畫在腳底。** 那樣角色整個身體都貼在天空前面，
白色劍氣飛過天空＝看不見。地平線要在 71%，但**遠景的深色塊要一路蓋到 27%**，
讓角色身體的前面永遠有一塊中明度的東西。

### 2. 角色的 x 位置**不是固定的 25% / 75%**

**2026-08-27 用瀏覽器實測推翻的假設。** `.battle-stage` 在 landscape ≥521px 高的
media query 裡是這樣寫的：

```css
padding-left: max(calc(3.5 * var(--u)), calc((100% - 58 * var(--u)) / 2));
```

內容被鎖成 **58u 寬置中**，所以角色中心佔戰鬥區寬度的百分比**會隨視窗與 `--u` 改變**：

| 情境 | `--u` | 勇者中心 | 怪物中心 |
|---|---|---|---|
| 全螢幕 1920x1080 | 28.8 | ~26% | ~74% |
| 視窗 1280x720（實測） | 14.4 | **31.9%** | **68.1%** |
| 超寬（`.game-card` 撞到 `max-width:110u`） | — | ~36% | ~64% |

公式：`勇者中心% = 0.5 - 15.76u / 戰鬥區寬`。
只有矮視窗那條分支（`max-height:520px`，padding 只有 1u）才接近 25%/75%。

**所以：**
- **不要在 prompt 裡指定 25%/75% 的落腳點** —— 那個位置在多數視窗下根本不對，
  而且沒有任何單一百分比會全對。
- **禁區要放寬成涵蓋整個範圍**：角色實際佔到的大約是 **21%~41%** 與 **59%~79%**。
- 手冊裡的 `WHERE THINGS MAY GO`（地標只能放 0–12%、40–60%、88–100%）
  **在所有視窗下都是安全的**，因為它本來就比實際需要更嚴格。這條不用改。
- 防浮空靠的是**地平線那道明度斷點**，不是落腳點色塊 —— stage1 實測有效。

### 2b. 舊的「25% / 75% 是禁區」（保留原文，數字已由上面取代）

角色中心就在這兩個位置。**地平線以上**，這兩條各佔 20% 寬的直帶裡不可以有
樹幹、柱子、石筍、水晶、火盆或任何亮光源。地標一律放
**最左 0–12%、正中 40–60%、最右 88–100%**。

### 3. 但地面上要有「落腳點」

反過來，**地面帶**在 25% 與 75% 各要一塊比周圍**亮一階**的平色塊
（光斑／乾沙／磨白的石板都行，不發光、不描邊）。這是角色不再浮空的關鍵，
也順便告訴玩家兩邊站哪。

### 4. 前景框只在最外緣，而且只有它能用黑描邊

畫面最左與最右各一塊**近黑、被畫框裁掉一半**的前景物（草叢／樹根／石筍／柱基），
**用跟角色同樣的粗黑描邊＋硬邊 cel**。這是把背景畫風縫回角色畫風的那一針；
中景遠景則一律**不描邊**，才會退到後面去。

### 5. 硬邊，不要柔霧

跟角色手冊第 5 條同一條規則，理由不同：背景會被**放大 1.56 倍**
（1024 裁 269 → 1600x420），噴槍漸層與細碎筆觸放大後只會變成糊掉的髒。
每一塊都要**至少三階明暗、硬邊界**，形狀要大塊、可讀。
禁止：airbrush 漸層、景深模糊、bloom、乳白色大氣霧。

### 6. 配色由怪物反推（跟角色手冊第 6 條是同一張表，方向相反）

| 關 | 怪 | 怪的主色 | 背景身體帶必須是 |
|---|---|---|---|
| 1 | 暗影小獸 | 近黑 | **中綠**（不是淺粉綠，否則劍氣不見） |
| 2 | 骨翼渡鴉 | 近黑＋骨白 | 中暗綠 |
| 3 | 提燈幽魂 | 近黑＋暖提燈 | **中明度青**（夠亮才襯得出黑斗篷）＋**右半不准有冷光** |
| 4 | 骨龍 | 骨白 | **深墨綠**（這關背景要暗，白骨才會發亮） |
| 5 | 黑騎士 | 深鋼藍＋青劍光 | **暗底 ＋胸口高度一條熱橘逆光** |
| 6 | 暗黑魔王 | **97% 是暖紅**（不是近黑） | **低飽和的冷灰石**（比魔王亮）＋中央改單色冷光，不要彩色玻璃 |

> **⚠️ 2026-08-27 量測修正：魔王不是「近黑＋緋紅」，他是一個紅色角色。**
> 把 `enemy6.webp` 的不透明像素照色相分桶，結果是
> **紅（0~20°）97.3%**、灰 1.8%、紫 0.5%、金 0.2%、藍青合計 0.2%，平均亮度 46。
> 盔甲是深紅褐不是黑的，披風緋紅，雙手的火焰也是紅的。
>
> 這件事改變了大殿的配色策略：問題不在明度（46 對牆的 78，剪影很清楚），
> 而在**飽和度**。初版石牆給了偏藍的 `#33405c`，高飽和藍對上高飽和紅，
> 兩邊看起來像不同遊戲的素材。
>
> **修法是降飽和、不換色相**：石頭要讀成「冷灰石」而不是「藍色」，
> 讓全場的彩度只剩魔王的紅與兩簇藍焰。
> 這其實就是角色手冊「低彩度」那條規則反過來用在背景上。

### 7. 六關的階梯：明度單調下降，封閉度單調上升

| 關 | 場景 | 光源 | 天空 | 文明痕跡 | 整體明度 |
|---|---|---|---|---|---|
| 1 | 晨光草原 | 左上暖陽 | 全開 | 一塊路標石 | 亮 |
| 2 | 密林小徑 | 樹冠篩光 | 只剩縫隙 | 無 | 中亮 |
| 3 | 水晶洞窟 | 水晶冷光 | 完全沒有 | 半埋石拱門 | 中暗 |
| 4 | 腐沼廢墟 | 月光＋磷火 | 枯枝格柵 | 沉沒石像、斷橋 | 暗 |
| 5 | 熔岩火山 | **底部熔岩** | 黑煙頂 | 鐵索橋、斷閘 | 暗 ＋熱點 |
| 6 | 魔王大殿 | 冷月＋藍焰 | 石拱頂 | 全人造、金雕 | 中低（見下） |

封閉度與人造感是**單調前進**的：全開天空 → 樹縫 → 完全無 → 枯枝格柵 → 黑煙頂 → 石拱頂；
無 → 苔石拱 → 斷柱 → 沉沒石柱 → 鐵閘 → 完整王座廳。

**但明度不是單調下降，做完六張才確定。實測值：139 → 82 → 89 → 45 → 45 → 62。**

兩個轉折都是**角色可讀性逼出來的**，不是失誤：

- **第 2→3 關不降反升**（82→89）：提燈幽魂是近黑，洞壁壓到 75 以下它就糊掉。
- **第 6 關回升**（45→62）：魔王自己的平均亮度只有 46，大殿壓到 45 以下他會沉進去。

所以決戰的份量不是靠「最暗」扛的，而是靠**金量最多、建築最完整、彩度最集中**
（全場零紅，紅色只屬於魔王一個人）。真正的明度谷底在第 4、5 關 —— 那是「探底」，
第 6 關是「登頂」，這樣讀其實比一路變暗更有敘事。

---

## 三、產圖 prompt

Gemini 開新對話，**不要**上傳角色參考圖（會被畫進背景）。
一張一個對話，改圖用續問，結尾寫 `Everything else stays untouched.`

### 共用開頭（六張都要貼，只換最後那四段的內容）

> **⚠️ 標籤不要用尖括號。** 原本這裡寫的是 `<SKY>` / `<MIDDLE>` / `<GROUND>` /
> `<FOREGROUND>`，2026-08-27 做 stage3 時 Gemini **把這三個標籤當成圖說，
> 用白色大字直接畫進圖裡**（`<SKY>` 寫在洞頂、`<MIDDLE>` 寫在洞壁、
> `<GROUND>` 寫在地板上）。共用開頭明明寫了 `NO text, letters`，照樣輸。
>
> 原因跟前兩個坑一樣：**整段結構長得像一張標註示意圖，描述贏過禁令。**
> 尖括號在視覺上就是「標註框」的語言。
>
> 改成 `UPPER BAND` / `MIDDLE BAND` / `GROUND` / `FOREGROUND PIECE` 這種
> **全大寫加冒號的段落標題**就沒事 —— `SCENE:` `LANDMARKS:` `LIGHT:` `KEEP OUT:`
> 從第一張用到現在都沒被畫出來過，同一種寫法是安全的。

```
STYLE — READ THIS FIRST
A side-scrolling 2D game battle stage background, hand-painted anime game art.
Everything is drawn as HARD-EDGED cel-shaded shapes: flat colour bands with crisp
sharp boundaries, at least three value steps on every mass. Do NOT use airbrushed
gradients, soft focus, depth-of-field blur, bloom, or milky atmospheric haze
anywhere. No photo texture, no watercolour bleed.
Keep every shape chunky and readable, because this image gets enlarged 1.5x and
fine speckled texture and hairline detail will only turn to mush.
Distant masses carry NO outline. Only the two dark foreground pieces at the extreme
left and right edges carry a bold black outline.

COMPOSITION — 16:9 image, but only a horizontal band of it is used
Put the horizon / ground line across the picture at 67% of the image height.
The top third and the bottom fifth will be cropped away, so put nothing you care
about there.
This applies to the sky and the ceiling too: any cloud, light gap, opening, moon or
hanging object must sit between 38% and 60% of the image height — low, just above
the horizon. Anything drawn higher is lost, or sliced in half by the frame edge.
This is empty scenery. NO characters, NO creatures, NO people, NO text, NO logos,
NO UI, NO vignette, NO border.
No swords, no weapons, no blades, no light beams, no energy effects.
No translucent panels, rectangles, bands, columns of tint, arrows, guides or
overlays of any kind — this is a finished painting, not a diagram.

THREE VALUE BANDS — this is the whole point of the picture
- Above the horizon, upper part: UPPER BAND
- Above the horizon, lower part: MIDDLE BAND. This band must be the FLATTEST and
  QUIETEST area of the picture. Paint it at exactly the hex value given below — take
  that value literally. It must sit a clear step away from UPPER BAND so the two never
  blend into each other.
- Below the horizon: GROUND, one clear step DARKER than the middle band — not
  lighter — with a crisp value break exactly at the ground line.

WHERE THINGS MAY GO
Landmarks, tree trunks, pillars, rock spires, crystals, windows and bright light
sources may ONLY be placed in three places: 0–12%, 40–60%, or 88–100% of the width.
Everywhere else above the ground line is plain, uninterrupted MIDDLE BAND with nothing
standing in front of it.

GROUND TEXTURE
The ground must not be one empty flat colour. Scatter three or four soft irregular
patches one step LIGHTER than the surrounding ground across it — a pool of light,
dry sand, a worn flagstone. Flat colour, no glow, no outline. Do not line them up
and do not centre them anywhere in particular.

FOREGROUND FRAME
At the very left edge and the very right edge, one near-black FOREGROUND PIECE in
shadow, cropped by the picture edge, bold black outline, flat cel shading. Neither
may be wider than 8% of the picture width.
```

> **⚠️ 2026-08-27，stage1 第一版踩到的坑：描述禁區＝把禁區畫出來。**
>
> 初版的共用開頭寫了「兩條各 20% 寬的直帶要保持乾淨」，以及
> 「這條要暗，**因為有一道白色劍氣橫越**」。Gemini 兩個都當成畫面元素照畫：
> 產出的圖上有**四條半透明白色直帶**，還有一道**白色劍氣**畫在畫面偏左。
>
> 這就是 `PROMPTS.md` §4 的同一條規則，只是換到背景上：
> **描述一個不該存在的東西，模型就會把它畫出來。**
>
> 為什麼 §6「把理由寫給 Gemini 聽」有效、這裡卻失效？差別在理由指的東西
> **在不在畫面裡**。§6 的例子是「他會站在綠色森林前」——「他」是之後才貼上去的，
> 畫面外的東西。而「一道劍氣橫越這條帶」講的是畫面**內**的事，它就照畫。
>
> 兩條修法：
> - **禁區改寫成「只能放哪裡」**（正面放置規則），完全不要提「帶」「區」「乾淨」。
> - **不要提劍氣**。要解釋明度就只講明度（`clearly DARKER than the sky`），
>   句子裡不准出現任何可以被畫出來的名詞。
>
> **⚠️ 2026-08-27 補充（stage2 提亮時又踩一次，這次是同一段 prompt 裡一句中一句沒中）：**
>
> 同一張圖的兩句話，結果完全相反：
>
> | 句子 | 結果 |
> |---|---|
> | `A raven with bone-white wing bones **will be placed there afterwards**, and it would vanish against anything pale.` | ✅ 沒畫渡鴉 |
> | `It must be light enough that **a black bird silhouette placed in front of it** would read clearly.` | ❌ **真的畫了一隻黑鳥**，就在勇者站位上 |
>
> **⚠️ 2026-08-27 再補（stage4，第五次）：「某個區域維持某個顏色」也算描述區域。**
>
> 我以為「禁區改寫成正面放置規則」就安全了，但那條只涵蓋**物件**能放在哪。
> stage4 我寫了：
>
> ```
> From 55% of the width across to the right edge it stays plain #2f4038
> with nothing lighter than that anywhere on it.
> ```
>
> 這句沒有提任何物件、也沒有禁令，純粹是「這塊面積是這個顏色」——
> 結果 Gemini **把中景的霧畫成兩塊長方形，在 62% 處留下一條垂直硬邊接縫**。
>
> **通則收緊成：不要描述任何「區域」，連顏色約束都不要用區域來下。**
> 要限制某個範圍的明度，就把它改寫成那個**物體本身的全域性質**：
>
> | | |
> |---|---|
> | ❌ | `From 55% to the right edge it stays plain #2f4038` |
> | ❌ | `nothing lighter than #2f4038 in the right-hand half` |
> | ✅ | `The mist is a single flat #2f4038 everywhere, uniform, with no lighter patches anywhere in it` |
>
> 效果一樣（右半自然就是暗的），但句子裡沒有任何一塊面積可以被畫出來。

> **⚠️ 2026-08-27 第六種變形（stage5）：它把「裁切」本身畫成了黑邊。**
>
> 共用開頭裡這兩句：
>
> ```
> 16:9 image, but only a horizontal band of it is used
> The top third and the bottom fifth will be cropped away
> ```
>
> stage5 產出的圖**上下各有一條純黑電影黑邊**（上 0~89、下 505~571）。
> 前四張用同樣的文字都沒事，所以不是必然，但顯然有機率 ——
> 我描述了「這張圖會被裁成一條帶」，它就把那條帶畫出來了。
>
> **這次運氣好，可見帶（163~406）剛好落在兩條黑邊之間，不用重產。**
> 但下次遇到要先量：`cropY+26` 要大於上黑邊、`cropY+269` 要小於下黑邊。
> 真的吃到黑邊就續問「remove the black bars at the top and bottom, extend the
> painting to fill the whole picture」，不必重骰。

> 差別在**時態與歸屬**：前者明講「之後、由別人放上去」＝畫面外的事；
> 後者是空間性的假設句（「放在它前面」），讀起來就是畫面內的東西。
>
> **所以規則要收得更緊：解釋明度需求時，一個具體的生物或物件名詞都不要出現。**
> - ❌ `light enough that a black bird would read against it`
> - ⚠️ 可用但有風險：`... will be placed there afterwards`（要有明確的未來式＋外部歸屬）
> - ✅ 最安全：**只給數值，不給理由** —— `Repaint it as a clear MEDIUM green #5f7d52`。
>   數值本來就講得比理由精確，理由是多餘的風險。

> **⚠️ 2026-08-27，stage1「雲太高」修了三輪 —— 物件塞不下時，「移動」是無解的。**
>
> 雲的上緣一直被裁掉。我前兩則續問都在講**位置**，兩則都完全沒效：
> - ①「every cloud must fit between 36% and 47% of the image height」→ 雲一動也沒動。
>   **模型沒有畫布尺規，百分比對它是抽象數字。**
> - ②「the top of the tallest cloud must sit LEVEL WITH the top of that tree's canopy」
>   （改用畫面內的參照物當尺）→ 只上移 6px，還是被切 23px。
>
> 量了才發現根因：**可見天空只有 78px，而雲有 98px 高 —— 雲比整片可見天空還大。**
> 不管怎麼「往下移」都不可能塞得進去。位置根本不是可解的問題。
>
> ③ 改成講**尺寸**、並用畫面上量得到的量當單位就中了：
> `no taller than one fifth of the height of the sky, where the sky means everything
> above the green hilltops` ＋ `put them all in the LOWER THIRD of the sky`。
>
> **通則：發現連續兩則位置指令都沒效，先去量「東西有沒有大過它要進去的空間」。**
> 大過了就改下尺寸指令，而且單位要用畫面裡看得到的東西（天空高度、山頭到畫框），
> 不要用百分比。

### stage1 — 晨光草原

```
UPPER BAND: pale warm blue #cfe4f2 at the top, warming to creamy #eef2df just above the
horizon; two or three compact rounded clouds sitting LOW, between 40% and 58% of
the image height. Each cloud has a bumpy top of several soft lobes, rounded ends
and a flatter base, drawn as one flat cream shape with one slightly darker flat
shape inside it. No airbrushed puffs, and no long horizontal streaks.
MIDDLE BAND: a solid mass of mid-green rolling hills, #6f9a5c down to #5c8a4f. Make
them noticeably darker than feels natural — a white sword slash crosses here.
GROUND: sunlit meadow grass #587f45, a darker #46683a shadow band just under the
ground line, and a bare dirt path along the very bottom.
FOREGROUND PIECES: clumps of tall dark grass on the left, one thick dark tree root on
the right.

SCENE: an open grassland ridge in clear early-morning light. Wide, safe, calm.
This is the first and easiest level and it must look it.
LANDMARKS: far left, one lone wind-bent tree in dark green. Far middle, a line of
low distant hills with one small weathered stone waymarker. Far right, three
standing stones. Small flat flower dots scattered on the grass, not glowing.
LIGHT: sun high and to the LEFT, so every mass gets a warm lit left edge and a
cool shadow on its right.
```

### stage2 — 密林小徑

```
UPPER BAND: mostly closed off. A dark canopy mass fills the top, with small hard-edged
patches of pale green-white #b9cf94 showing through the gaps. Those patches must
sit LOW, between 38% and 55% of the image height — patches near the top edge are
cropped away and never seen. Each patch is SMALL: about as wide as one tree trunk,
and no taller than it is wide.
MIDDLE BAND: a wall of receding tree trunks in dark green-grey #4a6142, flat and
low-contrast, growing darker toward the left and right edges.
GROUND: moss and packed earth #47513a fading to #2f3729 at the edges, with
exposed roots crossing it.
FOREGROUND PIECES: big near-black fern fronds on the left, a broken stump on the right.

SCENE: deep inside an old forest where the path has narrowed. Still daylight, but
the canopy has closed overhead.
LANDMARKS: thick trunks at the far left and the far middle; a leaning mossy trunk
at the far right.
LIGHT: cool green daylight from high and to the left.
KEEP OUT: the forest wall in the RIGHT-HAND half of the picture stays solidly DARK
green. No pale mist, no bright gap, no light patch anywhere between two thirds and
four fifths of the way across. A raven with bone-white wing bones will be placed
there afterwards, and it would vanish against anything pale.
```

### stage3 — 水晶洞窟

```
UPPER BAND: no sky at all — a dark blue-green rock ceiling #2c4a4e, going to near-black at
the very top.
MIDDLE BAND: a mid-value teal cavern wall, #4b7a80. Paint it at exactly that value. It is
the lightest large area in the picture, and it stays flat and plain.
GROUND: wet rock #2a3f45 with hard-edged pale reflection streaks, and shallow still
water along the very bottom.
FOREGROUND PIECES: near-black stalagmites, left and right.

SCENE: a vast underground cavern. The first ruins of the game appear here — someone
built down here once.
LANDMARKS: far left 0–15%, a cluster of teal crystals #5fd4e0. Far middle 45–60%, a
half-buried broken stone arch, its gold leaf worn down to a dull #8a7a52, with a few
smaller crystals behind it.
CRYSTAL PLACEMENT: the big crystal cluster sits at the far LEFT, 0–15% of the width.
A few small ones may sit at the foot of the arch in the far middle, 45–60%. Nothing
glowing anywhere past 60% of the width — from there to the right edge the cavern wall
is plain #4b7a80.
LIGHT: cold and dim, coming from the crystals on the left.
KEEP OUT: the whole picture is cold. No orange, no amber, no yellow, no warm colour
of any kind anywhere in it.
```

> 右半留白是刻意的：這關的怪是**提燈幽魂**，提燈必須是右半唯一的暖光源。

### stage4 — 腐沼廢墟

```
UPPER BAND: deep blue-violet night sky, #2a2f42, crossed by a lattice of bare dead
branches. A small pale moon #b9cfc4 sits at 8% of the width, low, half hidden behind
the branches. Nothing pale anywhere else in this band.
MIDDLE BAND: dark moss-green mist, #2f4038. Paint it at exactly that value — NOT pale
grey, NOT white, NOT milky. It is ONE continuous mass spanning the full width, uniform
in colour, with no lighter patches anywhere in it and no straight vertical edges. Its
top edge is soft, uneven and organic; the mass itself is flat with no blur.
GROUND: black-green mud #2b3129 in front, still black water #24332e behind, with a few
flat hard-edged pale reflection streaks lying on the water.
FOREGROUND PIECES: black reeds on the left, knotted roots on the right.

SCENE: a drowned swamp at night, full of dead trees and sunken ruins. Closed-in,
heavy, and the darkest level so far.
LANDMARKS: far left 0–12%, a rotted tree hung with moss, standing against the moon.
Far middle 40–60%, a plain broken stone pillar — uncarved, tilted, sunk to half its
height in the water — with a collapsed bridge span behind it. Keep both the same dark
value as the mist, not lighter. Far right 88–100%, a dead trunk snapped off short.
WILL-O-WISPS: three tiny sickly-green dots #79c98d, no larger than a fingertip, at 6%,
14% and 46% of the width only. None past 50%.
LIGHT: cold and dim. The only lit surfaces are the moon, the branch edges near it, and
the pale streaks on the water.
```

> 這關是六張裡改動最大的：怪是**骨白的骨龍**，背景一定要暗。舊版的淺灰綠柔霧是全六關最糟的一張。

### stage5 — 熔岩火山

```
UPPER BAND: a black-brown smoke ceiling, #251c1e, nearly black at the very top. Do NOT
paint a bright orange sky.
MIDDLE BAND: dark volcanic rock, #2a1f20, flat and plain. Crossing it horizontally,
edge to edge, a RIVER OF GLOWING LAVA in the middle distance: a #d9531e core with
#ff8a3d hot edges. Its centre line sits at 55% of the image height and it runs the
FULL width of the picture without a break, passing behind everything. It is by far the
brightest thing in the picture.
GROUND: a cracked black basalt platform #1c1517 with thin orange light in the cracks.
The cracks run mostly HORIZONTALLY and never radiate outward from the middle.
FOREGROUND PIECES: near-black basalt spires, left and right.

SCENE: a black obsidian causeway across an active lava field at night. Everything is
dark and the only light in it is heat.
LANDMARKS: far left 0–12%, a broken basalt column. Far middle 40–60%, a distant
volcano cone in silhouette, its glow dimmer than the lava river. Far right 88–100%, a
fallen iron gate frame.
EMBERS: small hard-edged orange flecks, flat shapes, no glow halos, no more than a
dozen in the whole picture, and all of them close to the left and right edges.
LIGHT: everything is lit FROM BELOW AND BEHIND by the lava. Top surfaces stay dark,
under-edges are hot orange.
KEEP OUT: no blue, no cyan, no cold light, no moon, no stars. Every colour in this
picture is black, brown, red or orange.
```

### stage6 — 魔王大殿

```
UPPER BAND: a vaulted stone ceiling lost in near-black, #1d2028.
MIDDLE BAND: a cold GREY stone wall, #4e5361 — a neutral grey with only a slight cool
bias, NOT a blue wall. Paint it at exactly that value. It is deliberately LIGHTER than
both the ceiling above it and the floor below it, and it is the lightest large area in
the picture. Keep it flat and plain.
GROUND: a polished dark stone floor #22262f with thin inlaid gold lines and one
hard-edged flat reflection strip — not a blurry mirror.
SATURATION: all the stonework is close to neutral grey. The only saturated colours
anywhere in the picture are the gold and the two blue braziers.
FOREGROUND PIECES: near-black pillar bases, left and right.

SCENE: the throne hall at the top of a dark castle. Cold, monumental and gilded.
LANDMARKS: far middle 44–56%, one tall narrow arched window. Its glass is DEEP INDIGO
and DARK — only the thin stone tracery and the window's outer edge catch pale
blue-white moonlight. A single cold colour, and dim. No multicoloured stained glass.
Far left 0–12% and far right 88–100%, one stone pillar each with a carved gold capital.
BRAZIERS: two stone braziers burning cold blue flame #6f7cff, one at 8% and one at 92%
of the width, at the extreme edges only.
GOLD: this level carries the most gold of the six — thin gold inlay in the floor, gold
capitals on the pillars, a gold band running along the wall. A warm yellow-gold, never
pink, and never bright enough to become the focus.
LIGHT: cold and dim throughout.
KEEP OUT: no red, no crimson, no pink, no orange, no warm firelight. The gold is the
only warm colour anywhere in this picture.
```

> 中央改成單色冷光窗，是因為魔王是**近黑＋金＋緋紅**，舊版的多彩玻璃會跟緋紅打架，
> 而且青白劍氣飛過彩色玻璃時完全讀不出來。
>
> **但單色窗也不能整片發亮**（2026-08-26 用色彩模擬帶驗出來的）：窗子在正中央，
> 而劍氣就是從那裡飛過去，一面淺藍白的亮面板等於換一種方式吃掉劍氣。
> 所以玻璃本體要**深靛、暗**，只有石框與外緣吃到月光 —— 冷色相有了，明度沒有搶。

---

## 四、收圖檢查清單

- [ ] 地平線在**畫面高度 67%**？（不是一半，也不是三分之二偏上）
- [ ] **21%~41% 與 59%~79% 的直帶**在地平線以上是不是乾淨的？有沒有樹幹／柱子／亮光源？
      （範圍這麼寬是因為角色的 x 位置會隨視窗變，見第二節）
- [ ] 地面有沒有一點深淺變化，不是一整片平色塊？
- [ ] 有沒有出現**噴槍柔霧／景深模糊／乳白大氣霧**？（有就重來，這是舊版的病）
- [ ] 中景遠景有沒有被誤加**黑描邊**？只有最外緣的前景框可以有。
- [ ] 畫面中央（劍氣飛行路徑）是不是**中～暗**？白色劍氣飛過去看得見嗎？
- [ ] 有沒有畫進人／生物／文字？
- [ ] **有沒有把 prompt 的指示畫成圖？**（半透明直帶、劍氣、箭頭、格線 —— 見共用開頭下面那條坑）
- [ ] **天上的東西有沒有畫太高？** 雲／光縫／月亮／裂縫要落在 38~60%，畫在頂端等於沒畫
      （2026-08-27 stage1 踩到：三朵雲全在 10~32%，裁完只剩被切一半的殘影）
- [ ] 六張排在一起，明度是不是**單調由亮到暗**？封閉度是不是單調上升？
- [ ] **把 `hero.webp` 與 `enemyN.webp` 疊上去再看一次**（第六、八項只有這樣才看得出來）：

```bash
ffmpeg -y -i stageN.webp -i hero.webp -i enemyN.webp -filter_complex "[0]scale=1255:329,crop=1255:309:0:20[bg];[1]scale=-1:136[h];[2]scale=-1:136,hflip[e];[bg][h]overlay=x=314-w/2:y=83[o];[o][e]overlay=x=941-w/2:y=83" -frames:v 1 -update 1 sim.png
```

（1255x309 是 1280px 視窗下 `.battle-stage` 的實測尺寸，136 是角色高 13u，
83／941 等座標是角色在版面上的實際落點，不要改。）

---

## 五、裁切數字（`.claude\math-rpg-stages.sh`）

Gemini 產的原圖實測是 **1024x572**，腳本裁 `1024x269` 的帶、再放大到 `1600x420`。

公式是 `cropY = 地面線在原圖的 y - OFFSET`，**OFFSET 目前是 212**。

**⚠️ OFFSET 不是「腳底% x 269」。** 有兩層修正：

1. **腳底% 要用瀏覽器量，不要抄註解。** 腳本裡寫的 71% 是舊值，
   2026-08-27 實測是 **76.56%**（見下面的量法）。
2. **容器看到的不是整條帶。** `cover` 縮放比
   `max(1254.8/1600, 298.2/420) = 0.784` 由**寬度**決定，帶被算成 `1254.8x329.4`，
   而容器只有 **298.2** 高，又是 `background-position: center bottom`，
   所以**帶頂被切掉 31.2 個螢幕 px**（＝帶內 39.8px ＝裁切帶內 25.5px）。

```
容器上緣       = 帶內 y 39.8
容器高 298.2px = 帶內 380.2px
腳底 76.56%    = 39.8 + 0.7656 x 380.2 = 330.9 (帶內)
               = 330.9 / 420 x 269 = 211.9   →  OFFSET = 212
```

**⚠️ 動到版面就要重算 OFFSET 並六張全部重跑。** 腳底% 是由
`pages/math-rpg.html` 的 `.sprite{bottom}`、`.sprite-slot{margin-bottom}`、
`.fighter .name{line-height, margin}` 共同決定的。2026-08-27 為了縮小
「角色與名字之間的空隙」動過一次（`OFFSET 200 → 212`，六張 `cropY` 全部 `-12`）。

**腳底% 的量法**（開瀏覽器，不要用算的）：

```js
const st = document.getElementById('battle-stage').getBoundingClientRect();
const sp = document.getElementById('player-sprite').getBoundingClientRect();
console.log(100 * (sp.bottom - st.top) / st.height);   // 腳底%
console.log(st.height, sp.height);                      // 容器高、角色框高(=14u)
```

**⚠️ 順帶一提：角色圖在畫面上是 `14u ≈ 201.6px` 高，不是插槽的 13u。**
`.sprite` 是 14u 正方框、圖是 512x512 正方形、`contain` → 剛好填滿。
做疊圖驗證時用錯尺寸（例如 136px）會把角色縮成真實大小的 67%，判斷會失準。

理論上地平線鎖 67%（`0.67 x 572 ≈ 383`）時六張共用 `cropY = 383-212 = 171`，
**但實測不要用理論值，要逐張量**。stage1 的地面線 Gemini 畫在 **65.7%（y 376）**：

```
cropY = 376 - 212 = 164
```

**量法**（把 PNG 轉成 PPM，找中景綠→地面深綠的最大明度落差）：

```bash
ffmpeg -y -i stageN.png -f image2 -pix_fmt rgb24 -c:v ppm out.ppm
# 然後在 x = 140/220/460/700/760 幾個乾淨的欄位掃 y 300..470，
# 取 g 通道落差最大的那一列。stage1 六點量到 369~381，取中位數 375。
```

取樣點要避開沙地、石頭、樹 —— 那些地方的落差會比地面線還大，會抓錯。
量完把值填進下面的 `JOBS`，一張一個值。

> **⚠️ 2026-08-27 血淚：「最大明度落差」不等於「地面線」，stage6 就抓錯了。**
>
> 王座廳的偵測結果是 y=373，五個取樣點還完全一致（看起來超可靠）——
> 但那是**牆上一條裝飾金帶**的上緣。金色對深灰石的落差比真正的地板交界大得多。
> 實際剖面：
>
> ```
> 340~368  石牆  lum 68
> 372~380  金帶  lum 116   <- 偵測器抓到這裡
> 384~416  石牆  lum 68    <- 下面還有 30px 的牆！
> 420~428  金帶  lum 121   （牆腳線）
> 432~     地板  lum 22    <- 真正的地面線在這
> ```
>
> 錯了 58px，遊戲裡角色的腳踩在牆面中段的一條線上，看起來整個浮在半空。
> **老師在實機一眼就看出來，我的疊圖驗證卻沒抓到** —— 因為縮圖裡那段牆看起來像地板。
>
> **兩條補強：**
> 1. **不要只找最大落差，要找「往下一路維持不同值的那一條」。** 地面／地板是一大片，
>    裝飾線是一條細帶 —— 落差之後如果 10~20px 內就變回原值，那不是地面線。
> 2. **收圖後跑腳底斷點檢查**（腳底上下各 25px 的平均差）：
>
> ```bash
> U=$(ffmpeg -v error -i stageN.webp -vf "crop=1600:25:0:300,scale=40:5,format=gray" -f rawvideo - \
>   | perl -e 'local $/; my @b=unpack("C*",<STDIN>); my $s=0; $s+=$_ for @b; printf("%.0f",$s/@b)')
> D=$(ffmpeg -v error -i stageN.webp -vf "crop=1600:25:0:336,scale=40:5,format=gray" -f rawvideo - \
>   | perl -e 'local $/; my @b=unpack("C*",<STDIN>); my $s=0; $s+=$_ for @b; printf("%.0f",$s/@b)')
> echo $((U-D))
> ```
>
> 差 <12 就要放大腳底看一眼。stage4 的腐沼只有 6，因為夜沼上下都暗、
> 岸緣又是波浪狀沒有單一直線 —— 那張最後是**靠疊圖比對兩個 cropY 挑出來的**
> （183 會浮在水面上，190 才踩在岸緣輪廓上）。**斷點弱的場景，數值靠不住，只能看圖。**

stage1 的裁切帶因此是 y `164..433`，**但帶頂還有 25.5px 看不到**，
所以真正看得到的是 y `190..433` ＝原圖的 **33.2% ~ 75.7%**。

新圖收齊後把 `JOBS` 改成（`hue` 調色可以拿掉了，新版直接在 prompt 裡定色）。
**每個值都要照上面的方法量出來，不要照抄理論值 187**：

```bash
JOBS=(
  "1:164:"   # 新版草原，實測地面線 y 376 (65.7%) - OFFSET 212
  "2:165:"   # 新版密林，實測地面線 y 377 (65.9%)
  "3:176:"   # 新版洞窟，實測地面線 y 388 (67.8%)
  "4:190:"   # 新版腐沼，岸緣波浪狀，靠疊圖比對定值（偵測器的 183 會浮在水面）
  "5:137:"   # 新版熔岩，實測地面線 y 349 (61.0%)；原圖有上下黑邊
  "6:219:"   # 新版王座廳，地板線 y 431。⚠️ 不是 373，那是牆上的裝飾金帶
)
```

## 明度階梯追蹤

每張收工後量一次，確認難度曲線沒有倒過來。量法：

```bash
ffmpeg -v error -i stageN.webp -vf "crop=1600:394:0:26,scale=160:40,format=gray" -f rawvideo - \
  | perl -e 'local $/; my @b=unpack("C*",<STDIN>); my $s=0; $s+=$_ for @b; printf("%.0f\n",$s/@b)'
# 怪物站位（59~79%）換成 crop=320:250:944:60
```

| 關 | 全幅 | 怪物區 | 狀態 |
|---|---|---|---|
| 1 晨光草原 | **139** | 172 | 定稿 |
| 2 密林小徑 | **82** | 107 | 定稿 |
| 3 水晶洞窟 | **89** | 99 | 定稿 |
| 4 腐沼廢墟 | **45** | 47 | 定稿（明度轉折點） |
| 5 熔岩火山 | **45** | 50 | 定稿（靠逆光，不看平均） |
| 6 魔王大殿 | **62** | 68 | 定稿（金量最多，不是最暗） |

**⚠️ 怪物區的數字比全幅重要，衝突時一律以怪物區為準。**
那是角色剪影讀不讀得出來的關鍵，全幅只是氣氛。

經驗值：

| 怪的配色 | 怪物區背景亮度 |
|---|---|
| 近黑（小獸、幽魂、魔王） | **95 以上** |
| 骨白（骨龍） | **60 以下** |
| 近黑＋骨白（渡鴉） | **105~120**，兩邊都讀得出來 |
| 深鋼藍＋青劍光（黑騎士） | **不看平均，看有沒有逆光帶**，見下 |

**⚠️ 第 5 關是唯一靠「逆光」而不是「底色明度」的一關，量法不一樣。**
黑騎士是深鋼藍，全場又是暗的，用平均值量會得到 40~60，看起來像不合格 ——
但他讀不讀得出來靠的不是底色，是**一條橫貫胸口高度的熔岩帶把他鑲上熱邊**。

所以這關要量的是：**熔岩帶穿過怪物區時的亮度**（要 150 以上），
以及**它有沒有斷掉**。量法：

```bash
# 取怪物站位 59~79%、原圖高度 52%~58% 那一條，看最亮值
```

熔岩帶的中心線指定在**原圖高度 55%** —— 那大約是角色胸口
（腳底 67%、頭頂約 36%，往上四成）。太高會變成背景光暈、太低會被地面蓋掉。

**⚠️ 明度階梯在第 2→3 關會卡住，這是設計本身的矛盾，不要硬壓。**
2026-08-27 實測：第 3 關全幅 89，比第 2 關的 82 還亮，我原本訂的目標 65~75 是錯的。
因為提燈幽魂是**近黑**，洞壁壓到 75 以下它就糊掉了 —— 那是舊版第 4 關骨龍問題的鏡像。
**角色可讀性優先。** 真正的明度下降從第 4 關開始（骨白骨龍需要暗背景），那關才是轉折點。
第 2→3 關的「越來越深入」改由另外三個訊號承擔：**沒有天空、色相轉冷、飽和度更低**。

**可見範圍的實務數字**（以 stage1 的 cropY=179 為例）：可見帶是 y `179..448`，
但 `cover` 還會切掉帶頂 25.5px，所以**真正看得到的是 y 190..433 ＝ 33.2%~75.7%**。
地平線（天空／草地）在 48.1%（y 275）的話，**可見的天空只剩 85px** ——
雲、樹冠、任何「天上的東西」都得擠進那 85px 裡，這比 prompt 裡寫的 38~60% 還緊。
所以每張都要在裁完之後**再量一次**天上的東西有沒有被切到。

**選配：改用 2K 產圖可以消掉放大。** 目前 1024 → 1600 是 1.56 倍放大，
是畫面糊掉的主因之一。若 Gemini 能出 2048x1152，把腳本改成
`crop=2048:538:0:374` 再 `scale=1600:420`，就變成**縮小**，銳利度會明顯好一階。

相關：`PROMPTS.md`（角色）、`.claude/math-rpg-stages.sh`、`assets/js/math-rpg.js` 的 `STAGE_IMAGES`
