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

---

## 收圖進度與處理備註

| 圖 | 狀態 | 處理階段要做的事 |
|---|---|---|
| hero | ✅ 已定稿 | 裁掉底部約 8% 空白、對齊底邊 |
| enemy1 史萊姆 | ✅ 通過 | 裁掉底部約 20% 空白、對齊底邊 |
| enemy2 幽靈 | ✅ 通過 | **水平翻轉**(產出來朝右)、裁切對齊;若在淺色關卡對比不足再壓紫調 |
| enemy3 蝙蝠 | ✅ 通過(風格最貼近勇者) | **水平翻轉**(瞳孔朝右)、**清掉腳下的橢圓地面陰影**(暗洋紅、高飽和,可用色相+飽和度判定)、裁切對齊 |
| enemy4 小巨龍 | ✅ 通過(目前最乾淨的一張) | 只需裁切對齊。朝向正確、無地面陰影、火焰未撐大佔位 |
| enemy5 惡鬼 | ✅ 通過(平塗最徹底) | 只需裁切對齊。Color note 生效=深紅不是橘紅;stage5 地面已改為近黑玄武岩以拉開對比 |
| enemy6 魔王 | ✅ 通過(氣勢足、體型最大) | **清掉腳下橢圓地面陰影**(本體是低飽和灰紫、陰影是高飽和洋紅,用飽和度門檻分離)、裁切對齊。**縮放要用身體而非含披風的外框**,否則最終王會被縮得比惡鬼小 |
| stage1~6 | ⬜ 待產 | |

---

## 收圖檢查清單
- [ ] 角色:腳底(幽靈是尾巴尖)有沒有碰到畫布底邊?
- [ ] 角色:六隻怪的體型有沒有由小到大?史萊姆最小、魔王最大
- [ ] 角色:背景是不是乾淨的純洋紅?有漸層或投影的話去背會有殘邊
- [ ] 角色:描邊粗細跟勇者一致嗎?(最容易走鐘的地方)
- [ ] 背景:下方 1/3 是不是平坦空地?
- [ ] 背景:中央和左右下角有沒有塞太多細節?(會被 VS 徽章和血條蓋住)
- [ ] 全部:13 張看起來像同一套美術嗎?
