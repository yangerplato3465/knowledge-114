$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$cs = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class Keyer {
    static void ToHsv(int r, int g, int b, out double h, out double s, out double v) {
        double rd = r / 255.0, gd = g / 255.0, bd = b / 255.0;
        double max = Math.Max(rd, Math.Max(gd, bd));
        double min = Math.Min(rd, Math.Min(gd, bd));
        double d = max - min;
        v = max;
        s = (max <= 0) ? 0 : d / max;
        if (d <= 0) { h = 0; return; }
        if (max == rd)      h = 60 * (((gd - bd) / d) % 6);
        else if (max == gd) h = 60 * (((bd - rd) / d) + 2);
        else                h = 60 * (((rd - gd) / d) + 4);
        if (h < 0) h += 360;
    }

    // magenta-ness: how much R and B both exceed G (0..1)
    static double Spill(int r, int g, int b) {
        double m = (Math.Min(r, b) - g) / 255.0;
        return m < 0 ? 0 : m;
    }

    static bool IsBgCandidate(int r, int g, int b) {
        double h, s, v;
        ToHsv(r, g, b, out h, out s, out v);
        // wide magenta band; character purples sit at hue 250-285 and are excluded
        return (h >= 286 && h <= 340 && s >= 0.30 && v >= 0.18);
    }

    // Tight band for magenta pockets the border flood fill cannot reach (e.g. the gap
    // between an arm and the torso, sealed off by antialiased pixels).
    // Measured: background is hue~301 sat~0.90; nearest character purple is hue 262-285
    // sat~0.28, and the demon lord's crimson cape is hue~345. Nothing of the character
    // falls inside this band.
    static bool IsStrictBg(int r, int g, int b) {
        double h, s, v;
        ToHsv(r, g, b, out h, out s, out v);
        // sat floor is 0.75, not 0.55: the real backdrop measures 0.90, while the hero's
        // violet hair highlights reach 0.70 and were being deleted at the looser threshold.
        return (h >= 288 && h <= 330 && s >= 0.75 && v >= 0.30);
    }

    // Scale factor actually used by the last Process() call. An attack pose must reuse the
    // idle pose's factor instead of being stretched to the same target height -- their
    // bounding boxes differ by a percent or two, and re-fitting each one makes the character
    // visibly change size the moment the animation swaps frames.
    public static double LastScale;

    public static string Process(string inPath, string outPath, bool flip, double targetScale, int canvas, double forcedScale, int minPocket) {
        using (Bitmap src = new Bitmap(inPath)) {
            int w = src.Width, h = src.Height;
            Rectangle rect = new Rectangle(0, 0, w, h);
            BitmapData bd = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] buf = new byte[stride * h];
            Marshal.Copy(bd.Scan0, buf, 0, buf.Length);
            src.UnlockBits(bd);

            // ---- pass 1: flood fill background from the border ----
            bool[] isBg = new bool[w * h];
            bool[] seen = new bool[w * h];
            Queue<int> q = new Queue<int>();
            for (int x = 0; x < w; x++) {
                q.Enqueue(x);              // top row
                q.Enqueue((h - 1) * w + x); // bottom row
            }
            for (int y = 0; y < h; y++) {
                q.Enqueue(y * w);           // left col
                q.Enqueue(y * w + (w - 1)); // right col
            }
            while (q.Count > 0) {
                int idx = q.Dequeue();
                if (seen[idx]) continue;
                seen[idx] = true;
                int y = idx / w, x = idx % w;
                int o = y * stride + x * 4;
                if (!IsBgCandidate(buf[o+2], buf[o+1], buf[o])) continue;
                isBg[idx] = true;
                if (x > 0)     q.Enqueue(idx - 1);
                if (x < w - 1) q.Enqueue(idx + 1);
                if (y > 0)     q.Enqueue(idx - w);
                if (y < h - 1) q.Enqueue(idx + w);
            }

            // ---- pass 1b: kill enclosed magenta pockets the flood fill could not reach ----
            // Only whole CONNECTED BLOBS are removed. Characters contain scattered pixels that
            // also pass the strict test -- the hero's violet hair highlights have a batch at
            // hue 288-300 / sat>0.55 -- and deleting those punches holes straight through the
            // hair. A real trapped pocket (the gap between an arm and the torso) is one solid
            // region; the false positives are specks, so a minimum area separates them.
            int pockets = 0;
            {
                bool[] cand = new bool[w * h];
                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        int idx = y * w + x;
                        if (isBg[idx]) continue;
                        int o = y * stride + x * 4;
                        if (IsStrictBg(buf[o+2], buf[o+1], buf[o])) cand[idx] = true;
                    }
                }
                bool[] seen2 = new bool[w * h];
                List<int> comp = new List<int>();
                // Caller-supplied. 150 is the safe default for characters that contain
                // violet/magenta-adjacent colours of their own (the hero's hair). Skeletons
                // and other characters with NO magenta-family colour can go far lower, which
                // is the only way to clear narrow slivers such as the gaps between ribs.
                int MIN_POCKET = minPocket;
                for (int i = 0; i < cand.Length; i++) {
                    if (!cand[i] || seen2[i]) continue;
                    comp.Clear();
                    Queue<int> cq = new Queue<int>();
                    cq.Enqueue(i); seen2[i] = true;
                    while (cq.Count > 0) {
                        int idx = cq.Dequeue();
                        comp.Add(idx);
                        int y = idx / w, x = idx % w;
                        if (x > 0     && cand[idx-1] && !seen2[idx-1]) { seen2[idx-1] = true; cq.Enqueue(idx-1); }
                        if (x < w - 1 && cand[idx+1] && !seen2[idx+1]) { seen2[idx+1] = true; cq.Enqueue(idx+1); }
                        if (y > 0     && cand[idx-w] && !seen2[idx-w]) { seen2[idx-w] = true; cq.Enqueue(idx-w); }
                        if (y < h - 1 && cand[idx+w] && !seen2[idx+w]) { seen2[idx+w] = true; cq.Enqueue(idx+w); }
                    }
                    if (comp.Count >= MIN_POCKET) {
                        for (int k = 0; k < comp.Count; k++) { isBg[comp[k]] = true; pockets++; }
                    }
                }
            }

            // ---- pass 1c: band of pixels within 20px of the background ----
            // Haze is created by the generator compositing a semi-transparent glow ONTO the
            // magenta, so it can only occur near the silhouette. Restricting the haze despill
            // to this band stops it from nibbling low-saturation pixels deep inside a character
            // (the bat's pale ears picked up grey speckle without this).
            bool[] nearBg = new bool[w * h];
            {
                int[] dist = new int[w * h];
                for (int i = 0; i < dist.Length; i++) dist[i] = -1;
                Queue<int> dq = new Queue<int>();
                for (int i = 0; i < isBg.Length; i++) if (isBg[i]) { dist[i] = 0; dq.Enqueue(i); }
                const int MAXD = 20;
                while (dq.Count > 0) {
                    int idx = dq.Dequeue();
                    int d = dist[idx];
                    if (d >= MAXD) continue;
                    int y = idx / w, x = idx % w;
                    if (x > 0     && dist[idx-1] < 0) { dist[idx-1] = d+1; nearBg[idx-1] = true; dq.Enqueue(idx-1); }
                    if (x < w - 1 && dist[idx+1] < 0) { dist[idx+1] = d+1; nearBg[idx+1] = true; dq.Enqueue(idx+1); }
                    if (y > 0     && dist[idx-w] < 0) { dist[idx-w] = d+1; nearBg[idx-w] = true; dq.Enqueue(idx-w); }
                    if (y < h - 1 && dist[idx+w] < 0) { dist[idx+w] = d+1; nearBg[idx+w] = true; dq.Enqueue(idx+w); }
                }
            }

            // ---- pass 2: alpha + despill on the fringe ----
            byte[] outBuf = new byte[stride * h];
            int bgCount = 0;
            int haze = 0;
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int idx = y * w + x;
                    int o = y * stride + x * 4;
                    int b = buf[o], g = buf[o+1], r = buf[o+2];
                    if (isBg[idx]) { bgCount++; continue; } // stays fully transparent

                    // is this pixel adjacent to background? then it is an antialiased fringe
                    bool fringe = false;
                    for (int dy = -2; dy <= 2 && !fringe; dy++) {
                        for (int dx = -2; dx <= 2; dx++) {
                            int nx = x + dx, ny = y + dy;
                            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                            if (isBg[ny * w + nx]) { fringe = true; break; }
                        }
                    }

                    int alpha = 255;
                    int rr = r, gg = g, bb = b;
                    if (fringe) {
                        // Gate on HUE, not just on "R and B both exceed G" -- that test is also
                        // true of any purple, so the hero's violet hair was being read as magenta
                        // spill and flattened to grey (and made semi-transparent). Hair is thin,
                        // so nearly every strand pixel sits within the fringe radius and the whole
                        // fringe went grey. Magenta spill lands near hue 300; character purples
                        // measure 250-285, so 288 separates them.
                        double fh, fs, fv;
                        ToHsv(r, g, b, out fh, out fs, out fv);
                        if (fh >= 288 && fh <= 340) {
                            double m = Spill(r, g, b);
                            // heavy magenta on the fringe -> mostly background, fade it out
                            alpha = (int)Math.Round(255.0 * (1.0 - Math.Min(1.0, m * 1.35)));
                            if (alpha < 0) alpha = 0;
                            if (alpha > 255) alpha = 255;
                            // despill: pull R and B down toward G so edges do not glow purple
                            if (m > 0.02) {
                                int cap = (int)Math.Round(g + (Math.Min(r, b) - g) * 0.25);
                                if (r > cap) rr = cap;
                                if (b > cap) bb = cap;
                                if (rr < 0) rr = 0;
                                if (bb < 0) bb = 0;
                            }
                        }
                    }
                    // Haze despill. A semi-transparent glow (the hero's magic book) was
                    // already composited onto the magenta backdrop by the generator, so those
                    // pixels are opaque pink and no amount of keying brings the alpha back.
                    // Measured on hero.png: haze sits at hue 280-340 with sat 0.06-0.19, while
                    // the purple hair in the SAME hue band sits at sat 0.27+, and the blue glow
                    // is at hue 180-229. A tight sat ceiling separates them cleanly.
                    // Pull R and B down to G so the pink returns to neutral white/cyan and the
                    // shape survives -- deleting these pixels would punch holes in the wisps.
                    if (nearBg[idx]) {
                        double hz, sz, vz;
                        ToHsv(rr, gg, bb, out hz, out sz, out vz);
                        if (hz >= 280 && hz <= 340 && sz < 0.22 && vz > 0.50) {
                            int mn = Math.Min(rr, bb);
                            int cap = gg + (int)Math.Round((mn - gg) * 0.15);
                            if (rr > cap) rr = cap;
                            if (bb > cap) bb = cap;
                            if (rr < 0) rr = 0;
                            if (bb < 0) bb = 0;
                            haze++;
                        }
                    }

                    outBuf[o]   = (byte)bb;
                    outBuf[o+1] = (byte)gg;
                    outBuf[o+2] = (byte)rr;
                    outBuf[o+3] = (byte)alpha;
                }
            }

            // ---- pass 3: alpha bounding box ----
            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int o = y * stride + x * 4;
                    if (outBuf[o+3] > 24) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX < 0) return "FAILED: nothing survived keying";
            int cw = maxX - minX + 1, ch = maxY - minY + 1;

            using (Bitmap keyed = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData kd = keyed.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                Marshal.Copy(outBuf, 0, kd.Scan0, outBuf.Length);
                keyed.UnlockBits(kd);

                using (Bitmap cropped = keyed.Clone(new Rectangle(minX, minY, cw, ch), PixelFormat.Format32bppArgb)) {
                    // ---- pass 4: scale by HEIGHT, bottom-align, center ----
                    int targetH; double k; int targetW;
                    if (forcedScale > 0) {
                        // attack pose: inherit the idle pose's factor verbatim
                        k = forcedScale;
                        targetH = (int)Math.Round(ch * k);
                        targetW = (int)Math.Round(cw * k);
                        if (targetH > canvas || targetW > canvas) {
                            double fit = Math.Min((double)canvas / ch, (double)canvas / cw);
                            k = fit;
                            targetH = (int)Math.Round(ch * k);
                            targetW = (int)Math.Round(cw * k);
                        }
                    } else {
                        targetH = (int)Math.Round(canvas * targetScale);
                        k = (double)targetH / ch;
                        targetW = (int)Math.Round(cw * k);
                        if (targetW > canvas) { // never let a wide cape overflow the canvas
                            k = (double)canvas / cw;
                            targetW = canvas;
                            targetH = (int)Math.Round(ch * k);
                        }
                    }
                    LastScale = k;
                    using (Bitmap dst = new Bitmap(canvas, canvas, PixelFormat.Format32bppArgb))
                    using (Graphics gfx = Graphics.FromImage(dst)) {
                        gfx.Clear(Color.Transparent);
                        gfx.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        gfx.PixelOffsetMode  = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                        gfx.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
                        int px = (canvas - targetW) / 2;
                        int py = canvas - targetH;   // bottom aligned: feet touch the canvas floor
                        if (flip) {
                            gfx.TranslateTransform(canvas, 0);
                            gfx.ScaleTransform(-1, 1);
                        }
                        gfx.DrawImage(cropped, new Rectangle(px, py, targetW, targetH));
                        gfx.ResetTransform();
                        dst.Save(outPath, ImageFormat.Png);
                    }
                    return string.Format("bbox={0}x{1} at ({2},{3})  bg={4:F1}%  pockets={5}  haze={6}  flip={7}  k={8:F4}  outH={9}",
                        cw, ch, minX, minY, 100.0 * bgCount / (w * h), pockets, haze, flip, k, targetH);
                }
            }
        }
    }
}
'@

Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing

$srcDir = 'C:\Users\nini9\Downloads'
$tmpDir = 'C:\Users\nini9\AppData\Local\Temp\claude\C--Users-Work\a6595137-aa12-4fcc-9f74-1a12a3164bae\scratchpad\keyed'
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir | Out-Null }

# n    = output name
# src  = preferred source file; falls back to n.png when absent
#        (hero-right.png is the re-generated hero that actually faces the enemy)
# flip = mirror horizontally (these two were generated facing the wrong way)
# s    = height scale on a 512 canvas -> drives the size ladder, slime smallest, demon lord biggest
# flip = mirror horizontally. Now false for everyone: every character has since been
# re-generated already facing the right way. The ghost and the bat used to need
# mirroring (they were drawn facing right), and for the ghost that mirroring was also
# what put its highlight on the wrong side -- both were redrawn natively facing left.
# Leave these false unless a future image genuinely comes out facing the wrong way.
#
# s = height scale on a 512 canvas -> drives the size ladder, slime smallest, demon
#     lord biggest.
#
# mp = minimum connected area (px) for the enclosed-magenta-pocket pass. 150 is the safe
#      default: characters that own violet/magenta-adjacent colours (the hero's hair) throw
#      scattered false positives, and deleting those punches holes through them. A character
#      with NO magenta-family colour of its own can go far lower -- which is the only way to
#      clear narrow slivers like the gaps between a skeleton's ribs.
$jobs = @(
    # 2026-08-25 階梯壓縮:舊的 0.50→1.00 是 2 倍落差,最弱的怪只有魔王一半大,
    # 在畫面上小到看不清細節。改成 0.68→1.00,弱怪明顯放大,強弱順序仍然讀得出來。
    @{ n='hero';   flip=$false; s=0.95; mp=150 },
    @{ n='enemy1'; flip=$false; s=0.68; mp=150 },
    @{ n='enemy2'; flip=$false; s=0.76; mp=150 },
    @{ n='enemy3'; flip=$false; s=0.83; mp=150 },
    # enemy4 is the bone dragon (2026-08-25). mp=3, far below the default 150. At 150 the
    # narrow magenta slivers between its ribs and every hole in its wing membrane survived,
    # leaving 4.8% of the sprite bright magenta; 12 cleared the ribs but left ~400 pinprick
    # holes in the membrane. It is bone-white and dark grey with no magenta-family colour of
    # its own, so there are no false positives to protect and the threshold can go this low.
    @{ n='enemy4'; flip=$false; s=0.89; mp=3 },
    # enemy5 is the black knight (replaced the oni, 2026-08-24). Dropped 0.90 -> 0.85:
    # he is an upright humanoid whose bbox is nearly all body, while the dragon's 0.82
    # bbox is mostly spread wings, so equal numbers read very unequal on screen.
    @{ n='enemy5'; flip=$false; s=0.94; mp=150 },
    # enemy6 is the dark lord (2026-08-25). flip=$true: the "geometric description"
    # prompt finally got his body to turn, but it turned to the RIGHT. Mirroring is
    # free and his armour is lit near-symmetrically, so nothing is lost -- see the
    # PROMPTS.md note on the geometric-description method.
    @{ n='enemy6'; flip=$true;  s=1.00; mp=150 }
)

$scaleOf = @{}   # idle-pose scale factor, reused by that character's attack pose

$flipOf = @{}    # remembered so the attack pose mirrors the same way as its idle pose

foreach ($j in $jobs) {
    $inP  = Join-Path $srcDir  ($j.n + '.png')
    $outP = Join-Path $tmpDir  ($j.n + '.png')
    $res = [Keyer]::Process($inP, $outP, $j.flip, $j.s, 512, 0, $j.mp)
    $scaleOf[$j.n] = [Keyer]::LastScale
    $flipOf[$j.n] = $j.flip
    Write-Output ("{0,-8} {1}" -f $j.n, $res)
}

# Attack poses: only processed when the file exists, and always locked to the
# matching idle pose's scale factor so the character does not change size mid-swing.
foreach ($j in $jobs) {
    $atkSrc = Join-Path $srcDir ($j.n + '-atk.png')
    if (-not (Test-Path $atkSrc)) { continue }
    $outP = Join-Path $tmpDir ($j.n + '-atk.png')
    $res = [Keyer]::Process($atkSrc, $outP, $flipOf[$j.n], $j.s, 512, $scaleOf[$j.n], $j.mp)
    Write-Output ("{0,-7} <- {1,-15} {2}" -f ($j.n + '-atk'), ($j.n + '-atk.png'), $res)
}
