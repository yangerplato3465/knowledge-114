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
# 用法：bash .claude/math-rpg-stages.sh
set -e

SRC="${SRC:-C:/Users/nini9/Downloads}"
OUT="$(dirname "$0")/../assets/images/math-rpg"
TMP="$(mktemp -d)"
H=238

# stage:cropY:extraFilters
#   stage1 草原  地平線很高，要抓得比其他張深
#   stage3 洞窟  原圖是藍紫色，跟紫蝙蝠同色系 → 轉青綠拉開對比
#   stage6 魔王城 原圖是紫色，跟紫魔王同色系 → 轉深藍拉開對比
JOBS=(
  "1:125:"
  "2:198:"
  "3:221:hue=h=-52:s=1.05,"
  "4:221:"
  "5:238:"
  "6:221:hue=h=-48:s=1.0,"
)

for job in "${JOBS[@]}"; do
  n="${job%%:*}"; rest="${job#*:}"
  y="${rest%%:*}"; extra="${rest#*:}"
  ffmpeg -y -loglevel error -i "$SRC/stage$n.png" \
    -vf "crop=1024:$H:0:$y,${extra}scale=1600:372:flags=lanczos" \
    -frames:v 1 -update 1 "$TMP/stage$n.png"
  ffmpeg -y -loglevel error -i "$TMP/stage$n.png" \
    -c:v libwebp -lossless 0 -quality 82 -preset picture "$OUT/stage$n.webp"
  echo "stage$n  crop y=$y..$((y+H))  -> $(stat -c%s "$OUT/stage$n.webp") bytes"
done

rm -rf "$TMP"
echo "done -> $OUT"
