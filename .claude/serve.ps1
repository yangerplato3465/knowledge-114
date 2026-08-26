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
      try { $res.OutputStream.WriteTimeout = 20000 } catch { }

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

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/  (Ctrl+C to stop)"

$pool = [runspacefactory]::CreateRunspacePool(1, 8)
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
    Write-Host "Error: $_"
  }
}
