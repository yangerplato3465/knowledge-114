# 數學 RPG 圖片產製 prompt(給 Gemini)

每一段都已經拼好,**整段直接複製貼上**即可,不用自己組基底。

## 使用規則
1. 角色圖用 **1:1**,背景圖用 **16:9**。
2. **產每一隻怪物時,都要把已定稿的 `hero.png` 當參考圖一起上傳**,沒上傳風格會走鐘。
3. ⚠️ **踩坑(2026-08-20)**:上傳參考圖後 Gemini 會進入「編輯這張圖」模式,如果 prompt
   開頭寫「match the reference image」,它會直接回你一張一模一樣的勇者。所以每段 prompt
   的第一句都必須是**否定句**:明講這是新角色、勇者不可以出現在輸出裡。
   如果加了否定句還是給你勇者,就**改開新對話、不要上傳參考圖**,改用下面的「文字風格錨」。
3. 角色的洋紅背景不要自己改成白色,去背會破洞。
4. 背景圖(stage)**不用參考圖、不用洋紅底**。

## 勇者已定稿(2026-08-20)
第一張勇者已驗收,成為全套的風格基準。特徵:粗黑描邊、藍金法師袍、紫色長髮、
金色球形法杖、寫著數學符號的魔法書、大眼 chibi 比例、正面站姿。
朝向規則:勇者微轉向右、怪物微轉向左,形成對峙感。

---

## 已驗證的標準流程(2026-08-20)
**開新對話 → 上傳 hero.png → 貼下面完整 prompt(第一句是否定句)** ——
史萊姆用這個流程一次就過。每一隻都開新對話,不要在同一串裡連續產,
否則 Gemini 會被前一張帶著走。

**原圖裡角色多大不用管**。六隻怪的體型比例是在去背處理階段統一縮放控制的,
Gemini 給的大小不影響最終結果,不用為了「史萊姆要小、魔王要大」重產。

---

## 備案:文字風格錨(參考圖一直失效時改用這個)

開新對話、**不上傳任何圖**,把下面這段取代每個怪物 prompt 開頭的三行否定句 +
`Style:` 那一段。純文字描述勇者的風格特徵,一致性稍差但絕不會回你一張勇者。

```
Art style: cute chibi fantasy game art. Bold uniform black outlines of even
thickness. Flat cel shading with exactly one soft shadow tone per color, plus
a soft rim light from the upper left. Vibrant saturated palette built around
royal blue, warm gold and purple. Large expressive eyes with white highlights.
Chibi proportions with an oversized head. Clean vector-like finish, no texture,
no painterly brushwork. Mobile game asset quality.
```

---

# 怪物 6 張(記得上傳 hero.png 當參考圖)

## enemy1.webp — 史萊姆怪(最弱,HP 20)
```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, outline
weight, shading and color treatment, but do NOT copy, redraw, edit or include
the wizard character from it. The wizard girl must not appear anywhere in the
output. The output must contain only the single new monster described below.

2D game character asset for a children's educational math RPG.
Style: cute chibi fantasy, bold clean black outlines, flat cel shading with
soft rim light from the upper left, vibrant saturated colors, friendly and
non-scary, mobile game art quality.
Use hard-edged cel shading with flat blocks of color — no smooth airbrush
gradients anywhere on the character.
Full body, single character, centered, standing on flat ground.
The character's feet must touch the very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform,
no gradient, no floor, no props.
Do NOT draw any shadow onto the background — no ellipse or contact shadow
beneath the character, no drop shadow. The magenta area must stay 100% clean
and untouched everywhere.
No text, no watermark, no border, no UI elements.
Square 1:1 composition.

Subject: a small cute green slime blob monster with big round eyes and a tiny
smile, jelly-like glossy body with a soft highlight on top. Harmless and funny,
not scary at all. This is the weakest enemy in the game.
Small in the frame — it should occupy only the lower half of the square.
Front-facing, three-quarter view turned slightly toward the LEFT.
```

## enemy2.webp — 幽靈怪(HP 28)
```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, outline
weight, shading and color treatment, but do NOT copy, redraw, edit or include
the wizard character from it. The wizard girl must not appear anywhere in the
output. The output must contain only the single new monster described below.

2D game character asset for a children's educational math RPG.
Style: cute chibi fantasy, bold clean black outlines, flat cel shading with
soft rim light from the upper left, vibrant saturated colors, friendly and
non-scary, mobile game art quality.
Use hard-edged cel shading with flat blocks of color — no smooth airbrush
gradients anywhere on the character.
Full body, single character, centered, standing on flat ground.
The character's feet must touch the very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform,
no gradient, no floor, no props.
Do NOT draw any shadow onto the background — no ellipse or contact shadow
beneath the character, no drop shadow. The magenta area must stay 100% clean
and untouched everywhere.
No text, no watermark, no border, no UI elements.
Square 1:1 composition.

Subject: a friendly round ghost, pale lavender-white body, a translucent wispy
tail instead of legs, big cartoon eyes, a slightly mischievous grin. Cute and
playful, absolutely not frightening.
The wispy tail must reach all the way down to the very bottom edge of the image.
Small to medium size in the frame.
Front-facing, three-quarter view turned slightly toward the LEFT.
```

## enemy3.webp — 蝙蝠怪(HP 40)
```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, outline
weight, shading and color treatment, but do NOT copy, redraw, edit or include
the wizard character from it. The wizard girl must not appear anywhere in the
output. The output must contain only the single new monster described below.

2D game character asset for a children's educational math RPG.
Style: cute chibi fantasy, bold clean black outlines, flat cel shading with
soft rim light from the upper left, vibrant saturated colors, friendly and
non-scary, mobile game art quality.
Use hard-edged cel shading with flat blocks of color — no smooth airbrush
gradients anywhere on the character.
Full body, single character, centered, standing on flat ground.
The character's feet must touch the very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform,
no gradient, no floor, no props.
Do NOT draw any shadow onto the background — no ellipse or contact shadow
beneath the character, no drop shadow. The magenta area must stay 100% clean
and untouched everywhere.
No text, no watermark, no border, no UI elements.
Square 1:1 composition.

Subject: a purple cartoon bat monster with oversized spread wings, large round
eyes, two tiny fangs, a fluffy cream-colored chest, small clawed feet planted
on the ground. Mischievous but cute.
Medium size in the frame.
Front-facing, three-quarter view turned slightly toward the LEFT.
```

## enemy4.webp — 小巨龍(HP 56)
```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, outline
weight, shading and color treatment, but do NOT copy, redraw, edit or include
the wizard character from it. The wizard girl must not appear anywhere in the
output. The output must contain only the single new monster described below.

2D game character asset for a children's educational math RPG.
Style: cute chibi fantasy, bold clean black outlines, flat cel shading with
soft rim light from the upper left, vibrant saturated colors, friendly and
non-scary, mobile game art quality.
Use hard-edged cel shading with flat blocks of color — no smooth airbrush
gradients anywhere on the character.
Full body, single character, centered, standing on flat ground.
The character's feet must touch the very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform,
no gradient, no floor, no props.
Do NOT draw any shadow onto the background — no ellipse or contact shadow
beneath the character, no drop shadow. The magenta area must stay 100% clean
and untouched everywhere.
No text, no watermark, no border, no UI elements.
Square 1:1 composition.

Subject: a young orange-red dragon with chunky chibi proportions, small wings,
a cream-colored belly, a tiny flame puffing from its nose, standing upright on
two sturdy legs. Fierce-looking but adorable.
Clearly bigger than a slime — fills about two thirds of the frame height.
Front-facing, three-quarter view turned slightly toward the LEFT.
```

## enemy5.webp — 惡鬼(HP 76)
```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, outline
weight, shading and color treatment, but do NOT copy, redraw, edit or include
the wizard character from it. The wizard girl must not appear anywhere in the
output. The output must contain only the single new monster described below.

2D game character asset for a children's educational math RPG.
Style: cute chibi fantasy, bold clean black outlines, flat cel shading with
soft rim light from the upper left, vibrant saturated colors, friendly and
non-scary, mobile game art quality.
Use hard-edged cel shading with flat blocks of color — no smooth airbrush
gradients anywhere on the character.
Full body, single character, centered, standing on flat ground.
The character's feet must touch the very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform,
no gradient, no floor, no props.
Do NOT draw any shadow onto the background — no ellipse or contact shadow
beneath the character, no drop shadow. The magenta area must stay 100% clean
and untouched everywhere.
No text, no watermark, no border, no UI elements.
Square 1:1 composition.

Subject: a red oni ogre monster with two small ivory horns, wild dark hair,
a tiger-skin loincloth, holding a studded wooden club resting on its shoulder,
a big confident grin showing two tusks. Muscular but cartoonish and playful,
appropriate for children — no blood, no wounds, nothing menacing.
Color note: use a DEEP crimson red, clearly darker and cooler than orange.
This character will be placed against a warm orange volcanic background, so it
must stay clearly readable against it — avoid orange or warm-tan body tones,
and keep the dark hair and the ivory horns as strong contrasting accents.
Large — fills most of the frame height.
Front-facing, three-quarter view turned slightly toward the LEFT.
```

## enemy6.webp — 魔王(最終王,HP 100)
```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, outline
weight, shading and color treatment, but do NOT copy, redraw, edit or include
the wizard character from it. The wizard girl must not appear anywhere in the
output. The output must contain only the single new monster described below.

2D game character asset for a children's educational math RPG.
Style: cute chibi fantasy, bold clean black outlines, flat cel shading with
soft rim light from the upper left, vibrant saturated colors, friendly and
non-scary, mobile game art quality.
Use hard-edged cel shading with flat blocks of color — no smooth airbrush
gradients anywhere on the character.
Full body, single character, centered, standing on flat ground.
The character's feet must touch the very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform,
no gradient, no floor, no props.
Do NOT draw any shadow onto the background — no ellipse or contact shadow
beneath the character, no drop shadow. The magenta area must stay 100% clean
and untouched everywhere.
No text, no watermark, no border, no UI elements.
Square 1:1 composition.

Subject: the final boss demon lord — dark purple skin, large curved gold-tipped
horns, a golden crown, a flowing black-and-crimson cape with gold trim, glowing
amber eyes, arms crossed confidently over the chest. Imposing, regal and grand,
but still stylized and cartoonish — intimidating, never gory or horrifying.
Fills the entire frame height, clearly the biggest and most impressive of all
the monsters.
Front-facing, three-quarter view turned slightly toward the LEFT.
```

---

# 場景背景 6 張(不用參考圖、不用洋紅底、16:9)

## stage1.webp — 草原(第一關)
```
2D game background for a children's educational math RPG, side-view battle arena.
Style: painterly cartoon, soft shapes, gentle lighting, matching a cute chibi
fantasy game. Slightly desaturated and low contrast so that white UI text stays
readable on top.
Composition: the LOWER THIRD must be flat, open, empty ground for characters to
stand on. The middle and upper areas hold the scenery. Keep the center and the
lower left and lower right corners visually calm and uncluttered.
No characters, no creatures, no text, no UI, no logos.
16:9 wide landscape.

Scene: a bright sunny grassland, rolling green hills in the distance, a few
fluffy white clouds in a light blue sky, scattered tiny flowers near the horizon.
Cheerful and welcoming — this is the very first stage.
Sky tone around #cfe8f7, grass around #7cb85c.
```

## stage2.webp — 森林(第二關)
```
2D game background for a children's educational math RPG, side-view battle arena.
Style: painterly cartoon, soft shapes, gentle lighting, matching a cute chibi
fantasy game. Slightly desaturated and low contrast so that white UI text stays
readable on top.
Composition: the LOWER THIRD must be flat, open, empty ground for characters to
stand on. The middle and upper areas hold the scenery. Keep the center and the
lower left and lower right corners visually calm and uncluttered.
No characters, no creatures, no text, no UI, no logos.
16:9 wide landscape.

Scene: a peaceful forest clearing, tall trees framing the far left and far right
edges high up, dappled sunlight filtering through the canopy, a soft green haze
between the trunks, flat mossy ground.
Sky tone around #bce0c8, ground around #5a9560.
```

## stage3.webp — 洞窟(第三關)
```
2D game background for a children's educational math RPG, side-view battle arena.
Style: painterly cartoon, soft shapes, gentle lighting, matching a cute chibi
fantasy game. Slightly desaturated and low contrast so that white UI text stays
readable on top.
Composition: the LOWER THIRD must be flat, open, empty ground for characters to
stand on. The middle and upper areas hold the scenery. Keep the center and the
lower left and lower right corners visually calm and uncluttered.
No characters, no creatures, no text, no UI, no logos.
16:9 wide landscape.

Scene: an underground crystal cavern, stalactites hanging from the top edge,
faintly glowing TEAL and cyan crystals embedded in the rock walls, cool dim
ambient light, flat stone floor.
Color note: the purple bat monster fights here, so the cave must be teal-blue,
NOT purple or violet — otherwise the character disappears into the background.
Upper tone around #7fa3ad, floor a dark slate around #2b3a42.
```

## stage4.webp — 沼澤(第四關)
```
2D game background for a children's educational math RPG, side-view battle arena.
Style: painterly cartoon, soft shapes, gentle lighting, matching a cute chibi
fantasy game. Slightly desaturated and low contrast so that white UI text stays
readable on top.
Composition: the LOWER THIRD must be flat, open, empty ground for characters to
stand on. The middle and upper areas hold the scenery. Keep the center and the
lower left and lower right corners visually calm and uncluttered.
No characters, no creatures, no text, no UI, no logos.
16:9 wide landscape.

Scene: a murky swamp, twisted bare trees in the background, drifting low fog,
still dark-green water pools at the far left and far right sides, a flat muddy
bank running across the bottom. Gloomy but not horrifying.
Overcast olive sky around #a3b79c, ground around #6a7a4c.
```

## stage5.webp — 火山(第五關)
```
2D game background for a children's educational math RPG, side-view battle arena.
Style: painterly cartoon, soft shapes, gentle lighting, matching a cute chibi
fantasy game. Slightly desaturated and low contrast so that white UI text stays
readable on top.
Composition: the LOWER THIRD must be flat, open, empty ground for characters to
stand on. The middle and upper areas hold the scenery. Keep the center and the
lower left and lower right corners visually calm and uncluttered.
No characters, no creatures, no text, no UI, no logos.
16:9 wide landscape.

Scene: a volcanic wasteland, a smoking volcano on the distant horizon, orange
embers floating in the air, cracked dark basalt ground with faint glowing lava
seams running through it. Hot and hazy.
Color note: a deep red oni fights here. Keep the sky a smoky, muted burnt orange
(around #c97f52) rather than a bright glowing orange, and make the ground a DARK,
nearly black basalt (around #2a1512). Both must be far enough from the oni's red
that he reads clearly. Do not make the ground orange or warm brown.
```

## stage6.webp — 魔王城(最終關)
```
2D game background for a children's educational math RPG, side-view battle arena.
Style: painterly cartoon, soft shapes, gentle lighting, matching a cute chibi
fantasy game. Slightly desaturated and low contrast so that white UI text stays
readable on top.
Composition: the LOWER THIRD must be flat, open, empty ground for characters to
stand on. The middle and upper areas hold the scenery. Keep the center and the
lower left and lower right corners visually calm and uncluttered.
No characters, no creatures, no text, no UI, no logos.
16:9 wide landscape.

Scene: the interior of a demon lord's throne hall, tall gothic pillars on both
sides, a huge stained-glass rose window in the background, COLD BLUE flame
braziers flanking the room, a dark polished stone floor. Ominous and grand,
but not gory.
Color note: the demon lord himself is purple with a crimson-and-gold cape, so
this hall must be a deep midnight BLUE, NOT purple and not warm red — the boss
has to stand out against it.
Upper tone around #3d4a6b, floor around #141a28.
```

---

# 第二批:轉向與攻擊姿勢(2026-08-20 追加)

**產「同一角色的另一個姿勢」比產新角色容易很多。** 當初害我們拿到一張一模一樣勇者的
那個特性(Gemini 上傳參考圖後傾向保留主體),在這裡剛好是優勢——這次我們就是要它
保留角色、只改姿勢。所以**不要**再寫否定句,反過來明講「保持同一角色」。

作法:開新對話 → 上傳該角色**已定稿的原圖**(Downloads 裡那張,不是去背後的)→ 貼 prompt。

## 共用開頭(每段都貼)
```
Keep this exact character — same face, same outfit, same colors, same proportions,
same art style, same black outline weight. Do not redesign anything, do not change
the character's identity. Only the POSE changes.

Same square 1:1 canvas, full body, feet touching the very bottom edge.
Background: flat solid magenta #FF00FF, completely clean and uniform.
Do NOT draw any shadow on the ground. No text, no watermark.
```

⚠️ **hero-right 定案後,勇者的攻擊圖要用「朝右版」當參考圖**,不能再用最初那張正面的
`hero.png` —— 否則攻擊姿勢會退回正面、魔法書也不發光,站姿與攻擊切換時會很跳。

## hero-right.png — 勇者改成朝右(優先做,六關都會用到)
```
[貼共用開頭]
New pose: the character is turned to face RIGHT in a three-quarter view — body
angled toward the right side of the image, head turned right, eyes looking right
at an opponent standing off-frame to the right. Still standing calmly, staff in
hand, book in the other hand. Confident expression.
```

## 攻擊姿勢 7 張(hero-atk / enemy1-atk … enemy6-atk)
勇者朝右出擊、怪物朝左出擊。共用開頭後接:

- **hero-atk**:`New pose: mid-attack, stepping forward to the RIGHT, thrusting the glowing staff forward with both hands, body leaning into the strike, mouth open in a shout, hair and cape swept back by the motion.`
- **enemy1-atk 史萊姆**:`New pose: mid-attack, lunging LEFT — the blob squashes down and springs, body stretched forward and upward into a wobbling teardrop, eyes narrowed, mouth open.`
- **enemy2-atk 幽靈**:`New pose: mid-attack, rushing LEFT with both wispy arms thrown forward, tail streaming behind, face fierce with a wide open mouth.`
- **enemy3-atk 蝙蝠**:`New pose: mid-attack, diving LEFT with both wings swept forward and down, small claws extended, mouth open showing fangs.`
- **enemy4-atk 小巨龍**:`New pose: mid-attack, head thrust forward to the LEFT breathing a burst of orange flame, wings flared, front claws raised.`
- **enemy5-atk 惡鬼**:`New pose: mid-attack, swinging the wooden club forward and down toward the LEFT with both hands, body twisted into the swing, mouth wide open shouting.`
- **enemy6-atk 魔王**:`New pose: mid-attack, one arm thrust forward to the LEFT casting dark magic with glowing energy around the hand, cape flaring outward, eyes blazing.`

**收圖後**丟 Downloads,檔名照上面,去背腳本會處理(攻擊圖的縮放比例要跟站姿一致,
否則切換時角色會忽大忽小——腳本已用「高度對齊」所以自動一致)。

---

## 角色 7 張已處理完成(2026-08-20)

去背/裁切/縮放腳本:`.claude\math-rpg-keyer.ps1`(重產某張圖後可直接重跑)。
轉檔:`ffmpeg -c:v libwebp -lossless 0 -quality 88 -preset drawing -pix_fmt yuva420p`。

**實測到的關鍵數字**(重跑或處理背景圖時會用到):
- Gemini 給的洋紅底**不是** `#FF00FF`,實測是 `#FC1AF7` / `#FB25F3` 這類,綠通道有 20~37 殘值,
  每張每角落都不同 → 不能用相等比對,要用色相區間(背景實測 hue≈301、sat≈0.90)。
- 角色身上的紫在 hue 250~285、sat≈0.28;魔王披風的紅在 hue≈345 → 跟背景色相有安全緩衝。
- 去背分兩段:①從畫布邊緣 flood fill(寬鬆門檻 hue 286-340 / sat≥0.30)清主背景,
  角色內部絕不會被挖穿;②嚴格門檻(hue 288-330 / sat≥0.55)補清「封閉孔洞」——
  手臂與身體之間那種被抗鋸齒堵住、flood fill 流不進去的縫隙。**惡鬼少了第②段會殘留洋紅斑點**。
- 體型階梯由縮放控制,不是原圖大小:hero 0.95 / 史萊姆 0.50 / 幽靈 0.62 / 蝙蝠 0.72 /
  龍 0.82 / 惡鬼 0.90 / 魔王 1.00(畫布 512×512,底部對齊)。
- 有損 WebP q88 與無損在 4 倍放大下看不出差異,但檔案小 4 倍(220KB vs 867KB)。
- **半透明光暈會變粉紫**(2026-08-20 勇者朝右版踩到):發光效果在生成時就被合成到洋紅底上,
  存成不透明的淡粉像素,去背救不回 alpha。解法是**去溢色不是刪除**——刪掉會在光暈上打洞。
  實測分界:粉紫髒污 hue 280-340 / **sat 0.06-0.19**;同色相的紫頭髮 sat 0.27+;藍光暈 hue 180-229。
  取 sat < 0.22 當上限,再**限制在背景外擴 20px 的帶狀範圍內**——不限範圍的話會誤啃蝙蝠
  耳朵那種低飽和淺紫,產生灰色雜點。
- 之後產「帶發光效果」的圖(攻擊姿勢很可能會有)都會遇到同一件事,腳本已內建處理。
- **紫色角色最容易被去背誤傷**(2026-08-20 勇者頭髮被戳出洞才發現):
  - 「封閉孔洞」清除原本用 sat ≥ 0.55,但**紫髮高光的飽和度可達 0.70**,整批被當成背景刪掉,
    在頭髮上打出透明的洞。實測真正的背景是 **sat 0.90**,所以門檻拉到 **0.75** 才安全。
  - 同一道清除還加了**連通面積下限 150px**:真孔洞(手臂與身體之間)是一整片,
    角色身上的誤判是散點,用面積就分得開。
  - 邊緣去溢色原本只看「R 和 B 都比 G 高」——**任何紫色都符合這條**,所以髮絲被拉成灰色
    還被降透明度。改成**同時檢查色相**(溢色在 300 附近、角色紫色在 250-285,以 288 分界)。
  - 診斷訣竅:**把去背後的圖疊在紅色底上**。灰斑若變紅就是「被打成透明」,
    仍是灰就是「顏色被改」——兩者成因完全不同,疊在灰底上看不出差別。

---

## 收圖進度與處理備註

| 圖 | 狀態 | 處理階段要做的事 |
|---|---|---|
| hero | ✅ **已換成朝右版**(2026-08-20) | 裁切對齊。新版魔法書會發光,光暈被生成器混到洋紅底上變成不透明的粉紫,需要 haze despill(見下) |
| enemy1 史萊姆 | ✅ 通過 | 裁掉底部約 20% 空白、對齊底邊 |
| enemy2 幽靈 | ✅ 通過 | **水平翻轉**(產出來朝右)、裁切對齊;若在淺色關卡對比不足再壓紫調 |
| enemy3 蝙蝠 | ✅ 通過(風格最貼近勇者) | **水平翻轉**(瞳孔朝右)、**清掉腳下的橢圓地面陰影**(暗洋紅、高飽和,可用色相+飽和度判定)、裁切對齊 |
| enemy4 小巨龍 | ✅ 通過(目前最乾淨的一張) | 只需裁切對齊。朝向正確、無地面陰影、火焰未撐大佔位 |
| enemy5 惡鬼 | ✅ 通過(平塗最徹底) | 只需裁切對齊。Color note 生效=深紅不是橘紅;stage5 地面已改為近黑玄武岩以拉開對比 |
| enemy6 魔王 | ✅ 通過(氣勢足、體型最大) | **清掉腳下橢圓地面陰影**(本體是低飽和灰紫、陰影是高飽和洋紅,用飽和度門檻分離)、裁切對齊。**縮放要用身體而非含披風的外框**,否則最終王會被縮得比惡鬼小 |
| stage1~6 | ✅ 已完成(2026-08-20) | 裁成寬扁帶狀 1600×286、逐張對齊地面線;stage3 轉青綠、stage6 轉深藍(見下) |

## 背景圖:16:9 是錯的規格(2026-08-20 才發現)

`.battle-stage` 實測是 **1255×206,約 6:1 的極扁容器**(1280×720 視窗)。
CSS 是 `background-size: cover` + `center bottom`,所以 16:9 的圖**只會顯示最底部 29%**——
天空、遠山、水晶、彩繪窗全部被裁掉,六關都會變成一整片純地面。

處理方式(腳本:`.claude\math-rpg-stages.sh`):
- 從原圖裁一條帶狀放大,**裁切起點逐張抓**,目的是讓該圖的「地面線」對齊角色腳底。
  草原的地平線特別高,要抓得比其他張深很多。這一步沒對準的症狀就是**角色浮在半空中**,
  stage1 調了兩次才對。
- **之後若重產背景,可以直接要求寬扁構圖**(例如 3:1),就不必丟掉大半畫面。

### 二版:放大角色後重裁(2026-08-20 稍晚)
覺得背景被裁掉太可惜,所以把角色放大、戰鬥區加高,空間從題目區與選項區的留白挪過來:

| | 一版 | 二版 |
|---|---|---|
| 角色 `.sprite` | 6.6u(95px) | **12u(156px)** |
| `.sprite-slot` | 7.1u | 13u |
| 戰鬥區高度 | 206px | **276px** |
| 容器長寬比 | 6.09:1 | **4.54:1** |
| 背景裁切帶 | 183px → 1600×286 | **238px → 1600×372** |
| 角色腳底位置 | 容器 56% | 容器 71% |
| 卡片總高(1280×720) | 669px | 639px |

省空間的來源:題目區下方留白 3u→1.2u、題目框 padding 1.5u→1u、關卡地圖上方 1.875u→0.7u、
選項按鈕 padding 1.25u→1u,以及數個 margin。**總高反而比一版還矮 30px**,沒有犧牲可讀性。

已驗證 1920×1080 / 1280×720 / 768×1024 / 390×844 / 844×390 都不溢出、無 clip 警告。
手機橫放(`max-height: 520px` 分支)有自己的 sprite 覆寫,刻意沒跟著放大——那個尺寸空間本來就緊。

## stage3 / stage6 是用舊 prompt 產的
產出來的洞窟仍是藍紫、魔王城仍是紫,跟紫蝙蝠和紫魔王同色系。已用 ffmpeg 色相旋轉補救
(`hue=h=-52` 轉青綠 / `hue=h=-48` 轉深藍),效果不錯。若日後要重產,用檔案裡改過的
prompt 版本就不需要這道補救。

---

## 收圖檢查清單
- [ ] 角色:腳底(幽靈是尾巴尖)有沒有碰到畫布底邊?
- [ ] 角色:六隻怪的體型有沒有由小到大?史萊姆最小、魔王最大
- [ ] 角色:背景是不是乾淨的純洋紅?有漸層或投影的話去背會有殘邊
- [ ] 角色:描邊粗細跟勇者一致嗎?(最容易走鐘的地方)
- [ ] 背景:下方 1/3 是不是平坦空地?
- [ ] 背景:中央和左右下角有沒有塞太多細節?(會被 VS 徽章和血條蓋住)
- [ ] 全部:13 張看起來像同一套美術嗎?
