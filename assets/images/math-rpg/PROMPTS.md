# 數學勇者 — 角色美術產圖手冊

用 Gemini 產圖 → `.claude\math-rpg-keyer.ps1` 去背縮放 → ffmpeg 轉 WebP → 進遊戲。

> 這份檔案在 2026-08-25 大幅精簡過。第一～十批的失敗版本、被廢棄的角色
> （史萊姆／幽靈／蝙蝠／小巨龍／惡鬼／骷髏魔王）以及攻擊姿勢草稿都刪掉了，
> **完整的過程紀錄在 git 歷史裡**（精簡前的最後一版）。
> 留下來的是：現行六隻的定稿 prompt，以及所有踩過坑換來的硬規則。

---

## 現行陣容

| 關 | 角色 | emoji | 背景 | 縮放 s | outH | idle | 主色 |
|---|---|---|---|---|---|---|---|
| 1 | 暗影小獸 | 🐾 | 明亮草原 | 0.68 | 348 | 呼吸 | 近黑 |
| 2 | 骨翼渡鴉 | 🪶 | 明亮森林 | 0.76 | 389 | float | 近黑＋骨白 |
| 3 | 提燈幽魂 | 🏮 | 青綠洞窟 | 0.83 | 425 | float | 近黑＋暖提燈 |
| 4 | 骨龍 | 🦴 | 灰綠沼澤 | 0.89 | 456 | 呼吸 | 骨白 |
| 5 | 黑騎士 | ⚔️ | 火山 | 0.94 | 481 | heavy | 深鋼藍灰 |
| 6 | 暗黑魔王 | 👑 | 魔王城 | 1.00 | 512 | heavy | 近黑＋金邊＋緋紅 |

勇者 `hero` 縮放 0.95，2026-08-26 改版成**持劍的旅行者**：
`hero.webp` 站姿 ＋ `hero-atk1/2.webp` 兩幀揮劍 ＋ `slash.webp` 獨立劍氣
（見檔案最後的「勇者改版」與「多幀動畫」）。六隻怪目前都還沒有攻擊圖。

### 這套風格的三根支柱

1. **遮住的臉** — 無臉／頭盔／空兜帽／骷髏。**表情是唯一反覆失敗的變數**
   （某一隻怪骰了四輪，分別失敗在媚眼、傻笑、呆萌、太可愛），把臉遮住＝把變數移除。
   改用遮臉之後，每一隻都一到兩輪就過。
2. **冷光點當眼睛** ＋ 破爛布料或重甲 ＋ 低彩度。
3. **金色的量 = 階級** — 小獸一枚鏽環 → 渡鴉腳環 → 幽魂提燈框 → 骨龍鎖鏈 →
   騎士甲邊 → 魔王滿身金雕花。

---

## 流程

1. **Gemini 開新對話**，上傳一張**風格參考圖**（現在用 `Downloads\enemy2.png` 渡鴉
   或 `enemy5.png` 黑騎士），貼下面對應的 prompt。
2. 產出存成 `C:\Users\nini9\Downloads\enemyN.png`（**N = 關卡編號**）。
3. 要修就**在同一個對話裡續問**，一次只改一件事，並在結尾寫
   `Everything else stays untouched.`
4. 跑 `powershell -NoProfile -File "C:\Users\nini9\Work\knowledge-114\.claude\math-rpg-keyer.ps1"`
5. 轉檔：
   `ffmpeg -y -i keyed\enemyN.png -c:v libwebp -lossless 0 -quality 88 -preset drawing -pix_fmt yuva420p enemyN.webp`
   （有損 q88 與無損在 4 倍放大下看不出差異，檔案小 4 倍）
6. 放進 `assets/images/math-rpg/`，必要時改 `assets/js/math-rpg.js` 的 `ENEMY_LOOKS`。

**續問 > 重產。** 每輪都開新對話重傳參考圖＝每次都在重骰造型，好不容易對的東西會被洗掉。
開新對話只用在第一次生成。

---

# 硬規則：寫 prompt

以下每一條都是實際踩過才寫下來的，不要拿掉。

## 1. 朝向：用「幾何描述」，不要用「轉身動詞」

**失敗五次的寫法**：`turn the whole body to face left`、
`three-quarter view turned toward the LEFT`、`striding toward the LEFT, mid-step`、
逐一列出「頭、肩、胸、腰、腳都要轉」——**Gemini 一律只轉頭和眼珠就交差**。

**成功的寫法：一個「轉」字都不提，只描述轉過去之後畫面上該長什麼樣。**

```
Right now the picture is perfectly symmetrical: both pauldrons are the same size,
the chest emblem points straight at us, and both boots point at the viewer. That
must change. ...
- His LEFT pauldron is CLOSER to us. Draw it noticeably LARGER, and let it overlap
  and partly cover the left edge of his breastplate.
- His RIGHT pauldron is FURTHER AWAY. Draw it noticeably SMALLER and let his torso
  partly hide it.
- The vertical centre line of his breastplate and belt is NOT down the middle of his
  silhouette any more — it sits clearly to the LEFT of centre.
- BOTH BOOTS point toward the LEFT edge, one foot ahead of the other, not side by
  side. We see the sides of his boots, not the fronts.
- One horn is nearer and drawn larger; the far horn is partly hidden behind the helm.
- The bulk of the cape falls behind him on the RIGHT side of the picture.
```

四個要素：①先明講「現在是對稱的」當成要修的問題 ②近的畫大、遠的畫小
③明講誰**擋住**誰 ④**腳尖朝向**和**中線偏移**（這兩個最有效，人腦靠它們判讀角度）。

**左右可能會反，但不用重骰** —— 用 keyer 的 `flip=$true` 水平翻轉即可（暗黑魔王就是）。
只有在角色打光接近對稱時才適用；有明顯單側鑲光、文字或不對稱紋章的角色不能翻。

## 2. 視線與拖尾方向

- **只轉頭這件事 Gemini 做得很好** —— 所以「頭轉向左邊、眼睛看畫面外的左方」
  一定要寫，而且放在 prompt 最前面自成一段（`GAZE — READ THIS FIRST`）。
- **拖尾方向 = 觀眾讀到的移動方向。** 尾巴往左飄 = 在往右移動 = 看起來像在逃走。
  要讓怪面向左邊的勇者，就寫「所有飄動的東西往**右後方**拖，像從左邊吹來的風」。

## 3. 特效佔位會害角色被縮小

keyer 抓的是**全圖所有不透明像素的外框**，再按外框高度正規化。
**火焰、能量、披風全部算進外框**，特效畫得越誇張，角色本體被縮得越小。

實測：某版小巨龍的火焰從畫布頂端燒到底，外框高 910px 但龍身只佔 700px
→ 龍身只縮到 0.63，**比前一關的怪還小**，難度的視覺敘事直接倒過來。

**所以每段 prompt 都要有 `CRITICAL — FRAMING` 區塊，三條缺一不可**：

```
CRITICAL — FRAMING:
- The X'S BODY must be the tallest thing in the picture. The A, the B and the C must
  NEVER reach higher or further out than he does.
- Nothing may float loose in the empty background, detached from him.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.
```

寫 `Keep the flame INSIDE the frame` 這種軟性說法**沒有用**，照樣燒出畫布。

## 4. 用詞地雷

| ❌ 不要寫 | 為什麼 | ✅ 改寫成 |
|---|---|---|
| `no longer than its own head` | 否定式上限被理解成「那就不要畫」，特效整個消失 | `roughly as long as its own head`（正面參照） |
| `loose` / `trailing off` / `drifting` / `floating` | 這些詞本身就在要求「脫離的東西」，跟 FRAMING 的禁令打架，而**前面的描述會贏** | `still attached at the wingtips, touching the wing` |
| `half-lowered eyelids` / `heavy-lidded` / `sleepy` | 本意是「自信瞇眼」，畫出來是**媚眼** | 銳利＝`narrowed into a hard glare`；頑皮＝`WIDE OPEN and round, with one eyebrow cocked` |
| `wispy tail`（單獨寫） | 畫成又長又柔順的優雅捲曲，**看起來像飄逸長髮** | `SHORT, choppy, torn strands with jagged uneven ends and sharp angular tips` ＋ 明確否定 `no long elegant curls, no hair-like strands` |
| 閉嘴的小微笑 | 讀起來是嬌羞 | `OPEN, wide, lopsided CHEEKY GRIN` |

## 5. 特效的畫法：硬邊 ＋ 同色系深色描邊

```
IMPORTANT rendering rules:
- Draw every effect as HARD-EDGED cel-shaded shapes with flat colour bands and a
  CRISP, SHARP boundary. Do NOT use soft transparent glows, blur, haze or airbrushed
  gradients anywhere, and do NOT add a glow halo around anything. A semi-transparent
  glow cannot survive the background removal step and comes out as opaque pink.
- Do NOT outline the glowing effects in BLACK. Outline them in a deep <same hue> — a
  darker shade of the effect's own colour — so they read as glowing light rather than
  as solid outlined objects. The BODY keeps its bold black outline.
- Do NOT add four-pointed star sparkles or any sticker-style decoration.
- The gold must be a warm yellow-gold. It must never look pink or magenta.
```

三條的理由：
- **半透明柔光在生成時就被合成到洋紅底上**，存成不透明的粉紫像素，去背救不回 alpha。
- **黑描邊讓發光物看起來像貼紙**；但完全不描邊會讓高飽和的橘/藍直接跟洋紅抗鋸齒，
  在邊緣留一圈**粉紅描邊**（飽和度太高，躲得過腳本的低飽和霧處理）。同色系深色是唯一解。
- 四角星閃亮是**貼紙的語言**，不是遊戲素材的語言。

## 6. 配色由背景反推

角色融進背景踩過兩次，規則是：

| 背景明度 | 角色配色 | 例子 |
|---|---|---|
| **亮**（草原、森林） | **近黑**，對比最強 | 暗影小獸、骨翼渡鴉 |
| **中明度**（洞窟、沼澤） | **骨白提亮**，純黑會悶進去 | 骨龍、渡鴉的翼骨 |
| **暗**（火山、魔王城） | **暖色 ＋ 亮邊**，靠色相不靠明度 | 黑騎士的鋼藍高光、魔王的金邊緋紅 |

而且要**在 prompt 裡把理由直接寫給 Gemini 聽**，這招很有效：

```
It must NOT be green and must NOT be brown — he will stand in a bright light-green
forest with brown tree trunks, and either colour would make him vanish into the
background.
```

## 7. 「精緻」= 輪廓乾淨 ＋ 內部細節多

不是「東西多」。某一版惡鬼加了巨大肩甲、長棒、碎裂披風、滿天火星，結果剪影破碎、
塊體互相打架，反而變醜。魔王的輪廓其實很單純（一個人 ＋ 一件披風），
華麗感全部來自**輪廓內部**的金線、甲片分層、寶石。

同理，身體不能是一整片沒有資訊的色塊。每段 prompt 都要有 `DETAIL AND GRIT` 區塊：
**至少三階明暗**、摺線／磨損／裂痕、上左打光的鑲邊光。

**相鄰的大塊面要用明度分開** —— 某一版惡鬼的暗紅頭髮貼著暗紅披風，頭部剪影整個消失。

## 8. 「帥」來自姿勢類型，不是兇度

正面直立、左右展開、抬頭俯視的**紋章式站姿**，比「動態架勢」可靠得多。
Gemini 畫扭轉透視的能力明顯不如畫正面對稱構圖，越要求動感越容易崩。

沒有翅膀的角色就用**披風／布料往兩側對稱展開**當作它的翅膀。
另外要明講「**要有可見的脖子**」「**頭不要過大**」「**腿要長**」，
不寫的話 chibi 慣性會把角色壓成矮胖的小妖精。

---

# 硬規則：去背腳本

`.claude\math-rpg-keyer.ps1`。原始圖放 `C:\Users\nini9\Downloads\`，輸出到 scratchpad。

## 實測到的關鍵數字

- **Gemini 給的洋紅底不是 `#FF00FF`**，實測是 `#FC1AF7` / `#FB25F3` 這類，
  綠通道有 20~37 殘值，每張每角落都不同 → 不能用相等比對，要用**色相區間**
  （背景實測 hue≈301、sat≈0.90）。
- 去背分兩段：①從畫布邊緣 flood fill（寬鬆門檻 hue 286-340 / sat≥0.30）清主背景；
  ②嚴格門檻（hue 288-330 / sat≥0.75）補清**封閉孔洞** —— 手臂與身體之間那種
  被抗鋸齒堵住、flood fill 流不進去的縫隙。
- **`mp`（連通面積下限）要看角色配色調**：
  - 角色身上**有**洋紅系（紫/粉）自有顏色 → 維持 **150**，否則會在紫髮上戳出洞
  - 角色身上**沒有**（骨白＋暗灰的骨龍）→ 可以低到 **3**。骨龍的肋骨縫是細長窄縫、
    翼膜破洞是小圓點，用 150 的話整隻有 **4.8% 是亮洋紅**。
- **殘留量要看 alpha 分布，不能只看總數**：骨龍清完仍測到 4.29% 洋紅，
  但其中 2741/3947 是**半透明**（alpha 40-229）—— 那是每個破洞的抗鋸齒邊環，肉眼看不到。
  真正不透明的只有 1206px（1.3%），散成零星小點。
- **紫色角色最容易被去背誤傷**：邊緣去溢色若只看「R 和 B 都比 G 高」，
  **任何紫色都符合**，髮絲會被拉成灰色。要**同時檢查色相**（溢色在 300 附近、
  角色紫色在 250-285，以 288 分界）。
- **半透明光暈會變粉紫**：解法是**去溢色不是刪除**——刪掉會在光暈上打洞。
  實測分界：粉紫髒污 hue 280-340 / **sat 0.06-0.19**；同色相的紫頭髮 sat 0.27+。
  取 sat < 0.22 當上限，再**限制在背景外擴 20px 的帶狀範圍內**。

## 診斷訣竅

**把去背後的圖疊在紅色底、再疊在灰色底上比對。**
- 斑點在紅底變紅 = **被打成透明**（挖穿了）
- 斑點在兩種底色上都還是粉 = **顏色沒清乾淨**（殘留背景）

兩者成因完全不同，只疊在白底上看不出差別。

## 體型階梯

由 `$jobs` 的 `s` 控制，**不是原圖大小**。2026-08-25 從 0.50→1.00 壓縮成
**0.68→1.00** —— 舊的 2 倍落差讓最弱的怪只有魔王一半大，畫面上小到看不清細節。

**人形角色的 s 要比獸形低一階才會視覺等重** —— 人形的外框幾乎全是身體，
獸形的外框有一大截是展開的翅膀。

---

# 收圖檢查清單

- [ ] 頭有沒有轉向左邊？眼睛有沒有看畫面外的左方？（不可以看鏡頭）
- [ ] 飄動的東西有沒有全部往**右後方**拖？
- [ ] 有沒有畫出**臉／表情**？（遮臉角色一律不該有）
- [ ] **角色本體是不是全圖最高的東西**？特效有沒有超過它？
- [ ] 有沒有**脫離身體的浮空特效**？四周有沒有留白邊？
- [ ] 特效**有沒有被畫掉**？（寫「不超過某某」就會發生）
- [ ] 特效是硬邊、**同色系深色描邊**、沒有四角星閃亮嗎？
- [ ] 每隻有沒有**三階以上明暗**？相鄰大塊面有沒有用明度分開？
- [ ] 有沒有出現**該關背景的顏色**？
- [ ] 金色量有沒有守住階梯？（1 < 2 < 3 < 4 < 5 < 6）
- [ ] 描邊粗細跟其他隻一致嗎？（最容易走鐘的地方）
- [ ] 最低點有碰到畫布底邊嗎？洋紅底乾淨、沒有地面橢圓陰影嗎？
- [ ] 收圖後跑一張**全隊對照圖**，確認體型與兇度階梯都還是由弱到強

---

# 六隻的定稿 prompt

每段都**開新對話**，上傳 `Downloads\enemy2.png`（渡鴉）或 `enemy5.png`（黑騎士）
當風格參考圖。

## enemy1.png — 暗影小獸（第 1 關）

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading, its level of interior DETAIL and its gritty
game-asset finish, but do NOT copy, redraw, edit or include the hooded wraith from
it. The wraith must not appear anywhere in the output. The output must contain only
the single new character described below.

2D game character asset for a children's educational math RPG: a SHADOW CRAWLER —
a small four-legged creature made of living shadow, the very first and WEAKEST
monster the player meets. It should feel EERIE and creepy, but it is small, scrappy
and clearly no real threat.

GAZE — READ THIS FIRST:
Its head is turned toward the LEFT edge of the picture, and its glowing eyes stare
off-frame to the LEFT at something the viewer cannot see. It is NOT looking at the
viewer and NOT facing the camera. Turn the whole head, not just the eyes.

MOVEMENT AND DIRECTION:
It is prowling toward the LEFT, body low and creeping. Because it moves left, every
wisp of shadow smoke coming off its back and tail must sweep BACKWARD toward the
RIGHT edge, as if a wind were blowing from the left.

THE CHARACTER:
- A small, low, four-legged beast the size of a cat, made of solid living shadow.
  Rounded compact body, short stubby legs, small paws with tiny pale claws.
- NO visible face, NO mouth, NO nose — its head is a smooth featureless dark shape
  with only TWO small points of pale cold light where eyes would be.
- Its edges do not end cleanly: its back, tail and haunches fray away into curling
  wisps of shadow smoke.
- ONE piece of gold: a single tarnished, dented gold ring stuck around its tail or
  one front leg — obviously scavenged junk it picked up, not gear it owns. This is
  the weakest monster, so it must wear the LEAST gold of any monster in the game.

DETAIL AND GRIT — it must NOT be one flat empty black blob:
- Use at least THREE distinct tones — a near-black core, a mid charcoal, and a
  lighter cool grey where the light catches — banded as hard cel shading so its
  volume and its haunches read clearly.
- A crisp rim light along its back, lit from the upper left.
- Draw a few sharp angular shadow spikes along its spine for texture.

PALETTE — this matters, read it carefully:
- NEAR-BLACK with a cold dark indigo tint, plus charcoal and cool grey shading.
- PALE COLD WHITE for the eyes and the tiny claws.
- TARNISHED WARM GOLD on the single ring only.
- It must NOT be green and must NOT be blue — it will prowl on bright green grass
  under a light blue sky, and either colour would make it vanish into the background.
  Strong dark-to-light contrast is what makes it read.

EFFECT: a few small wisps of shadow smoke curling off its back and tail. Size the
whole effect no bigger than its own head.

IMPORTANT rendering rules:
- Draw every effect — the shadow wisps, the eye lights — as HARD-EDGED cel-shaded
  shapes with flat colour bands and a CRISP, SHARP boundary. Do NOT use soft
  transparent glows, blur, haze or airbrushed gradients anywhere, and do NOT add a
  glow halo around anything. A semi-transparent glow cannot survive the background
  removal step and comes out as opaque pink.
- Do NOT outline the wisps or the eye lights in BLACK. Outline them in a cool dark
  grey — a darker shade of their own colour. The BODY keeps its bold black outline.
- Do NOT add four-pointed star sparkles or any sticker-style decoration.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- The CREATURE'S BODY must be the largest thing in the picture. The wisps must never
  be bigger or reach further out than the body.
- Nothing may float loose in the empty background, detached from it.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.

Full body, single character, centered, its paws touching the very bottom edge.
Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

---

## enemy2.png — 骨翼渡鴉（第 2 關）

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading, its level of interior DETAIL and its gritty
game-asset finish, but do NOT copy, redraw, edit or include the hooded wraith from
it. The wraith must not appear anywhere in the output. The output must contain only
the single new character described below.

2D game character asset for a children's educational math RPG: a BONE-WINGED RAVEN —
an undead carrion bird haunting a crystal cavern. It should feel EERIE and sinister.
It is a mid-low tier monster: no armour, but clearly nastier than the small creatures
before it.

GAZE — READ THIS FIRST:
Its head is turned toward the LEFT edge of the picture, its beak and its glowing eye
pointed off-frame to the LEFT at something the viewer cannot see. It is NOT looking
at the viewer and NOT facing the camera. Turn the whole head, not just the eye.

MOVEMENT AND DIRECTION:
It is lunging toward the LEFT with wings spread. Because it moves left, its tail
feathers and every loose feather and wisp must sweep BACKWARD toward the RIGHT edge,
as if a wind were blowing from the left.

THE CHARACTER:
- A large ragged raven with a heavy hooked beak, perched forward and hunched, wings
  SPREAD WIDE to both sides.
- Its wings are half rotted away: near-black feathers along the top, but the outer
  wing is bare BONE-WHITE skeletal struts with only tattered scraps of membrane
  hanging between them.
- NO fleshy face — its eye sockets are dark hollows with a single point of PALE COLD
  LIGHT burning in each.
- Bone-white skeletal talons.
- ONE piece of gold: a tarnished, dented gold band clamped around one leg, like a
  stolen leg-ring. Keep it small — it must wear less gold than the armoured monsters
  later in the game.

DETAIL AND GRIT — it must NOT be one flat black shape:
- Use at least THREE distinct tones on the feathers — a near-black core, a mid
  charcoal, and a lighter cool grey where the light catches — banded as hard cel
  shading so the individual feather groups read clearly.
- Draw ragged, broken feather edges, gaps where feathers are missing, and visible
  bone joints in the exposed wing struts.
- A crisp rim light down one side, lit from the upper left.

PALETTE — this matters, read it carefully:
- NEAR-BLACK feathers with a cold dark indigo tint, charcoal and cool grey shading.
- BONE-WHITE for the exposed wing struts, the talons and the beak tip. The bone must
  be BRIGHT — it will stand in a mid-toned TEAL-GREEN crystal cavern, and a pure
  all-black bird would sink into it. The bone-white is what makes it pop.
- TARNISHED WARM GOLD on the leg band only.
- It must NOT be teal, green or cyan — those are the cavern's own colours and it
  would vanish into the background.

EFFECT: a few loose black feathers and thin wisps of dark smoke trailing off its
wingtips. Size the whole effect no bigger than its own head.

IMPORTANT rendering rules:
- Draw every effect — the wisps, the eye lights — as HARD-EDGED cel-shaded shapes
  with flat colour bands and a CRISP, SHARP boundary. Do NOT use soft transparent
  glows, blur, haze or airbrushed gradients anywhere, and do NOT add a glow halo
  around anything. A semi-transparent glow cannot survive the background removal step
  and comes out as opaque pink.
- Do NOT outline the wisps or the eye lights in BLACK. Outline them in a cool dark
  grey — a darker shade of their own colour. The BODY keeps its bold black outline.
- Do NOT add four-pointed star sparkles or any sticker-style decoration.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- The RAVEN'S BODY AND WINGS must be the largest thing in the picture. The loose
  feathers and wisps must never reach further out than the wings.
- Nothing may float loose in the empty background, detached from it.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.

Full body, single character, centered, its lowest point touching the very bottom
edge. Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

---

## enemy3.png — 提燈幽魂（第 3 關）

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading, its level of interior DETAIL and its gritty
game-asset finish, but do NOT copy, redraw, edit or include the bat from it. The bat
must not appear anywhere in the output. The output must contain only the single new
character described below.

2D game character asset for a children's educational math RPG: a small LANTERN
WRAITH — an empty hooded cloak drifting through a forest, carrying an old lantern.
It should feel EERIE and UNSETTLING. This is a low-tier monster, so keep it SMALL
and RAGGED with no armour, but it does not need to look friendly or harmless.

GAZE — READ THIS FIRST:
His hood is turned toward the LEFT edge of the picture, and the two points of light
inside the hood stare off-frame to the LEFT at something the viewer cannot see. He
is NOT looking at the viewer and NOT facing the camera. Turn the whole hood, not
just the lights.

MOVEMENT AND DIRECTION:
He is drifting toward the LEFT side of the picture. Because he moves left, EVERY
tattered strand and every trailing rag must sweep BACKWARD toward the RIGHT edge, as
if a wind were blowing from the left. Nothing may trail to the left or hang straight
down.

THE CHARACTER:
- A hooded cloak with NOTHING inside it — no face, no skin, no skull, no jaw. Just
  deep darkness under the hood with TWO small points of pale cold light floating in
  it where eyes would be.
- The cloak is old and shredded: the hem tears into several separate layered strips
  of different lengths, with jagged uneven ends.
- ONE skeletal BONE-WHITE hand emerges from a ragged sleeve, holding an old iron
  LANTERN by its ring. The lantern is dented, rusted and battle-worn, with a
  TARNISHED GOLD frame and a cracked glass pane.
- Inside the lantern burns a small PALE BONE-WHITE ghost flame.
- He has no legs — the cloak simply frays away into trailing wisps below.

DETAIL AND GRIT — his cloak must NOT be one flat empty black shape:
- Use at least THREE distinct tones on the cloak — a near-black core, a mid charcoal
  grey, and a lighter cool grey where the light catches — banded as hard cel shading
  so the folds and volume read clearly.
- Draw visible FOLD LINES and creases running down the cloth, plus frayed threads,
  torn nicks and small holes along every edge.
- A crisp rim light down one side, lit from the upper left.
- Add a heavy iron chain or a knotted cord at the neck of the cloak for extra detail.

PALETTE — this matters, read it carefully:
- The cloak is NEAR-BLACK with a cold DARK INDIGO tint, plus charcoal and cool grey
  shadow bands. It must NOT be green and must NOT be brown — he will stand in a
  bright light-green forest with brown tree trunks, and either colour would make him
  vanish into the background.
- BONE-WHITE for the skeletal hand and the ghost flame.
- TARNISHED WARM GOLD on the lantern frame only. One gold item, nothing more — he is
  a low-tier monster and must not out-dress the stronger monsters.
- Strong dark-to-light contrast throughout.

EFFECT: a few small pale wisps of spirit smoke curling off his shredded hem and off
the lantern flame. Size the whole effect no bigger than the lantern itself.

IMPORTANT rendering rules:
- Draw every effect — the ghost flame, the wisps, the eye lights — as HARD-EDGED
  cel-shaded shapes with flat colour bands and a CRISP, SHARP boundary. Do NOT use
  soft transparent glows, blur, haze or airbrushed gradients anywhere, and do NOT add
  a glow halo around anything. A semi-transparent glow cannot survive the background
  removal step and comes out as opaque pink.
- Do NOT outline the flame, the wisps or the eye lights in BLACK. Outline them in a
  cool pale grey — a darker shade of their own colour — so they read as glowing light
  rather than as solid outlined objects. The CLOAK keeps its bold black outline.
- Do NOT add four-pointed star sparkles or any sticker-style decoration. This is a
  game sprite, not a sticker.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- The WRAITH'S BODY must be the tallest thing in the picture. The lantern, the
  trailing rags and the wisps must never reach higher or further out than he does.
- Nothing may float loose in the empty background, detached from him.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.

Full body, single character, centered, his lowest point — the tips of his trailing
rags — touching the very bottom edge. Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

---

## enemy4.png — 骨龍（第 4 關）

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading, its level of interior DETAIL and its gritty
game-asset finish, but do NOT copy, redraw, edit or include the hooded wraith from
it. The wraith must not appear anywhere in the output. The output must contain only
the single new character described below.

2D game character asset for a children's educational math RPG: a BONE DRAGON — the
skeletal remains of a dragon risen again, stalking a foggy swamp. It should feel
MENACING and imposing. It is a high-tier monster, second only to the final bosses.

GAZE — READ THIS FIRST:
Its skull is turned toward the LEFT edge of the picture, its jaws and the lights in
its eye sockets pointed off-frame to the LEFT at something the viewer cannot see. It
is NOT looking at the viewer and NOT facing the camera. Turn the whole skull, not
just the lights.

MOVEMENT AND DIRECTION:
It is advancing toward the LEFT, head lowered and jaws parted. Because it moves left,
its tattered wing membranes, its hanging chains and every wisp of soul fire must
sweep BACKWARD toward the RIGHT edge, as if a wind were blowing from the left.

THE CHARACTER:
- A four-legged dragon skeleton: a long horned SKULL with bared teeth, an exposed
  RIBCAGE, a spined spine and a long bony tail. Powerful and heavy, not fragile.
- Its wings are bare bone struts with only TATTERED, ROTTEN dark membrane scraps
  still clinging between them, torn and full of holes.
- NO flesh, NO eyes — just dark hollow sockets with a point of PALE COLD SOUL FIRE
  burning in each, and the same pale fire flickering between its ribs.
- GOLD: several tarnished, dented gold chains and a heavy gold collar hanging loose
  around its neck and draped over the ribcage — the remains of the treasure it died
  guarding. More gold than the smaller monsters, but still crude and corroded, NOT
  the polished ornate regalia of a demon king.

DETAIL AND GRIT — it must NOT be one flat shape:
- Use at least THREE distinct tones on the bone — a bright bone-white where the light
  hits, a mid warm grey, and a deep grey in the recesses — banded as hard cel shading
  so every rib and joint reads separately.
- Draw cracks, chips and old scars across the skull and the larger bones.
- A crisp rim light down one side, lit from the upper left.
- The membrane scraps are much DARKER than the bone, so the two never blend together.

PALETTE — this matters, read it carefully:
- BONE-WHITE and warm grey for the skeleton — this is the dominant colour. The bone
  must be BRIGHT: it will stand in a mid-toned GREY-OLIVE foggy swamp, and a dark
  creature would sink into it. The pale bone is what makes it pop.
- NEAR-BLACK with a cold indigo tint for the tattered wing membranes.
- PALE COLD WHITE for the soul fire in its sockets and ribs.
- TARNISHED WARM GOLD on the chains and collar.
- It must NOT be green, olive or brown — those are the swamp's own colours.

EFFECT: pale soul fire burning in its eye sockets and flickering up between its ribs.
Every flame must be physically ATTACHED to the skeleton, touching bone. Do NOT draw
any loose, drifting or floating wisps in the background away from the body. Size the
whole effect no bigger than its own skull.

IMPORTANT rendering rules:
- Draw every effect — the soul fire, the wisps — as HARD-EDGED cel-shaded shapes with
  flat colour bands and a CRISP, SHARP boundary. Do NOT use soft transparent glows,
  blur, haze or airbrushed gradients anywhere, and do NOT add a glow halo around
  anything. A semi-transparent glow cannot survive the background removal step and
  comes out as opaque pink.
- Do NOT outline the soul fire or the wisps in BLACK. Outline them in a cool pale
  grey — a darker shade of their own colour. The SKELETON keeps its bold black
  outline.
- Do NOT add four-pointed star sparkles or any sticker-style decoration.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- The DRAGON'S BODY must be the tallest and widest thing in the picture. The wings,
  the tail, the chains and the soul fire must NEVER reach higher or further out than
  its body.
- Nothing may float loose in the empty background, detached from it.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.

Full body, single character, centered, its feet touching the very bottom edge.
Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

---

## enemy5.png — 黑騎士（第 5 關）

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

---

## enemy6.png — 暗黑魔王（第 6 關）

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading, its DARK armour treatment and its gritty
game-asset finish, but do NOT copy, redraw, edit or include the black knight from
it. The knight must not appear anywhere in the output. The output must contain only
the single new character described below. This new character is the knight's MASTER:
far bigger, far broader and far more ornate, with huge horns and a vast cape.

2D game character asset for a children's educational math RPG: the DARK LORD — a
towering horned demon king in black-and-gold armour, the FINAL BOSS of the game,
waiting in his throne hall. He must look DARK, HEAVY and OVERWHELMING.

GAZE — READ THIS FIRST:
His head is turned toward the LEFT edge of the picture, and the burning points of
light under his helm are directed off-frame to the LEFT at something the viewer
cannot see. He is NOT looking at the viewer and NOT facing the camera. Turn the whole
head, not just the lights.

MOVEMENT AND DIRECTION:
He stands still and unmoving, but the air moves around him: his huge cape and every
tattered strip of its hem must sweep BACKWARD toward the RIGHT edge, as if a wind
were blowing from the left.

BUILD — he must read as MASSIVE:
- Far BROADER and TALLER than an ordinary knight — huge shoulders, a deep chest,
  thick armoured limbs. He should look like a wall of armour, not an athlete.
- Standing TALL and UPRIGHT, feet planted wide, chest out, chin up, looking down at
  the viewer with contempt. Still and confident, NOT crouching, NOT lunging.

HEAD — no face, no flesh, no bone:
- A great helm fused with a spiked GOLD CROWN, and a pair of HUGE curved horns
  sweeping up and back from the sides of the helm. The horns are his signature.
- Under the helm there is only DARKNESS, with TWO burning points of CRIMSON light
  where eyes would be.
- Do NOT draw a skull, a face, teeth, a jaw, skin or any exposed bone anywhere on
  this character. He is fully armoured from head to foot.

HANDS — he carries NO WEAPON:
Both gauntlets are held open and slightly out from his body, wreathed in crimson and
black flame gathering around them. A true king needs no sword.

CAPE:
A vast, heavy cape spreading WIDE to both sides behind him, deep crimson on the
outside and lined with gold, its lower hem torn into ragged banner-strips. It must be
ONE single connected piece.

PALETTE — READ THIS CAREFULLY, IT IS THE MOST IMPORTANT PART:
- His armour is NEAR-BLACK with a warm dark crimson-brown undertone. Near-black is
  the DOMINANT colour of this character and covers most of his surface.
- GOLD IS TRIM ONLY. Use gold for engraved filigree scrollwork along the EDGES and
  BORDERS of the plates, for the crown, and for the cape lining — never as the base
  material of the armour itself. At most about one fifth of his surface may be gold.
  He must NOT look like a golden statue.
- DEEP CRIMSON for the cape and for gems set in the belt and chest.
- CRIMSON-ORANGE for the flames and the eye lights.
- He must NOT be blue, NOT be purple and NOT be grey — his throne hall is a dark
  blue-grey stone chamber with purple banners and blue flames, and those colours
  would make him vanish. His dark WARM armour, the bright gold edging that outlines
  every plate, and the crimson cape are what separate him from that cold hall.
- Very strong dark-to-light contrast: near-black plates, bright gold edges.

DETAIL AND GRIT — nothing may be a flat empty shape:
- Use at least THREE distinct tones on every material — bright, mid and deep — banded
  as hard cel shading, so each armour plate and each cape fold reads separately.
- Draw engraved patterns in the gold edging, fold lines in the cape, and fine scars
  and nicks across the larger plates.
- A crisp rim light down one side, lit from the upper left.

EFFECT: crimson and black flame wreathing both gauntlets, and burning crimson light
in the eye slits. Every flame must be physically ATTACHED to him — to a gauntlet or
to the helm. Do NOT draw any loose, drifting or floating embers in the background
away from him. Size each separate flame roughly as large as his own head.

IMPORTANT rendering rules:
- Draw every effect — the flames, the eye lights — as HARD-EDGED cel-shaded shapes
  with flat colour bands and a CRISP, SHARP boundary. Do NOT use soft transparent
  glows, blur, haze or airbrushed gradients anywhere, and do NOT add a glow halo
  around anything. A semi-transparent glow cannot survive the background removal step
  and comes out as opaque pink.
- Do NOT outline the flames or the eye lights in BLACK. Outline them in a deep
  crimson — a darker shade of their own colour — so they read as glowing light rather
  than as solid outlined objects. His ARMOUR and CAPE keep their bold black outlines.
- Do NOT add four-pointed star sparkles or any sticker-style decoration.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- His BODY, from the top of his horns to his feet, must be the TALLEST thing in the
  picture. The cape and the flames must NEVER reach higher or further out than he
  does.
- Nothing may float loose in the empty background, detached from him.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.

Full body, single character, centered, his feet touching the very bottom edge.
Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

---


---

# 勇者改版：持劍的旅行者（2026-08-25）

舊勇者是可愛的小魔法師，六隻怪全面暗黑化之後只剩它還停在原本的風格。
新設定：**清秀的少年劍士，藍白旅行者長外套**，攻擊改成 4 幀揮劍 + 獨立的劍氣。

## 跟怪物完全相反的三條規則

1. **勇者要維持「亮」。** 六隻怪現在全是暗色，勇者如果也走暗黑，兩邊在畫面上會糊在一起。
   勇者當亮的那一方，**每一關的對峙都自帶明度對比**。
2. **勇者要露臉。** 六隻怪全部遮臉（那是為了繞過表情地雷），勇者反過來露臉才有主角性。
   代價是表情有風險，所以 prompt 裡必須把表情寫得很死。
3. **魔法／劍氣用暖金白。** 冷藍是黑騎士、慘白是幽魂、靈火是骨龍 —— 那是不死系的語言。

## ⚠️ 配色必須同時扛住六張背景

勇者會站在**全部六個場景**上：亮草原、亮森林、青綠洞窟、灰綠沼澤、近黑火山、深藍大廳。
所以**不可以用近黑、深灰、青綠、橄欖綠**，而且整體明度要夠高。
藍白金是安全解：藍在六關都不撞，白最亮，金是全套的共同母題。

## ⚠️ 劍氣一定要獨立成一張圖

`slash.png` 是獨立檔案，**絕對不要畫在勇者身上**。
去背腳本抓的是「全圖不透明像素的外框」再正規化高度，特效畫進角色圖會撐大外框，
**角色本體就被等比縮小**（小巨龍的火焰踩過這個坑）。
獨立之後還能自己做飛行與淡出動畫，怪物日後要用也能共用。

## 五張圖與時間軸

`math-rpg.js` 的 `PLAYER_LOOK.atkFrames`，衝刺全長 520ms：

| 檔名 | 時機 | 內容 |
|---|---|---|
| `hero.png` | 0ms | 站姿 |
| `hero-atk1.png` | 83ms (0.16) | 起手：劍往後上方舉、身體壓低蓄力 |
| `hero-atk2.png` | 166ms (0.32) | 揮擊上半：劍從高處斬下（**劍氣在此出現**） |
| `hero-atk3.png` | 239ms (0.46) | 揮擊下半：劍掃到底、身體跟著轉過去 |
| `hero-atk4.png` | 343ms (0.66) | 收招：劍收在身側、重心回正 |
| — | 437ms (0.84) | 換回站姿 |
| `slash.png` | 166ms | 劍氣，獨立圖層，往右飛出並淡出（0.34s） |

## 產圖流程

**站姿先定稿，其餘四幀在同一個對話裡逐張續問**，每次都寫
「角色完全不變，只有姿勢改變」。去背腳本會把所有 `-atkN` 幀鎖定成站姿的縮放比，
所以幀與幀之間尺寸不會跳 —— 但**服裝與髮型的一致性只能靠續問維持**，
每幀都開新對話等於重骰角色。

參考圖用 `Downloads\enemy5.png`（黑騎士），它是人形、布料與金屬細節最完整的一隻。
**不要用舊勇者當參考圖**，會把可愛感帶過來。

---

## hero.png — 站姿

```
Create a completely NEW and DIFFERENT character.
The attached image is a STYLE REFERENCE ONLY — match its art style, its bold black
outline weight, its flat cel shading, its level of costume DETAIL and its polished
game-asset finish, but do NOT copy, redraw, edit or include the black knight from
it. The knight must not appear anywhere in the output. This new character wears NO
armour and NO helmet, and he must NOT be dark or sinister.

2D game character asset for a children's educational math RPG: the HERO — a young
travelling SWORDSMAN, the character the player controls. He is the bright, heroic
figure who fights the monsters.

CRITICAL — HE MUST STAY BRIGHT AND HEROIC. Every monster in this game is dark, so he
is the light in the picture. Do NOT make him dark, gloomy, sinister or villainous. Do
NOT hide his face, and do NOT give him a helmet, a hood, plate armour or black
clothing. Match the reference image's CRAFT and DETAIL, never its darkness.

FACING — READ THIS FIRST:
He faces the RIGHT side of the picture, head and eyes turned toward the RIGHT edge,
looking at an opponent off-frame to the RIGHT. Because he faces right, his hair, his
coat tails and his scarf must stream BACKWARD to the LEFT behind him, as if a wind
were blowing from the right. This is the opposite direction from the reference image.

THE CHARACTER:
- A slender, good-looking young man in his late teens — refined and clean-cut rather
  than muscular or rugged. Calm and composed.
- HEROIC PROPORTIONS — long legs, a tall torso, a clearly visible neck, and a head
  that is NOT oversized. He must read as a capable young adventurer, NOT as a squat
  chibi with a giant head.
- Short, slightly tousled DARK BROWN hair with a few strands falling over his brow.
- POSE: standing upright and still, chest out, chin up, weight settled on both feet
  set slightly apart, turned toward the right. One hand holds a straight LONGSWORD
  angled down and out to his side, its point near the ground; the other hand rests
  loose and open. Calm and ready, NOT crouching, NOT running, NOT mid-swing.

FACE — composed and confident, never cutesy:
- Eyes NARROWED slightly into a calm, focused look, with sharp angular lids and crisp
  white catchlights. Do NOT draw huge round sparkling anime eyes.
- Mouth CLOSED in a firm level line, with the faintest confident set to it. Do NOT
  draw an open smiling or shouting mouth.
- Clean, fine features and a defined jawline.

COSTUME — a working traveller's gear, not a costume-party outfit:
- A long DEEP ROYAL BLUE travelling coat, worn open, its hem reaching past the knee
  and split at the back into two tails. Restrained GOLD trim along the collar, the
  front edges and the cuffs.
- A crisp WHITE shirt and a fitted white tunic underneath, with a light off-white
  scarf around the neck, its end trailing behind him.
- A brown leather belt with a few small pouches, brown leather boots, and brown
  fingerless gloves.
- The sword is a straight double-edged LONGSWORD: a bright silver blade, a GOLD
  crossguard and pommel, and a blue-wrapped grip.

DETAIL AND GRIT — nothing may be a flat empty shape:
- Use at least THREE distinct tones on every material — bright, mid and deep — banded
  as hard cel shading, so each fold of the coat and each lock of hair reads
  separately.
- Draw fold lines in the coat, stitching along the seams, and small scuffs on the
  boots and the leather.
- A crisp rim light down one side, lit from the upper left.

PALETTE — this matters, read it carefully:
- DEEP ROYAL BLUE coat, WHITE shirt and scarf, WARM GOLD trim and sword furniture,
  BRIGHT SILVER blade, WARM BROWN leather, DARK BROWN hair.
- Keep his overall value HIGH and BRIGHT. He will stand on six different backgrounds
  — a bright meadow, a bright forest, a teal cavern, an olive swamp, a near-black
  volcano and a dark blue castle hall — so he must be bright and saturated enough to
  read against all of them. Do NOT use near-black, dark grey, teal or olive anywhere
  on him.

EFFECT: a single small hard-edged GOLD gleam along the sword's edge. Nothing else —
no aura, no magic, no particles. The sword aura is a separate image.

IMPORTANT rendering rules:
- Draw the gleam as a HARD-EDGED cel-shaded shape with a flat colour band and a
  CRISP, SHARP boundary. Do NOT use soft transparent glows, blur, haze or airbrushed
  gradients anywhere, and do NOT add a glow halo around anything. A semi-transparent
  glow cannot survive the background removal step and comes out as opaque pink.
- Do NOT add four-pointed star sparkles or any sticker-style decoration.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

CRITICAL — FRAMING:
- HIS BODY, from the top of his head to his boots, must be the TALLEST thing in the
  picture. The sword, the coat tails and the scarf must NEVER reach higher or further
  out than he does.
- Nothing may float loose in the empty background, detached from him.
- Leave a clear empty magenta margin on all four sides — nothing may touch or come
  near any edge of the picture.

Full body, single character, centered, his feet touching the very bottom edge.
Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
Do NOT draw any shadow onto the background — no ellipse or contact shadow beneath
the character. No text, no watermark, no border.
```

---

## hero-atk1~4.png — 四張攻擊幀（站姿定稿後，同一個對話逐張續問）

每一張都在**同一個對話**裡接著問，一次一張，依序貼。
四段共用的開頭與結尾已經寫進各段，直接複製即可。

### hero-atk1.png — 起手

```
Same character, same outfit, same hair, same colours, same art style, same size and
same height — only the POSE changes. This is frame 2 of a 5-frame sword attack.

WIND-UP: he has stepped forward onto his front foot and twisted his upper body back
and away to load the swing. Both hands now grip the longsword, raised high behind his
right shoulder with the blade angled up and back. His knees are bent, his weight is
low, and his coat tails and scarf whip forward past him because he has just lunged.
His eyes stay locked on the target off-frame to the RIGHT.

Keep his feet touching the very bottom edge, keep the clear magenta margin on all four
sides, and keep the sword INSIDE the frame — it must not reach higher than his head or
touch any edge. Everything else stays untouched.
```

### hero-atk2.png — 揮擊上半（劍氣在此出現）

```
Same character, same outfit, same hair, same colours, same art style, same size and
same height — only the POSE changes. This is frame 3 of a 5-frame sword attack, the
moment the blade starts to come down.

DOWNSWING: the sword is sweeping down and forward toward the RIGHT, caught at about
head height, both hands driving it. His shoulders have snapped around to face right,
his front knee is deeply bent and his back leg is extended behind him. Hair, coat
tails and scarf all stream back to the LEFT. His mouth stays closed and his eyes stay
narrowed and locked forward — do NOT draw him shouting.

Do NOT draw any sword aura, slash arc, wind streak or energy — that effect is a
separate image and must not appear here.

Keep his feet touching the very bottom edge, keep the clear magenta margin on all four
sides, and keep the sword INSIDE the frame. Everything else stays untouched.
```

### hero-atk3.png — 揮擊下半

```
Same character, same outfit, same hair, same colours, same art style, same size and
same height — only the POSE changes. This is frame 4 of a 5-frame sword attack, the
end of the same swing.

FOLLOW-THROUGH: the swing has carried all the way through. The blade has swept down
past his body and now points down and forward to the RIGHT, low and extended. His
torso is turned fully to the right and leaning into the strike, his front leg planted
and his back foot up on its toe. Hair, coat tails and scarf are still streaming back
to the LEFT.

Do NOT draw any sword aura, slash arc, wind streak or energy — that effect is a
separate image and must not appear here.

Keep his feet touching the very bottom edge, keep the clear magenta margin on all four
sides. Everything else stays untouched.
```

### hero-atk4.png — 收招

```
Same character, same outfit, same hair, same colours, same art style, same size and
same height — only the POSE changes. This is frame 5 of a 5-frame sword attack, the
recovery.

RECOVERY: he is straightening back up out of the swing. The sword has been drawn back
in and now rests angled down at his side in one hand, close to his body. His weight is
settling back onto both feet and his shoulders are turning back toward the viewer,
about halfway between the follow-through and his neutral standing pose. His coat and
scarf are falling back down rather than streaming. He still watches the target
off-frame to the RIGHT.

Keep his feet touching the very bottom edge, keep the clear magenta margin on all four
sides. Everything else stays untouched.
```

---

## slash.png — 劍氣（獨立產，可以另開對話）

```
2D game visual effect asset for a children's educational math RPG: a SWORD AURA —
the crescent-shaped slash of light left hanging in the air by a sword swing.

THE EFFECT, and nothing else. Do NOT draw a character, a sword, a hand, a background
or any scenery. The picture contains only the crescent of light.

SHAPE: one clean CRESCENT arc, thick and sharp in the middle and tapering to fine
points at both ends, curving so that its opening faces LEFT and its leading edge faces
RIGHT — it is travelling to the RIGHT. Slightly diagonal, as if left by a downward
diagonal slash. It should be tall and narrow rather than round, roughly twice as tall
as it is wide.

STYLE: bold clean black outline of even thickness, flat cel shading, mobile game asset
quality — the same finish as the game's characters.

COLOUR: a bright WHITE-HOT core running down the middle of the crescent, a WARM GOLD
band around that, and a deep AMBER outline at the very edge. Three flat bands, clearly
separated, no gradients between them.

IMPORTANT rendering rules:
- Draw it with HARD EDGES and flat colour bands only. Do NOT use soft transparent
  glows, blur, haze, motion blur or airbrushed gradients anywhere, and do NOT add a
  glow halo around it. A semi-transparent glow cannot survive the background removal
  step and comes out as opaque pink.
- A few small sharp shards of light may break off the crescent, but they must TOUCH
  it. Do NOT draw any loose, drifting or floating sparks separated from the crescent.
- The gold must be a warm yellow-gold. It must never look pink or magenta.

FRAMING: centered, filling most of the canvas, with a clear empty magenta margin on
all four sides — no part of the crescent may touch or come near any edge.
Square 1:1 canvas.
Background: flat solid magenta #FF00FF, completely empty and perfectly uniform.
No text, no watermark, no border, no shadow.
```

## 收圖檢查

- [ ] 五幀的**服裝、髮型、配色、比例**完全一致嗎？（只能靠續問維持，最容易走鐘）
- [ ] 每一幀都朝**右**嗎？頭髮／衣擺／圍巾往**左**拖嗎？
- [ ] 表情有沒有變可愛或張嘴大吼？（要閉嘴、瞇眼、沉著）
- [ ] 攻擊幀裡有沒有**偷畫劍氣進去**？（一定要沒有，劍氣是獨立圖層）
- [ ] 明度夠亮嗎？有沒有出現近黑／深灰／青綠／橄欖綠？
- [ ] 劍與衣擺有沒有超出角色高度、有沒有碰到畫布邊緣？
- [ ] 劍氣是否**只有新月本體**、沒有角色或手？開口朝左、往右飛？

---

## ⚠️ 多幀動畫：續問的三個限制（2026-08-26，勇者揮劍實作）

原本規劃 5 幀（站姿／起手／斬上／斬下／收招），實際只做得出 **3 幀**（站姿／起手／斬擊）。
三個原因都是續問本身的限制，不是 prompt 寫得不夠好：

### ① 開頭寫一串 `same ...` 會讓姿勢也不變

第一次要斬擊幀時開頭寫了
`Same character, same outfit, same hair, same colours, same art style, same size and same height — only the POSE changes`，
結果**產出跟前一幀幾乎一模一樣**：Gemini 把「姿勢」也算進 same 裡了，
要改的東西被埋在一堆「不要改」後面。

**改成把差異放最前面、而且明講「這張跟上一張一樣是錯的」就成功了**：

```
This came out almost IDENTICAL to the previous image — the sword is still raised
behind his shoulder. That is wrong. This frame must look CLEARLY DIFFERENT from the
last one: it is the NEXT moment in the swing, after the blade has already come down.

Redraw him with ... Concretely, compared to the previous image:
- His HANDS have dropped from shoulder height to about WAIST height, and moved from
  behind him to out IN FRONT of his body toward the RIGHT.
- The BLADE is no longer above him. It now crosses in FRONT of his chest ...
```

`same character, same outfit, same hair, same colours` 移到**最後一行**，
而且**不要寫 `same size` / `same height`**（那兩個詞會被理解成連姿勢一起維持）。

### ② 相鄰太近的兩幀，Gemini 分不出來

「斬上」和「斬下」只差半個揮擊行程，連問兩次都只拿到「斬上的變體」。
**分鏡要挑差異夠大的關鍵姿勢**，中間補間交給 Gemini 是白費次數。

### ③ 續問保得住造型，保不住細節密度

**每續問一輪，畫質會退化一點。** 到第四、五輪時外套摺線變少、車縫線幾乎消失、明暗變平，
跟第一輪的站姿並排就看得出來。
**所以幀數要少而精，把次數花在前幾輪。**

### 收招不必用圖演

CSS 的 `.lunge` 會把角色平移出去再平移回來，**回程本身就是收招**，
回程時顯示站姿讀起來完全自然。而且寫 `much closer to a neutral stance` 的話，
Gemini 會直接收斂回站姿，那一幀等於沒有資訊量。

**時間軸（LUNGE_MS = 520ms）**：`0 站姿 → 0.16 起手 → 0.34 斬擊＋劍氣 → 0.70 站姿`
