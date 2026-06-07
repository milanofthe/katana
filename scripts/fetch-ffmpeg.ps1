# Fetch FFmpeg + ffprobe and place them as Tauri sidecars.
#
# Katana invokes ffmpeg/ffprobe as separate processes. For a self-contained
# bundle they are shipped as sidecars (src-tauri/binaries/<name>-<triple>.exe).
# The binaries are NOT committed (large, and GitHub blocks files > 100 MB) — run
# this script once before `tauri build` / `tauri dev`.
#
# Uses the BtbN GPL static build (includes x264/x265/vp9/opus). That binary is
# GPL; Katana itself stays MIT (FFmpeg runs as a separate process). See NOTICE.
$ErrorActionPreference = 'Stop'

# Windows target only for now (the URL is win64-specific).
$triple = 'x86_64-pc-windows-msvc'
$url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

$binDir = Join-Path $PSScriptRoot '..\src-tauri\binaries'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$tmp = Join-Path $env:TEMP 'katana-ffmpeg'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$zip = Join-Path $tmp 'ffmpeg.zip'

Write-Host "Downloading FFmpeg (GPL static) ..."
Invoke-WebRequest -Uri $url -OutFile $zip

Write-Host "Extracting ..."
Expand-Archive -Path $zip -DestinationPath $tmp -Force

$ffmpeg = Get-ChildItem -Path $tmp -Recurse -Filter ffmpeg.exe | Select-Object -First 1
$ffprobe = Get-ChildItem -Path $tmp -Recurse -Filter ffprobe.exe | Select-Object -First 1
if (-not $ffmpeg -or -not $ffprobe) { throw "ffmpeg.exe / ffprobe.exe not found in archive" }

Copy-Item $ffmpeg.FullName (Join-Path $binDir "ffmpeg-$triple.exe") -Force
Copy-Item $ffprobe.FullName (Join-Path $binDir "ffprobe-$triple.exe") -Force

Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Done. Sidecars placed in $binDir"
