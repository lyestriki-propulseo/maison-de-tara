# ============================================================================
# Maison de Tara — Preview local
# ----------------------------------------------------------------------------
# Lance un mini serveur HTTP statique et ouvre le navigateur sur le mockup V1.
# Usage : clic droit sur preview.ps1 -> "Exécuter avec PowerShell"
#         ou en ligne : pwsh .\preview.ps1
#         ou avec un port custom : pwsh .\preview.ps1 -port 9000
# Stop : Ctrl+C dans le terminal.
# ============================================================================

param(
  [int]$port = 8000
)

$root = $PSScriptRoot
$prefix = "http://localhost:$port/"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
}
catch {
  Write-Host "Impossible de demarrer le serveur sur le port $port." -ForegroundColor Red
  Write-Host "Essaie un autre port : .\preview.ps1 -port 9000" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "  Maison de Tara - V1 mockup" -ForegroundColor Green
Write-Host "  --------------------------------" -ForegroundColor DarkGray
Write-Host "  Serveur : $prefix"
Write-Host "  Dossier : $root"
Write-Host "  Stop    : Ctrl+C"
Write-Host ""

# Auto-ouverture du navigateur
Start-Process $prefix

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.json' = 'application/json; charset=utf-8'
  '.md'   = 'text/markdown; charset=utf-8'
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = [System.Uri]::UnescapeDataString($req.Url.LocalPath)
    if ([string]::IsNullOrEmpty($path) -or $path -eq '/') {
      $path = '/index.html'
    }

    $file = Join-Path $root $path.TrimStart('/').Replace('/', '\')

    Write-Host ("  {0,-6} {1}" -f $req.HttpMethod, $path) -ForegroundColor DarkGray

    if (Test-Path $file -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')

      $bytes = [IO.File]::ReadAllBytes($file)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    else {
      $res.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("404 - Fichier non trouve : $path")
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.ContentLength64 = $msg.Length
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }

    $res.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
  Write-Host ""
  Write-Host "  Serveur arrete." -ForegroundColor Yellow
}
