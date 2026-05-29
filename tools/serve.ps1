# Petit serveur statique sans dependance (HttpListener .NET)
# Usage: pwsh tools/serve.ps1   ->   http://localhost:8000/
$root = (Resolve-Path "$PSScriptRoot\..").Path
$port = 8000
$mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png';
  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif';
  '.webp'='image/webp'; '.ico'='image/x-icon'; '.woff'='font/woff';
  '.woff2'='font/woff2'; '.ttf'='font/ttf'; '.mp4'='video/mp4'; '.webm'='video/webm'
}
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serveur lance sur http://localhost:$port/ (racine: $root)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
  $path = Join-Path $root $rel
  if ((Test-Path $path) -and -not (Get-Item $path).PSIsContainer) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    $ctx.Response.ContentType = $mime[$ext] ?? 'application/octet-stream'
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - $rel introuvable")
    $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
  }
  $ctx.Response.OutputStream.Close()
}
