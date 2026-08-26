#!/usr/bin/env bash
# 數學勇者：發光特效（劍氣）轉檔
#
# 跟 math-rpg-keyer.ps1 走**完全不同的路線**，不要混用：
#
#   角色圖（hero/enemy）  洋紅底 → keyer.ps1 逐像素去背（色相判斷）→ 透明 webp
#   發光特效（slash）     純黑底 → 這支腳本 → **亮度轉 alpha** 的透明 webp
#
# 為什麼不用色相去背：劍氣的邊緣是連續的光暈漸層，沒有明確的輪廓線。
# 任何門檻式去背都會在「還看得見的微光」處切一刀，留下硬邊或黑邊。
#
# 這裡改用「亮度即透明度」：alpha = max(R,G,B)。
# 純黑 → alpha 0 完全透明；純白核心 → alpha 255 全不透明；中間的光暈
# 逐像素依亮度平滑過渡，柔邊完整保留，沒有任何一刀切的門檻。
#
# 為什麼用 max(R,G,B) 而不是標準亮度公式：藍色在 luma 裡的權重只有 0.07，
# 用 luma 會讓深藍色的光暈幾乎整片消失。max 對各色相一視同仁，這批藍色劍氣才不會被吃掉。
#
# ── 為什麼不是只靠 CSS mix-blend-mode:screen ──
# 一開始的版本是「保留黑底 + screen 混合」，理論上更漂亮（加亮混合），
# 但 2026-08-26 實測踩到坑：screen 只會跟**同一個堆疊環境內**已畫好的內容混合，
# 而 .fighter 有 z-index:1 會建立堆疊環境、本身又是全透明的，
# 劍氣等於在跟「透明」做 screen＝完全沒混到，黑底原封不動變成一塊黑矩形。
# 烘進 alpha 之後就跟堆疊環境完全無關了，元素搬到哪裡都不會再壞。
# CSS 那邊仍然保留 screen 混合：有 alpha 打底，混合成功時多一層加亮的漂亮，
# 混合失效時也只是少一點光暈，不會再出現黑框。
#
# colorlevels 的用途：AI 產的「黑底」其實不是純黑，通常帶 3~15/255 的灰霧。
# 那層灰霧會變成一片 alpha≈0.05 的霧，在深色背景上看得出一塊方形。
# rimin=0.06 把 15/255 以下壓成純黑，alpha 就真的歸零了。
# 如果你的圖灰霧更重（跑完「背景中位數」>6），把 FLOOR 調到 0.10。
#
# 用法：bash .claude/math-rpg-fx.sh

set -e

SRC="${SRC:-C:/Users/nini9/Downloads}"
OUT="$(dirname "$0")/../assets/images/math-rpg"
TMP="$(mktemp -d)"
FLOOR="${FLOOR:-0.06}"   # 黑底門檻，看到方框就調高

# 要處理的特效，格式是「來源檔名:輸出檔名:是否水平鏡射」。
#
# 來源沿用生成當下的流水號（slash1~5，2026-08-26 那批），輸出才是有意義的名字。
# 保留流水號是刻意的：重生某一招時只要覆蓋對應的 slashN.png 再跑一次就好，
# 不必記得它該叫什麼。對應關係就是這張表，改圖前先對一眼。
#
# 鏡射（flip）——**所有素材一律以「攻擊方向朝右」為基準**，
# 因為勇者在左、怪物在右，CSS 再用 --dir 把怪物的攻擊鏡射回去。
# Gemini 產出的新月弧和寬橫斬都是「C」形：開口朝右、弧背朝左，
# 讀起來像往左飛。斬擊要往右飛，弧背必須在前（")" 形），所以這兩張要鏡射。
# 突刺本來就朝右、十字斬左右對稱、光刃是垂直的，三張都不用動。
FX=(
  "slash1:slash-arc:1"      # 新月弧：技能斬（鏡射）
  "slash2:charge:0"         # 垂直光刃：蓄力，階段三才會用到
  "slash3:slash-wide:1"     # 寬橫斬：弧度最飽滿，普攻主力（鏡射）
  "slash4:slash-cross:0"    # 十字斬：中心爆閃，爆擊專用
  "slash5:slash-thrust:0"   # 突刺：方向感最強，普攻
)

missing=0
for job in "${FX[@]}"; do
  IFS=':' read -r src n flip <<< "$job"
  if [ ! -f "$SRC/$src.png" ]; then
    echo "跳過 $n（找不到 $SRC/$src.png）"
    missing=$((missing+1))
    continue
  fi

  [ "$flip" = "1" ] && hf="hflip," || hf=""

  # 第一段：壓掉灰霧、（必要時）鏡射、縮到 512。這時還是黑底的不透明圖。
  ffmpeg -y -loglevel error -i "$SRC/$src.png" \
    -vf "colorlevels=rimin=$FLOOR:gimin=$FLOOR:bimin=$FLOOR,${hf}scale='min(512,iw)':-1:flags=lanczos" \
    -frames:v 1 -update 1 "$TMP/$n.png"

  # 第二段：亮度轉 alpha。RGB 原封不動，只是把 max(R,G,B) 填進 alpha 通道。
  # geq 要在 rgba 上跑，所以先 format=rgba。
  ffmpeg -y -loglevel error -i "$TMP/$n.png" \
    -vf "format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='max(max(r(X,Y),g(X,Y)),b(X,Y))'" \
    -frames:v 1 -update 1 "$TMP/${n}_a.png"

  # libwebp 的 alpha 一律無損保存（-lossless 0 只影響 RGB），透明邊不會有壓縮雜訊
  ffmpeg -y -loglevel error -i "$TMP/${n}_a.png" \
    -c:v libwebp -lossless 0 -quality 90 -preset picture "$OUT/$n.webp"

  # 驗收：取全圖 RGB 的**中位數**，當作「背景黑得夠不夠乾淨」的指標。
  #
  # 為什麼是中位數而不是角落取樣：十字斬的光束一路延伸到四個角，
  # 角落根本不是背景而是光，量角落會報出 144 這種假警報。
  # 但不管哪種構圖，背景永遠佔畫面的大多數，所以中位數必定落在背景上。
  #
  # 也不要用 signalstats 的 YMIN —— 它算的是 YUV 空間的亮度，webp 解碼成
  # yuv420p 之後純黑會落在 limited range 的 16 附近，看起來像有殘留其實沒有。
  # 直接解成 rgb24 讀原始位元組才是準的。
  # 量的是 **alpha 通道**的中位數：背景該是完全透明，所以應該要 0。
  # od 預設每行 16 個位元組，16 是 4 的倍數，所以跨行累計 p 仍能正確對齊到 alpha。
  med=$(ffmpeg -v error -i "$OUT/$n.webp" -vf "format=rgba" -f rawvideo - 2>/dev/null \
        | od -An -tu1 -v \
        | awk '{for(i=1;i<=NF;i++){p++; if(p%4==0){h[$i]++; t++}}}
               END{c=0; for(v=0;v<256;v++){c+=h[v]; if(c>=t/2){print v; exit}} print 0}')
  flag=""
  [ "${med:-0}" -gt 6 ] && flag="  ← 灰霧偏高，改用 FLOOR=0.10 再跑一次"
  printf "%-14s -> %7s bytes   背景 alpha 中位數 %-4s%s\n" "$n" "$(stat -c%s "$OUT/$n.webp")" "${med:-?}" "$flag"
done

rm -rf "$TMP"
echo "done -> $OUT"
[ "$missing" -gt 0 ] && echo "（有 $missing 個檔案還沒放進 $SRC）"
exit 0
