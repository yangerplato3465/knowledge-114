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


# 第五批:蝙蝠／小巨龍／惡鬼「霸氣化」(2026-08-20)

魔王重畫後的霸氣感來自四件可移植的事,不是畫功:**動態架勢**(不是中立站姿)、
**身後有東西飄**(額外的面積與動勢)、**深色高對比＋金屬色點綴**、**身上帶特效**。
下面三段就是把這四點套到各自的角色上。

**史萊姆刻意不改**——它的定位是「最弱的那隻」,六隻都拉滿會失去「越後面越危險」
的視覺敘事,學生一看就知道走到哪一關的資訊會不見。

⚠️ **存檔位置**:直接覆蓋 `enemy3.png` / `enemy4.png` / `enemy5.png`。
參考圖也用同一個檔(即目前遊戲裡在用的那版)。

> `-side` 那套檔名已在 2026-08-20 廢除:側身版已取代原圖,腳本改回單純吃
> `enemyN.png`,而且**所有角色的 flip 都是 false**(每隻都已重產成原生朝左)。
> 之後若某張圖真的產出朝右,才需要把該隻的 flip 改回 true。

## enemy3-side.png — 蝙蝠霸氣化
```
Keep this EXACT character — the same purple bat with the cream chest fluff, same
art style, same bold black outline weight, same flat cel shading. It must stay
recognisably the same creature. ONLY the pose, colors and intensity change.

Make this character look powerful and imposing, in the same way a final boss does:
- A dynamic ACTION stance, not a neutral standing pose — weight shifted, limbs
  extended, caught mid-motion.
- Something with mass flowing behind it to add movement.
- DEEPER, richer colors with strong dark-to-light contrast, plus a few bone-white
  accents on details like claws and fangs.
- A wisp of dark energy close to the body.
- Sharper, more confident eyes — narrowed and focused, not round and cute.

Specifically: it lunges forward in a diving attack, both wings swept forward and
down, claws spread and reaching, mouth open in a screech showing long bone-white
fangs. The ear tufts and chest fluff blow backward from the rush. Deepen the body
to a darker violet with near-black shading on the wing membranes, and add thin
trailing wisps of shadow behind it.

It still faces LEFT, screeching at an opponent standing off-frame to the left.
Keep the SAME overall size and SAME height as the reference image, with its lowest
point still touching the very bottom edge. Do not zoom in or crop closer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the wings and the shadow wisps INSIDE the frame — they must not
stretch to the canvas edges. No text, no watermark, no border.
```

## enemy4.png — 小巨龍霸氣化
```
Keep this EXACT character — the same young orange-red dragon with the cream belly,
same art style, same bold black outline weight, same flat cel shading. It must stay
recognisably the same creature. ONLY the pose, colors and intensity change.

Make this character look powerful and imposing, in the same way a final boss does:
- A dynamic ACTION stance, not a neutral standing pose — weight shifted onto one
  leg, limbs raised, caught mid-motion.
- Something with mass flowing behind it to add movement.
- DEEPER, richer colors with strong dark-to-light contrast, plus bone-white accents
  on the horns and claws.
- A wisp of fire close to the body.
- Sharper, more confident eyes — narrowed and focused, not round and cute.

Specifically: wings spread wide and raised high, neck arched back mid-roar, front
claws raised and spread, tail lashing behind it. A burst of orange flame escapes
between its teeth. Deepen the body to a richer red-orange with much darker shading
in the crevices, and give the horns and claws a hard bone-white sheen.

It still faces LEFT, roaring at an opponent standing off-frame to the left.
Keep the SAME overall size and SAME standing height as the reference image, feet
still touching the very bottom edge. Do not zoom in or crop closer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the wings, tail and flame INSIDE the frame — they must not
stretch to the canvas edges. No text, no watermark, no border.
```

## enemy5-side.png — 惡鬼霸氣化
```
Keep this EXACT character — the same red oni with the tiger-skin loincloth, the
wooden club, the ivory horns and the wild dark hair. Same art style, same bold
black outline weight, same flat cel shading. It must stay recognisably the same
creature. ONLY the pose, colors and intensity change.

Make this character look powerful and imposing, in the same way a final boss does:
- A dynamic ACTION stance, not a neutral standing pose — weight shifted onto one
  leg, arms raised, caught mid-motion.
- Hair and cloth flowing to add movement.
- DEEPER, richer colors with strong dark-to-light contrast, plus bone-white accents
  on the horns and tusks.
- A wisp of heat and embers close to the body.
- Sharper, more confident eyes — narrowed and focused, not round and cute.

Specifically: he swings the club up over his head with both hands, body twisted
into the wind-up, one foot forward, roaring with his mouth wide open showing both
tusks. His dark hair whips upward. Deepen the skin to a darker crimson with strong
shadow on the muscles, and add faint embers and heat haze rising close around him.

It still faces LEFT, roaring at an opponent standing off-frame to the left.
Keep the SAME overall size and SAME standing height as the reference image, feet
still touching the very bottom edge. Do not zoom in or crop closer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the club and the embers INSIDE the frame — they must not stretch
to the canvas edges. No text, no watermark, no border.
```

---

# 第四批:幽靈與魔王重畫(2026-08-20)

這兩隻不是調朝向而已,是**保留畫風但改掉造型/表情/配色**。所以參考圖的定位要講清楚:
**只當風格範本,不是要保留這個角色的長相**——並且把「要改什麼」逐條列出來,
否則 Gemini 會傾向整張原封不動還你。

存成 `enemy2-side.png` / `enemy6-side.png`。**幽靈重畫後是原生朝左,腳本不會再翻轉它**
(舊版是靠翻轉才朝左的,那也是光源跑到右上的原因)。

## enemy2-side.png — 幽靈重畫
要修的:光源方向反了、造型太單調、表情不對。
```
Use the attached image as a STYLE reference ONLY — same art style, same bold black
outline weight, same flat cel shading, same chibi proportions, same mobile-game
finish. Do NOT simply reproduce the character; redraw it with the changes below.

Changes:
- LIGHTING: light comes from the UPPER LEFT. The highlight sits on the upper-left
  of the body. (The reference is lit from the right — that is the mistake to fix.)
- FACING: the ghost faces LEFT. Head and body turned toward the left edge, looking
  at an opponent standing off-frame to the LEFT. Draw it facing left natively —
  do not mirror the reference.
- SILHOUETTE: give it a much more interesting shape. The lower body ends in a
  tattered, ragged cloth hem with three or four uneven trailing wisps instead of one
  smooth teardrop, and both little arms are clearly visible reaching forward.
- EXPRESSION: playful and cheeky rather than sinister — a wide toothy grin, one eye
  squinted, tongue poking out, as if taunting the hero. Mischievous, never scary.
- COLOR: pale lavender-blue body, NOT pure white, so it reads clearly against a
  light green forest background. Keep the heavy black outline.

Full body, single character, centered. The lowest wisp of its tail must touch the
very bottom edge of the image.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow.
No text, no watermark, no border. Square 1:1 composition.
```

### 幽靈第二輪:只改表情
第一輪把造型/配色/光源/朝向都修好了,但表情寫過頭——`playful and cheeky` +
`tongue poking out` + `taunting` 直接被照做,變成搗蛋鬼而不是敵人。
**參考圖要用第一輪產出的那張**(不是最早的白幽靈),只換表情:
```
Keep this EXACT character — same body shape, same tattered trailing wisps, same
pale lavender-blue color, same lighting from the upper left, same facing direction,
same art style and outline weight. ONLY the facial expression changes.

Remove the winking eye and the sticking-out tongue completely.

New expression: both eyes open and narrowed into a menacing stare, brows angled
down into a sharp V, and a sly closed-mouth smirk with one small fang showing at
the corner. It is sizing up an opponent — confident and a little sinister, but
still cartoonish and never frightening for children.

Same square 1:1 canvas, the lowest wisp still touching the very bottom edge.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background. No text, no watermark, no border.
```
想更兇:把 smirk 換成 `mouth open in a silent howl, showing two small fangs`。
想更冷淡:換成 `an expressionless, hollow stare with no mouth visible`(這版最陰森,
但對低年級可能偏可怕)。

## enemy6-side.png — 魔王重畫
要修的:身體要側身、壓迫感不夠、配色跟藍色魔王城太近。
```
Use the attached image as a STYLE reference ONLY — same art style, same bold black
outline weight, same flat cel shading, same mobile-game finish. Do NOT simply
reproduce the character; redraw it with the changes below.

Changes:
- POSE: he is STRIDING toward the LEFT, caught mid-step — chest and hips turned
  toward the left edge, one leg forward and one trailing behind, seen from the side.
  He is NOT facing the viewer. He is bearing down on an opponent off-frame to the LEFT.
- ONE ARM RAISED, the open hand wreathed in crackling dark magical energy, instead
  of arms crossed. Keep the glow close to the hand.
- IMPOSING: broader shoulders, taller and heavier build, the cape flaring outward
  and upward behind him as if caught in wind. He must read as the final boss.
- COLOR: much DEEPER, almost black-violet skin, and a richer deep-crimson cape with
  more gold trim. He will stand in a midnight-BLUE castle hall, so he must not be a
  mid-tone purple or he disappears into it.
- LIGHTING: light from the UPPER LEFT.

Full body, single character, centered, feet touching the very bottom edge.
He fills the frame — the largest and most impressive of all the monsters.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow.
Keep the cape inside the frame. No text, no watermark, no border. Square 1:1.
```

⚠️ 依前兩次經驗,**「側身」多半只會轉到頭**。魔王這段改用「大步走過去(striding, mid-step)」
的**動作**來暗示側身,而不是描述姿勢——走路的姿態本身就會逼出身體轉向。

---

# 第三批:讓怪物真的側身面對勇者(2026-08-20)

初版寫 `three-quarter view turned slightly toward the LEFT` **太軟了**,Gemini 只把眼珠
轉過去,身體仍然正對觀眾。站姿是每一題都看得到的畫面,這個突兀感比攻擊動畫還明顯。

要改的只有三隻:**蝙蝠、惡鬼、魔王**(都是正面站姿)。
史萊姆是球體沒有正面可言、幽靈和小巨龍已經朝左,都不用動。

流程同前:開新對話 → 上傳**該怪物自己的原圖** → 整段貼下面。
存成 `enemy3-side.png` / `enemy5-side.png` / `enemy6-side.png`(**不要覆蓋原圖**,
萬一側身版更差還能退回)。去背腳本會自動優先使用 `-side` 檔。

## 共用段落(每段都已含在下面,這裡只是說明)
關鍵是**列出所有身體部位**——肩、軀幹、腰、腳——並明講「不是面向觀眾」。
只寫 "turn to the left" 它會理解成轉個頭而已。

## enemy3-side.png — 蝙蝠側身
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the body orientation changes.

Keep the character at the SAME overall size and SAME height as in the reference
image, still touching the very bottom edge. Do not zoom in or crop closer.

Turn the character's WHOLE BODY to face LEFT: head, shoulders, torso and feet all
rotated toward the left side of the image, seen in a three-quarter side view.
It is NOT facing the viewer — it is looking at an opponent standing off-frame to
the LEFT. One wing is nearer the viewer and one is partly behind the body.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

## enemy5-side.png — 惡鬼側身
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the body orientation changes.

Keep the character at the SAME overall size and SAME standing height as in the
reference image, feet still touching the very bottom edge. Do not zoom in.

Turn the character's WHOLE BODY to face LEFT: head, shoulders, chest, hips and
both feet all rotated toward the left side of the image, seen in a three-quarter
side view. It is NOT facing the viewer — it is glaring at an opponent standing
off-frame to the LEFT. The club still rests on the shoulder nearer the viewer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

## enemy6-side.png — 魔王側身
```
Keep this EXACT character — same face, same outfit, same colors, same proportions,
same art style, same black outline weight. Do not redesign anything, do not change
the character's identity or palette. ONLY the body orientation changes.

Keep the character at the SAME overall size and SAME standing height as in the
reference image, feet still touching the very bottom edge. Do not zoom in.

Turn the character's WHOLE BODY to face LEFT: head, horns, shoulders, chest, hips
and both feet all rotated toward the left side of the image, seen in a three-quarter
side view. It is NOT facing the viewer — it is staring down an opponent standing
off-frame to the LEFT. Arms stay crossed, and the cape falls behind the body.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the cape close to the body, not spilling to the canvas edges.
No text, no watermark, no border.
```

⚠️ **這三隻若改成側身,對應的攻擊圖要用側身版當參考圖重產**,否則攻擊瞬間會轉回正面。
所以順序是:先確認側身站姿 OK,再產攻擊姿。

---

# 第二批:攻擊姿勢 7 張(2026-08-20)

**寫法跟產角色時完全相反。** 當初害我們拿到一張一模一樣勇者的那個特性
(上傳參考圖後 Gemini 傾向保留主體),在這裡剛好是優勢——這次就是要它保留角色、只改姿勢。
所以**不要否定句**,反過來明講「保持同一角色」。勇者轉向那次已經驗證這招可行。

**流程**:每一隻都開新對話 → 上傳**該角色自己的原圖**(Downloads 裡那張,不是去背後的)
→ 整段貼下面的 prompt。勇者要用**朝右版**的 `hero.png`。

⚠️ **一定要保留「維持相同高度」那兩句**。攻擊姿勢常會前傾、壓低身體,整體高度一變,
去背腳本按高度對齊縮放時就會把它放大,切換動作時角色會忽大忽小。

⚠️ **特效要靠近身體**。火焰、魔法光如果噴到接近畫布邊緣,會把去背後的外框撐大,
角色本體反而被縮小。

## hero-atk.png — 勇者攻擊
```
Keep this EXACT character — same face, same outfit, same colors, same proportions,
same art style, same black outline weight. Do not redesign anything, do not change
the character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size and SAME standing height as in the
reference image: the head stays at roughly the same height in the frame and the
feet still touch the very bottom edge. Do not zoom in or crop closer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep any glow close to the body, never spilling to the canvas edges.
No text, no watermark, no border.

New pose: mid-attack — the hero thrusts the glowing staff forward to the RIGHT,
body leaning into the strike, front foot stepping forward, long hair swept back by
the motion, mouth open in a determined shout. The staff orb and the magic book
glow brighter with magical energy.
```

## enemy1-atk.png — 史萊姆攻擊
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size as in the reference image, and it must
still touch the very bottom edge of the canvas. Do not zoom in or crop closer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.

New pose: mid-attack — the slime squashes down and springs forward to the LEFT,
its body stretched into a leaning teardrop, eyes narrowed, mouth open wide.
The bottom of its body still touches the bottom edge of the canvas.
```

## enemy2-atk.png — 幽靈攻擊
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size as in the reference image, and its
wispy tail must still reach the very bottom edge of the canvas. Do not zoom in.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.

New pose: mid-attack — the ghost rushes forward to the LEFT with both wispy arms
thrown out ahead of it, tail streaming behind, face fierce with a wide open mouth.
```

## enemy3-atk.png — 蝙蝠攻擊
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size and SAME height as in the reference
image, still touching the very bottom edge. Do not zoom in or crop closer.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.

New pose: mid-attack — the bat lunges forward to the LEFT with both wings swept
forward and down, small claws extended, mouth open showing its fangs.
Keep the wingspan no wider than in the reference image.
```

## enemy4-atk.png — 小巨龍攻擊
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size and SAME standing height as in the
reference image, feet still touching the very bottom edge. Do not zoom in.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.

New pose: mid-attack — the dragon thrusts its head forward to the LEFT and breathes
a burst of orange flame, wings flared, front claws raised. Keep the flame COMPACT
and close to the snout — it must not stretch toward the canvas edge.
```

## enemy5-atk.png — 惡鬼攻擊
```
Keep this EXACT character — same face, same colors, same proportions, same art
style, same black outline weight. Do not redesign anything, do not change the
character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size and SAME standing height as in the
reference image, feet still touching the very bottom edge. Do not zoom in.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.

New pose: mid-attack — the oni swings its wooden club forward and down toward the
LEFT with both hands, body twisted into the swing, mouth wide open shouting.
Keep the club inside the frame.
```

## enemy6-atk.png — 魔王攻擊
```
Keep this EXACT character — same face, same outfit, same colors, same proportions,
same art style, same black outline weight. Do not redesign anything, do not change
the character's identity or palette. ONLY the pose changes.

Keep the character at the SAME overall size and SAME standing height as in the
reference image, feet still touching the very bottom edge. Do not zoom in.

Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the magical glow close to the hand, never spilling to the
canvas edges. No text, no watermark, no border.

New pose: mid-attack — the demon lord thrusts one arm forward to the LEFT, casting
dark magic with glowing energy gathered around the open hand, cape flaring outward,
eyes blazing.
```

## 收圖檢查(攻擊圖專用)
- [ ] 是同一個角色嗎?臉、配色、描邊有沒有被重新設計?
- [ ] **整體高度跟站姿差不多嗎?**(差太多的話切換動作時角色會忽大忽小)
- [ ] 腳底/尾巴尖有沒有碰到畫布底邊?
- [ ] 特效有沒有噴到接近畫布邊緣?
- [ ] 腳下有沒有又被畫上橢圓陰影?

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

---

# 第六批:蝙蝠／小巨龍／惡鬼「魔王級精緻化」(2026-08-24)

**第五批從來沒產出來過** —— `Downloads\enemy3.png` / `enemy5.png` 的時間戳跟遊戲裡的 webp
同一批,三隻至今仍是初版可愛中立站姿。這一批取代第五批,不要再用第五批那三段。

## 第五批漏掉的東西:裝備

魔王看起來「霸氣中二又精緻」,拆開來是六件事,第五批只寫到後兩件:

1. **金色描邊的華麗裝備** ← 最關鍵,也是第五批完全沒寫的。魔王身上有角冠、金邊肩甲、
   腰帶紅寶石、層疊甲片、金邊披風。**精緻感幾乎全部來自這裡**,不是來自畫功。
2. **身後有大面積布料飄動** —— 披風。增加剪影面積與動勢。
3. **深色高對比配色** —— 近黑紫 + 深緋紅 + 金,三色而已,不雜。
4. **身上帶特效** —— 手中的暗黑魔力。
5. 動態架勢,不是中立站姿。
6. 銳利表情,眼神瞇起。

## 體型／華麗度階梯(魔王必須留在頂端)

三隻都給裝備的話會蓋過魔王,所以**裝備量分級**:

| | 裝備量 | 身後飄的東西 |
|---|---|---|
| 蝙蝠(關 3) | 少:金耳環、金邊頸甲、一顆小寶石 | 細長的影子尾跡 |
| 小巨龍(關 4) | 中:金環角、金邊胸甲、金爪套 | 火焰與餘燼 |
| 惡鬼(關 5) | 多:金鉚肩甲、金環角、金箍狼牙棒 | 破爛的深紅獸皮披肩 |
| **魔王(關 6)** | **全套:頭到腳的華麗甲冑 + 冠冕** | **全長披風** |

魔王的定位是**華麗精緻**,惡鬼是**粗暴野蠻** —— 同樣霸氣但質感不同,
所以惡鬼再兇也不會搶魔王的位置。

## ⚠️ 兩條給去背腳本的新規則(prompt 裡已含,不要拿掉)

- **特效要畫成硬邊的 cel shading,不可以是半透明柔光暈**。半透明光暈在生成時就被合成
  到洋紅底上,存成不透明的粉紫像素,去背救不回 alpha(勇者魔法書踩過)。
- **金色要維持暖黃(hue≈45),絕對不能偏粉或偏洋紅**,否則會被去背當成背景挖掉。

## 流程

每隻**開新對話**,上傳**該怪物自己現在這張圖**(`Downloads\enemyN.png`)當參考圖,
整段貼下面。不要上傳魔王當參考圖 —— 會直接回你一張魔王(勇者踩過同樣的坑)。
魔王的風格已經用文字寫在 prompt 裡了。

存回 `C:\Users\nini9\Downloads\enemy3.png` / `enemy4.png` / `enemy5.png`(直接覆蓋),
然後重跑 `.claude\math-rpg-keyer.ps1`。

---

## enemy3.png — 蝙蝠精緻化

```
Keep this EXACT character — the same purple bat with the big ears, the cream chest
fluff and the same face. Same art style, same bold black outline weight, same flat
cel shading, same mobile-game finish. It must stay recognisably the same creature.
Only its gear, pose, palette and intensity change.

Give it the look of an elite boss monster in a fantasy game — ornate, dark and
dramatic:
- ORNATE GEAR with GOLD trim. Add a gold-trimmed dark metal gorget around its neck
  with one small crimson gem set in the centre, and a gold cuff ring on each ear.
  Keep the gear light — it is a mid-tier monster, not the final boss, so do not
  armour the whole body.
- POSE: a dynamic diving attack, caught mid-motion — both wings swept forward and
  down, claws spread and reaching, mouth open in a screech showing long bone-white
  fangs. Not a neutral standing pose.
- PALETTE: deepen it to a dark violet body with near-black wing membranes, strong
  dark-to-light contrast, bone-white claws and fangs, and warm gold on the gear.
  Three colours only — dark violet, near-black, gold.
- EYES: narrowed, sharp and focused, glowing faintly. Not round and cute.
- EFFECT: thin trailing wisps of dark shadow streaming behind it.

The character faces LEFT, screeching at an opponent standing off-frame to the left.

IMPORTANT rendering rules:
- Draw every effect — the shadow wisps, the eye glow — as HARD-EDGED cel-shaded
  shapes with clean black outlines. Do NOT use soft transparent glows, blur, haze
  or airbrushed gradients anywhere.
- The gold must be a warm yellow-gold. It must never look pink, magenta or violet.

Keep the SAME overall size and SAME height as the reference image, with its lowest
point still touching the very bottom edge. Do not zoom in or crop closer.
Full body, single character, centered. Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the wings and the shadow wisps INSIDE the frame — they must not
touch or stretch to the canvas edges. No text, no watermark, no border.
```

---

## enemy4.png — 小巨龍精緻化

```
Keep this EXACT character — the same young orange-red dragon with the cream belly
scales, the small wings and the same face. Same art style, same bold black outline
weight, same flat cel shading, same mobile-game finish. It must stay recognisably
the same creature. Only its gear, pose, palette and intensity change.

Give it the look of an elite boss monster in a fantasy game — ornate, fierce and
dramatic:
- ORNATE GEAR with GOLD trim. Add gold bands wrapped around the base of both horns,
  a gold-edged dark crimson chest plate strapped over the breast scales, gold caps
  on its front claws, and a gold-buckled dark leather harness across the shoulders.
  A solid amount of gear, clearly more than a lesser monster would wear — but leave
  the legs and tail bare, it is not the final boss.
- POSE: a dynamic roaring attack, caught mid-motion — wings spread wide and raised
  high, neck arched back, front claws raised and spread, tail lashing behind it,
  weight shifted onto one leg. Not a neutral standing pose.
- PALETTE: deepen it to a rich dark red-orange with much darker shading in the
  crevices between scales, bone-white horn tips and claws, and warm gold on the
  gear. Strong dark-to-light contrast.
- EYES: narrowed, furious and focused, with a strong molten-gold glow. Not round
  and cute.
- EFFECT: a SHORT, compact burst of orange flame bursting from between its teeth.
  It must stay close to the muzzle and be no longer than the dragon's own head.
  A few small embers may float near the body. Nothing else.

FACING: the dragon faces the VIEWER in a three-quarter front view — chest, head and
raised claws turned toward the camera, roaring straight out of the frame. Do NOT
draw it in profile or from the side.

CRITICAL — FRAMING (this is the most important rule in this prompt):
- The DRAGON'S BODY must be the tallest and widest thing in the picture. The flame
  and the embers must NEVER be taller, wider, or further out than the dragon itself.
- Do NOT draw a long jet or stream of fire. Do NOT let fire run off the edge of the
  picture. Do NOT draw large flames in the empty background beside the dragon.
- Every flame and ember must be visibly ATTACHED to the dragon or to the burst at
  its mouth. No detached, free-floating flames anywhere in the background.
- Leave a clear empty magenta margin around everything — no part of the dragon, its
  wings, its tail, the flame or the embers may touch or come near any edge of the
  picture.

IMPORTANT rendering rules:
- Draw every effect — the flame, the embers, the eye glow — as HARD-EDGED cel-shaded
  shapes with clean black outlines and flat colour bands. Do NOT use soft transparent
  glows, blur, haze or airbrushed gradients anywhere.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

Keep the SAME overall size and SAME standing height as the reference image, feet
still touching the very bottom edge. Do not zoom in or crop closer.
Full body, single character, centered. Same square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. Keep the wings, tail and flame INSIDE the frame — they must not touch
or stretch to the canvas edges. No text, no watermark, no border.
```

---

## enemy5.png — 黑騎士(取代惡鬼,2026-08-24)

> **惡鬼整隻廢棄了。** 骰了兩輪都醜,原因見下面「惡鬼 v1 為什麼醜」。
> 第五關改成全新角色**黑騎士**,理由有三:
> 1. **頭盔遮臉,直接繞過表情地雷** —— 惡鬼兩輪都是敗在嘴巴和表情上,
>    黑騎士只留頭盔縫裡的發光眼,沒有表情可以畫壞,而且更中二。
> 2. **冷色調** —— 現有六隻全是暖色(綠／淡紫／紫／橘紅／緋紅金),
>    插一隻冷鋼藍進去,關卡節奏更好,緊接著出場的魔王暖緋紅也更有衝擊力。
> 3. **大劍拄地的紋章式站姿天生對稱又垂直**,佔位問題自動解決。
>
> ⚠️ **盔甲不可以是純黑**:第五關背景 `stage5.webp` 是火山,地面是**近黑玄武岩**
> (當初為了跟紅色惡鬼拉開對比才特地壓暗的)。純黑盔甲站上去,膝蓋以下的剪影會消失。
> 所以指定**深鋼藍灰**+冷藍發光,黑騎士的「黑」由造型負責,不是由色值負責。
>
> **開新對話,上傳新版的 `enemy4.png`(定稿的小巨龍)當風格參考圖** ——
> 它是目前最新的房規基準。第一句是否定句,擋掉「回你一張龍」。
> 若還是回你一張龍,改用檔案開頭的「文字風格錨」、不上傳任何圖。

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading and its colour treatment, but do NOT copy,
redraw, edit or include the dragon from it. The dragon must not appear anywhere in
the output. The output must contain only the single new character described below.

2D game character asset for a children's educational math RPG: a BLACK KNIGHT, the
silent armoured champion guarding the approach to the demon king's castle.
Art style: cute-but-cool chibi fantasy, bold clean black outlines of even thickness,
flat cel shading with one soft shadow tone per colour, a rim light from the upper
left, vibrant saturated colours, mobile game asset quality.

He must look COOL, COLD and IMPOSING — a disciplined warrior, never comical.

POSE — a heraldic, poster-like stance, symmetrical and still:
- Standing TALL and UPRIGHT, facing the VIEWER straight on, feet planted wide apart.
  Confident and motionless — NOT crouching, NOT hunched, NOT twisting, NOT lunging,
  NOT mid-swing.
- A huge two-handed GREATSWORD driven POINT-DOWN into the ground directly in front
  of him, blade vertical and centred, both gauntlets resting on the pommel at chest
  height. He stands tall behind it.
- CHIN UP, helmet tilted slightly down so he looks down at the viewer.
- Heroic proportions — long legs, tall torso, a head that is NOT oversized. He must
  read as a tall powerful knight, not as a squat chibi.

HEAD — no face is ever visible:
- A full great helm with a narrow horizontal visor slit. NO face, NO skin, NO mouth,
  NO eyes of flesh — only darkness inside the helm.
- Two sharp points of COLD BLUE light glowing out of the visor slit as his eyes.
- A pair of swept-back horns on the helm, and a small crest.

SILHOUETTE — clean, open and roughly symmetrical:
- A tattered cape spreading WIDE and EVENLY to BOTH sides behind him, like a pair of
  wings or a banner. It must be ONE single connected piece, never broken into
  separate floating scraps.
- Nothing crosses diagonally over his body. Every shape stays clearly separated.

PALETTE — this matters, read it carefully:
- His armour is DARK STEEL BLUE-GREY. It must NOT be pure black — he will stand on
  near-black volcanic rock and a pure-black figure would vanish into the ground.
  Keep the armour clearly lighter than true black, with bright steel highlights
  along every edge so the plates read distinctly.
- The cape is a DEEP MIDNIGHT INDIGO, clearly darker than the armour so the two
  never blend into one shape.
- Modest WARM GOLD trim on the helm, the pauldrons and the sword's crossguard —
  restrained, far less ornate than a demon king would wear.
- Cold blue glow for the eyes and the sword. Strong dark-to-light contrast.

GEAR — heavy, austere, battle-worn plate armour, dented and scratched from use:
layered pauldrons, a breastplate, gauntlets, greaves, a chain skirt. Functional and
grim, NOT the polished gold filigree of a demon king.

EFFECT: cold blue flame licking along the blade of the greatsword, with a few blue
sparks rising close beside it. Size the whole effect roughly as large as his helmet.

IMPORTANT rendering rules:
- Draw every effect — the blue flame, the sparks, the eye glow — as HARD-EDGED
  cel-shaded shapes with flat colour bands and a CRISP, SHARP boundary. Do NOT use
  soft transparent glows, blur, haze or airbrushed gradients anywhere, and do NOT
  add a glow halo around anything.
- Do NOT outline the glowing effects in BLACK. Outline the blue flame and sparks in
  a deep blue — a darker shade of the effect's own colour — so they read as glowing
  light rather than as solid outlined objects. His ARMOUR keeps its bold black
  outlines.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- The KNIGHT'S BODY must be the tallest thing in the picture. The sword, the cape,
  the flame and the sparks must NEVER reach higher or wider than he does.
- Do NOT let anything run off the edge of the picture, and do NOT draw sparks or
  flame floating in the empty background away from him.
- Every spark must be visibly ATTACHED to him or to the blade. No detached,
  free-floating effects anywhere in the background.
- Leave a clear empty magenta margin on all four sides — no part of the knight, the
  sword, the cape or the effects may touch or come near any edge of the picture.

Full body, single character, centered, his feet and the sword's tip touching the
very bottom edge. Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

### 黑騎士在階梯上的位置

比小巨龍強:**全身重甲**(龍只有胸甲)、**有披風**(龍沒有)、**有武器**(龍沒有)。
比魔王弱:魔王是**華麗**(全套金雕花、冠冕、法術),黑騎士是**肅殺**(暗鋼、極少金)。
兩者壓迫感相當但質感不同,魔王仍然是最華麗的那一隻。

### 收圖結果(2026-08-24):一次過,已進遊戲

`ENEMY_LOOKS[4]` 已改成 `{ emoji: "⚔️", name: "黑騎士", ... }`,
`idle: "heavy"` 保留(重甲角色本來就該是緩慢的重量感)。

**縮放從 0.90 降到 0.85**(`math-rpg-keyer.ps1` 的 `$jobs`)。原因:黑騎士是**直立人形**,
外框幾乎全是身體;小巨龍 0.82 的外框卻有一大截是張開的翅膀。
**同樣的數字,人形看起來會大很多**,所以人形角色的 s 值要比獸形低一階才會視覺等重。
實測 outH:小巨龍 420 < 黑騎士 435 < 勇者 486 < 魔王 506。

**近黑地面的疑慮已驗證解除**:把去背後的騎士合成到 `stage5.webp` 上實測,
深鋼藍灰盔甲在近黑玄武岩前**剪影守得住**,劍上的冷藍火焰又特別跳。
若當初真的畫成純黑,膝蓋以下就會消失 —— 那個判斷是對的。

### ⚠️ 朝向:第四次失敗,正式停止嘗試

黑騎士也試了轉向左邊(明確列出頭盔、肩、胸、腰、雙腳全部要轉),**結果幾乎沒有變化**,
身體、披風、雙腳、劍全部仍然完全對稱正面。加上第三批、第四批魔王、第六批蝙蝠,
**這是第四次失敗**。

**決定:不要再為了朝向重骰任何角色。** 而且黑騎士正面反而是對的 ——
這個姿勢的力量來源就是對稱(大劍居中拄地、雙手扶柄、披風左右均分),
轉成四分之三會把結構打散,很可能重演惡鬼越改越糟的下場。
對峙感由「勇者在左、怪在右」的位置關係和衝刺攻擊動畫負責,不靠角色轉向。

---

## ⚠️ 朝向規則已廢除(2026-08-24,蝙蝠收圖後決定)

**不要再要求「側身朝左」了,這場仗打了三批都沒贏。** 第三批寫「列出所有身體部位」沒用、
第四批魔王改用「大步走過去」的動作暗示也沒用、第六批蝙蝠再試一次仍然是正面。

去比對全套之後發現:**六隻裡只有小巨龍是側身的**,魔王、幽靈、蝙蝠都是正面,
史萊姆是球體沒有正面可言。所以**正面才是這套的實際房規**,該對齊的是小巨龍,不是其他隻。

第六批的小巨龍與惡鬼 prompt 已改成明確要求 **three-quarter front view**(正面四分之三),
比要求側身容易命中得多。勇者在左、怪在右的對峙感改由**姿勢的動勢**負責,不靠身體轉向。

## 蝙蝠收圖結果(2026-08-24):通過,但兇度超標

金耳環、金邊頸甲配紅寶石、發光黃眼、硬邊暗影絲全部到位,裝備策略證明有效。

但**發光眼＋大量暗影特效原本規劃在中段,蝙蝠一次全給滿**,導致階梯上半段被壓縮。
小巨龍與惡鬼的 prompt 已據此加碼(龍加肩帶＋熔金發光眼＋更大火焰;惡鬼加血紅發光眼＋
暗黑能量碎片),**若日後重產這批,記得後面的怪一定要壓過蝙蝠**,否則關卡難度的視覺敘事會斷。

## ⚠️ 特效佔位會害角色被縮小(2026-08-24,小巨龍第一版踩到)

**這是魔王披風那個坑的第二次發作,而且更嚴重。**

`math-rpg-keyer.ps1` 的 pass 3 抓的是**整張圖所有不透明像素的外框**,pass 4 再用
`k = targetH / ch`(ch = 外框高度)縮放。**火焰、能量、披風全部都算進外框**,
所以特效畫得越誇張,角色本體就被縮得越小。

小巨龍第一版實測:火焰從畫布頂端燒到底,外框高 ≈910px,但龍身只佔約 700px
→ 龍身實際只會縮到 **0.63**,而蝙蝠是 **0.72**。**第四關的龍會比第三關的蝙蝠還小**,
關卡難度的視覺敘事直接倒過來。

**所以每一段 prompt 都必須有 CRITICAL — FRAMING 那一段**,三條缺一不可:
1. **角色本體必須是全圖最高最寬的東西**,特效不可以超過它
2. **不可以有脫離身體的浮空特效** —— 去背後會變成飄在旁邊的孤島雜訊
3. **四周要留空白邊** —— 碰到畫布邊緣的特效會被切成平整的切口,看起來像破圖

寫「Keep the flame INSIDE the frame」這種軟性說法**沒有用**(第六批第一版就是這樣寫的,
照樣燒出畫布)。要明講「本體必須是最高的」「不准有浮空的」「四周留白邊」才擋得住。

## 小巨龍收圖過程學到的三件事(2026-08-24,共骰四輪才定稿)

四輪分別是:①有裝備但火焰爆框 → ②火焰整個消失 → ③火焰回來但有黑邊 → ④定稿。
每一輪的教訓都可以直接套到後面的怪身上。

### ① 尺寸限制要用「正面參照」,不能用「否定上限」

第二輪寫 `no longer than the dragon's own head`(不超過龍頭那麼長),
**Gemini 直接理解成「那就不要畫」**,火焰整個消失,只留一縷灰煙。

第三輪改成 `roughly as long as the dragon's own head`(大約跟龍頭一樣長)就一次命中。

**規則:給特效大小時一律寫「大約跟某個身體部位一樣大」,不要寫「不超過某某」。**
「不超過」只能放在 CRITICAL — FRAMING 那段講整體佔位,不要拿來描述特效本身。

### ② 發光特效不要用黑描邊,要用「同色系深色描邊」

第三輪的火焰有黑描邊,看起來像貼上去的貼紙、不像在發光。

但**完全不要描邊也不行** —— 黑描邊其實是特效邊緣在洋紅底上的保護層。沒有描邊的話,
橘色會直接跟洋紅抗鋸齒,產生一圈橘紅↔洋紅的混色像素;這些像素**飽和度很高**,
躲得過腳本針對「低飽和粉紫霧」那道處理(hue 280-340 / sat < 0.22),
會在火焰周圍留一圈**粉紅描邊**——等於把黑邊換成粉邊。

**解法:描邊換成該特效自己顏色的深色版**(火焰用深紅橘、暗黑能量用深紫)。
視覺上是在發光,邊緣仍然乾淨,去背安全。**角色本體的黑描邊要保留,只有特效改。**

### ③ 用「續問」不要「重產」

四輪全部在**同一個對話**裡續問,每次都寫 `keep everything exactly as it is` +
只列要改的那一兩件事 + `Everything else stays untouched`。
金環角、金邊胸甲、熔金眼、皮革肩帶**從第一輪一路保留到第四輪都沒跑掉**。

如果每輪都開新對話重傳參考圖,等於每次都在重骰裝備,好不容易對的東西會被洗掉。
**開新對話只用在第一次生成,之後一律續問,而且一次只改一件事。**

## ⚠️ 惡鬼 v1 為什麼醜:「帥」來自姿勢類型,不是來自兇度(2026-08-24)

蝙蝠與小巨龍一次就帥,惡鬼 v1 骰了兩輪都醜。差別**不在兇不兇,在姿勢的類型**。

| | 蝙蝠 / 小巨龍(成功) | 惡鬼 v1(失敗) |
|---|---|---|
| 姿勢 | 正面直立、雙翼左右展開、抬頭 | 扭身、彎腰、蹲低 |
| 剪影 | 對稱、開展,像紋章／海報 | 破碎、不對稱,塊體互相打架 |
| 頭部 | 有脖子,頭部剪影清楚 | 頭埋進肩膀,沒有脖子 |
| 頭髮 | — | 暗紅棕大團,**跟同色的披風糊成一片**,剪影消失 |
| 嘴 | 咆哮但下顎線條乾淨 | 張大嘴露牙齦,讀起來滑稽不是壓迫 |
| 比例 | 修長 | 大頭短腿,像小妖精不像武將 |

**結論:動態架勢 ≠ 帥。** 前五批一直在追「dynamic action stance, caught mid-motion」,
但真正讓蝙蝠和龍成立的是**紋章式站姿** —— 正面、直立、左右展開、抬頭俯視。
Gemini 畫扭轉透視的能力明顯不如畫正面對稱構圖,越要求動感越容易崩。

**可移植的四條**(v2 已全部寫進 prompt):
1. **正面直立、雙腳站定、抬頭俯視觀眾**,不要 mid-swing / lunging / twisting
2. **給角色一個「翅膀」** —— 沒有翅膀的角色就用披風／布料**往兩側對稱展開**代替
3. **明講「要有脖子」「頭不要過大」「腿要長」** —— 不寫的話 chibi 慣性會把它壓成矮胖
4. **相鄰的大塊面要用明度分開** —— 惡鬼的近黑頭髮 vs 暗紅披風。同色系相鄰=剪影消失

另外**表情要「收」不要「放」**:閉嘴冷笑露獠牙 > 張大嘴吼叫。
張嘴在龍身上成立是因為有明確的下顎線,人形角色張大嘴會直接變搞笑。

## 第六批收圖檢查

- [ ] 三隻身上都看得到**金色裝備**嗎?(沒有的話這批就白做了,重產)
- [ ] 三隻都是**動態架勢**嗎?(朝向不用管,正面就是對的)
- [ ] 兇度有沒有**一隻比一隻高**?蝙蝠 < 小巨龍 < 惡鬼 < 魔王
- [ ] **角色本體是不是全圖最高的東西**?特效有沒有超過它?(超過就會被縮小,見上)
- [ ] 有沒有**脫離身體的浮空特效**?
- [ ] 四周有沒有**留白邊**?有東西碰到畫布邊緣嗎?
- [ ] 特效**有沒有被畫掉**?(寫「不超過某某」就會發生,見上)
- [ ] 發光特效是**同色系深色描邊**、不是黑描邊嗎?角色本體的黑描邊有保留嗎?
- [ ] 特效是**硬邊**的嗎?有柔光暈的話去背會留粉紫殘影
- [ ] 金色是暖黃不是粉的嗎?
- [ ] 擺在魔王旁邊看,**魔王還是最華麗的那一隻**嗎?(惡鬼最容易超車)
- [ ] 腳底/最低點有碰到畫布底邊嗎?
- [ ] 洋紅底乾淨、沒有地面橢圓陰影嗎?
