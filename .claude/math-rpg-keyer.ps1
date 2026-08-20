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
        return (h >= 288 && h <= 330 && s >= 0.55 && v >= 0.30);
    }

    public static string Process(string inPath, string outPath, bool flip, double targetScale, int canvas) {
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
            int pockets = 0;
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int idx = y * w + x;
                    if (isBg[idx]) continue;
                    int o = y * stride + x * 4;
                    if (IsStrictBg(buf[o+2], buf[o+1], buf[o])) { isBg[idx] = true; pockets++; }
                }
            }

            // ---- pass 2: alpha + despill on the fringe ----
            byte[] outBuf = new byte[stride * h];
            int bgCount = 0;
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
                    int targetH = (int)Math.Round(canvas * targetScale);
                    double k = (double)targetH / ch;
                    int targetW = (int)Math.Round(cw * k);
                    if (targetW > canvas) { // never let a wide cape overflow the canvas
                        k = (double)canvas / cw;
                        targetW = canvas;
                        targetH = (int)Math.Round(ch * k);
                    }
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
                    return string.Format("bbox={0}x{1} at ({2},{3})  bg={4:F1}%  pockets={5}  flip={6}  outH={7}",
                        cw, ch, minX, minY, 100.0 * bgCount / (w * h), pockets, flip, (int)Math.Round(canvas * targetScale));
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

# name, flip, height-scale (drives the size ladder: slime smallest -> demon lord biggest)
$jobs = @(
    @{ n='hero';   flip=$false; s=0.95 },
    @{ n='enemy1'; flip=$false; s=0.50 },
    @{ n='enemy2'; flip=$true;  s=0.62 },
    @{ n='enemy3'; flip=$true;  s=0.72 },
    @{ n='enemy4'; flip=$false; s=0.82 },
    @{ n='enemy5'; flip=$false; s=0.90 },
    @{ n='enemy6'; flip=$false; s=1.00 }
)

foreach ($j in $jobs) {
    $inP  = Join-Path $srcDir  ($j.n + '.png')
    $outP = Join-Path $tmpDir  ($j.n + '.png')
    $res = [Keyer]::Process($inP, $outP, $j.flip, $j.s, 512)
    Write-Output ("{0,-7} {1}" -f $j.n, $res)
}
