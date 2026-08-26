#!/usr/bin/env bash
# 數學勇者：關卡背景圖處理（去背不需要，這裡只做裁切／調色／轉檔）
#
# 為什麼要裁：.battle-stage 的實測比例約 6:1（1280x720 視窗下是 1255x206），
# 而 Gemini 產的圖是 16:9。直接套 background-size:cover 只會顯示圖的最底部 29%，
# 也就是一整片純地面——天空、遠山、水晶、彩繪窗全部看不到。
#
# 裁切帶固定 238px 高（放大成 1600x372 ≈ 4.3:1，比容器 4.54:1 略高一點當作餘裕），
# 每張圖的起始 y 是逐張抓的，目的是讓該圖的「地面線」對齊角色腳底
# （角色腳底落在戰鬥區高度的 71% 處）。改圖後若角色浮空或陷進地面，調這個值。
#
# 2026-08-20 二版：角色從 6.6u 放大到 12u、戰鬥區從 206px 長到 276px 之後，
# 容器比例從 6.09:1 變成 4.54:1，可以顯示的背景高度多了 30%，所以整批重裁。
#
# 2026-08-25 三版：戰鬥區再長高 30px（276 → 309），裁切帶 238 → 269、輸出 1600x420。
#
#   關鍵是「往上加高、下緣不動」：H 加多少，cropY 就減多少，所以 y+H 不變。
#   地面線在原圖裡的位置沒動，而 cover 的縮放比 max(1255/1600, 306/400) = 0.784
#   仍然由「寬度」決定（跟舊版一模一樣），所以**地面線落點完全不變**，
#   多出來的高度純粹是多看到 30px 的天空。
#
#   要再長高的話同樣照這個規則走，但有上限：一旦
#   容器高度 / (容器寬 x 帶高/1600) >= 1，縮放比就改由高度決定，
#   地面線會開始往上漂，角色會浮空。帶高 420 在 1255 寬時撐得住 329px（目前用 309，餘裕 6%）。
#
# 用法：bash .claude/math-rpg-stages.sh
set -e

SRC="${SRC:-C:/Users/nini9/Downloads}"
OUT="$(dirname "$0")/../assets/images/math-rpg"
TMP="$(mktemp -d)"
H=269

# stage:cropY:extraFilters
#   cropY 是 2026-08-25 從二版的值各減 18（= H 從 238 加到 256 的增量），
#   讓裁切帶的「下緣」停在跟二版完全相同的位置。
#   stage1 草原  地平線很高，要抓得比其他張深
#   stage3 洞窟  原圖是藍紫色 → 轉青綠（原本是為了跟紫蝙蝠拉開，現在是為了讓骨白跳出來）
#   stage6 魔王城 原圖是紫色 → 轉深藍（讓魔王的金邊緋紅在冷色大廳前浮起來）
JOBS=(
  "1:94:"
  "2:167:"
  "3:190:hue=h=-52:s=1.05,"
  "4:190:"
  "5:207:"
  "6:190:hue=h=-48:s=1.0,"
)

for job in "${JOBS[@]}"; do
  n="${job%%:*}"; rest="${job#*:}"
  y="${rest%%:*}"; extra="${rest#*:}"
  ffmpeg -y -loglevel error -i "$SRC/stage$n.png" \
    -vf "crop=1024:$H:0:$y,${extra}scale=1600:420:flags=lanczos" \
    -frames:v 1 -update 1 "$TMP/stage$n.png"
  ffmpeg -y -loglevel error -i "$TMP/stage$n.png" \
    -c:v libwebp -lossless 0 -quality 82 -preset picture "$OUT/stage$n.webp"
  echo "stage$n  crop y=$y..$((y+H))  -> $(stat -c%s "$OUT/stage$n.webp") bytes"
done

rm -rf "$TMP"
echo "done -> $OUT"
