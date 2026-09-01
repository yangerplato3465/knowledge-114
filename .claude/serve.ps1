# Static dev server for knowledge-114.
#
# NOTE: comments are kept ASCII-only on purpose. Windows PowerShell 5.1 reads
# .ps1 files as ANSI unless they carry a UTF-8 BOM, so non-ASCII comments here
# would turn into mojibake and can break parsing.
#
# Why this is multi-threaded: the previous version served each request on the
# single accept loop with a blocking write. assets/audio/music.mp3 is ~10 MB and
# the page loads it with <audio preload="auto">. When autoplay is blocked the
# browser stops reading the body, the blocking write never returns, and the whole
# server wedges - every later request just times out. Handling each request on a
# runspace pool thread (plus Range support and a write timeout) fixes that.

$Root = "C:\Users\nini9\Work\knowledge-114"
$Port = 8080

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8"
  ".css"="text/css; charset=utf-8";   ".js"="application/javascript; charset=utf-8"
  ".json"="application/json; charset=utf-8"; ".png"="image/png"
  ".jpg"="image/jpeg";  ".jpeg"="image/jpeg"; ".gif"="image/gif"
  ".webp"="image/webp"; ".svg"="image/svg+xml"; ".ico"="image/x-icon"
  ".mp3"="audio/mpeg";  ".wav"="audio/wav";  ".mp4"="video/mp4"
  ".woff"="font/woff";  ".woff2"="font/woff2"; ".ttf"="font/ttf"
  ".txt"="text/plain; charset=utf-8"
}

# Handles one request. Runs on a pool thread, so a stalled client only ever
# blocks its own thread.
$handler = {
  param($ctx, $Root, $mime)

  $res = $ctx.Response
  try {
    $req = $ctx.Request
    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Cache-Control", "no-cache")

    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
    $full = Join-Path $Root $path
    if ((Test-Path $full) -and ((Get-Item $full) -is [System.IO.DirectoryInfo])) {
      $full = Join-Path $full "index.html"
    }

    # Keep requests inside the web root.
    $rootFull = [System.IO.Path]::GetFullPath($Root)
    $fileFull = [System.IO.Path]::GetFullPath($full)
    if (-not $fileFull.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $res.Close()
      return
    }

    if (-not (Test-Path $fileFull -PathType Leaf)) {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $res.ContentType = "text/plain; charset=utf-8"
      $res.ContentLength64 = $msg.Length
      $res.OutputStream.Write($msg, 0, $msg.Length)
      $res.Close()
      return
    }

    $ext = [System.IO.Path]::GetExtension($fileFull).ToLower()
    if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] }

    # Conditional requests. "no-cache" means "revalidate before reusing", not
    # "don't cache" -- but with no validator there was nothing to revalidate
    # against, so every hit re-sent the entire body. math-rpg was re-downloading
    # its stage and enemy art on every level change (74KB for enemy4 alone).
    # An ETag lets an unchanged file answer 304 with no body, while an edited
    # file is still picked up instantly because its mtime/size change the tag.
    $fi = Get-Item $fileFull
    $etag = '"{0:x}-{1:x}"' -f $fi.LastWriteTimeUtc.Ticks, $fi.Length
    $res.Headers.Add("ETag", $etag)
    $res.Headers.Add("Last-Modified", $fi.LastWriteTimeUtc.ToString("R"))
    if ($req.Headers["If-None-Match"] -eq $etag) {
      $res.StatusCode = 304
      $res.Close()
      return
    }

    $fs = [System.IO.File]::OpenRead($fileFull)
    try {
      $total = $fs.Length
      $start = [int64]0
      $end   = $total - 1

      # Range support - audio/video seeking needs it, and the browser uses it
      # for large media instead of pulling the whole file.
      $range = $req.Headers["Range"]
      if ($range -and ($range -match 'bytes=(\d*)-(\d*)')) {
        if ($matches[1] -ne '') { $start = [int64]$matches[1] }
        if ($matches[2] -ne '') { $end   = [int64]$matches[2] }
        if ($end -gt ($total - 1)) { $end = $total - 1 }
        if ($start -gt $end) { $start = [int64]0; $end = $total - 1 }
        $res.StatusCode = 206
        $res.Headers.Add("Content-Range", "bytes $start-$end/$total")
      }
      $res.Headers.Add("Accept-Ranges", "bytes")

      $len = $end - $start + 1
      $res.ContentLength64 = $len

      # Do not let a client that stopped reading hold this thread forever.
      # 6s, not 20s. This is how long a runspace stays hostage to a client that
      # stopped reading. Nothing legitimate on localhost needs 20 seconds to
      # accept the next 64 KB, and a shorter timeout means a burst of abandoned
      # downloads clears in seconds instead of blocking the pool for a third of
      # a minute.
      try { $res.OutputStream.WriteTimeout = 6000 } catch { }

      $fs.Position = $start
      $buf = New-Object byte[] 65536
      $left = $len
      while ($left -gt 0) {
        $want = [int][System.Math]::Min([int64]$buf.Length, $left)
        $n = $fs.Read($buf, 0, $want)
        if ($n -le 0) { break }
        $res.OutputStream.Write($buf, 0, $n)
        $left -= $n
      }
    } finally {
      $fs.Dispose()
    }
  } catch {
    # A client hanging up mid-download (paused audio, reloaded tab) is normal.
    # Swallow it so one aborted transfer never takes the server down.
  } finally {
    try { $res.Close() } catch { }
  }
}

# Preflight: refuse to start a second copy.
#
# HttpListener registers the prefix with http.sys machine-wide, so a second
# instance dies on Start() with "conflicts with an existing registration".
# Before this check that left a stray PowerShell window behind every time,
# which looked like the server "restarting" when in fact the original one was
# still serving the whole time. 2026-08-31: five such windows piled up in one
# session because a slow response was misread as "the server is down".
#
# If you actually want a fresh one, stop the old process first:
#   Get-Process powershell | Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-1) }
try {
  $probe = [System.Net.WebRequest]::Create("http://localhost:$Port/")
  $probe.Method = "HEAD"
  $probe.Timeout = 1500
  $probe.GetResponse().Close()
  Write-Host "Already serving on http://localhost:$Port/ - nothing to do."
  Write-Host "(A second listener cannot bind the same prefix. Stop the old one first.)"
  return
} catch {
  # Nothing answered, or it answered with an HTTP error - either way the port is
  # free enough for us to try binding it below.
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/  (Ctrl+C to stop)"

# 24, not 8. Each abandoned transfer holds its runspace until the write timeout
# fires, so the pool size is really "how many stalled downloads before the whole
# server stops answering". With music.mp3 at 11 MB and a page reloaded every few
# seconds during development, 8 was reached easily - which reads exactly like the
# server having died. The page now uses preload="none" so this should stay idle,
# but the headroom is nearly free.
$pool = [runspacefactory]::CreateRunspacePool(1, 24)
$pool.Open()
$running = New-Object System.Collections.ArrayList

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()

    $ps = [powershell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($handler).AddArgument($context).AddArgument($Root).AddArgument($mime)
    $job = @{ PS = $ps; Handle = $ps.BeginInvoke() }
    [void]$running.Add($job)

    # Reap finished requests so PowerShell instances do not pile up.
    for ($i = $running.Count - 1; $i -ge 0; $i--) {
      if ($running[$i].Handle.IsCompleted) {
        try { $running[$i].PS.EndInvoke($running[$i].Handle) } catch { }
        $running[$i].PS.Dispose()
        $running.RemoveAt($i)
      }
    }
  } catch {
    # Also append to a file. When the server misbehaves the console window is
    # usually minimised or was started hidden, so whatever it printed is lost -
    # which is why the earlier stalls could never be diagnosed after the fact.
    $line = "$(Get-Date -Format 'HH:mm:ss') $_"
    Write-Host "Error: $line"
    try { Add-Content -Path (Join-Path $PSScriptRoot 'serve.log') -Value $line -Encoding utf8 } catch { }
  }
}
