#!/usr/bin/env bash
# 數學勇者：發光特效（劍氣）轉檔
#
# 跟 math-rpg-keyer.ps1 是**兩條不同的路線，不要混用**：
#   角色圖 hero/enemy   洋紅底 → keyer.ps1 色相去背 → 透明 webp
#   發光特效 slash      純黑底 → 這支腳本 亮度轉 alpha → 透明 webp
#
# 為什麼特效不能用門檻去背：劍氣邊緣是連續光暈、沒有輪廓線，任何門檻都會在
# 「還看得見的微光」處切一刀留下硬邊。改用 alpha = max(R,G,B) 就沒有門檻，
# 純黑→全透明、白核心→全不透明，中間逐像素平滑過渡。
# 用 max 而不是標準 luma：藍色在 luma 只佔 0.07 權重，會讓藍色光暈整片消失。
#
# **不要退回「保留黑底 + CSS screen 混合」的做法**（2026-08-26 踩過）：
# screen 只跟同一個堆疊環境內已畫好的內容混合，而 .fighter 有 z-index:1、
# 本身全透明，劍氣關在裡面等於跟透明做 screen ＝ 沒混到，黑底變成一塊黑矩形。
# 烘進 alpha 就與堆疊環境無關，元素搬到哪都不會壞。CSS 那邊的 screen 保留當加分項。
#
# colorlevels：AI 產的「黑底」帶 3~15/255 灰霧，會變成一片 alpha≈0.05 的霧。
# FLOOR 把門檻以下壓成純黑。跑完看「背景 alpha 中位數」，>6 就把 FLOOR 調到 0.10。
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
  "slash3:slash-wide:1"     # 寬橫斬：弧度最飽滿，普攻主力（鏡射）
  "slash4:slash-cross:0"    # 十字斬：中心爆閃，爆擊專用
  "slash5:slash-thrust:0"   # 突刺：方向感最強，普攻
  # 垂直光刃：蓄力用。2026-08-27 正式啟用 —— 爆擊出手前，粒子往劍上聚集時
  # 疊在勇者身上的那道光柱（見 assets/js/math-rpg-pixi.js 的 chargeFx）。
  # 本來就是垂直對稱的圖，不用鏡射。
  "slash2:charge:0"
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
