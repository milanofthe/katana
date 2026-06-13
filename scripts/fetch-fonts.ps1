# Fetch the bundled overlay fonts (TTF) used by text overlays.
#
# Preview (WebView) renders these via @font-face (static/fonts), and the FFmpeg
# exporter draws the SAME TTF via drawtext, so preview and export match. The
# files are NOT committed (run this once before `tauri dev` / `tauri build`).
#
# Source: the Google Fonts repo (all five are OFL-licensed). Variable TTFs ship
# their default instance to drawtext; Archivo Black is a single heavy weight.
$ErrorActionPreference = 'Stop'

$base = 'https://raw.githubusercontent.com/google/fonts/main'
# id => [url path, output filename] (must match lib/text/fonts.ts `file`).
$fonts = @(
	@('ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf', 'PlusJakartaSans.ttf'),
	@('ofl/inter/Inter%5Bopsz,wght%5D.ttf', 'Inter.ttf'),
	@('ofl/archivoblack/ArchivoBlack-Regular.ttf', 'ArchivoBlack.ttf'),
	@('ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf', 'PlayfairDisplay.ttf'),
	@('ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf', 'JetBrainsMono.ttf')
)

$outDir = Join-Path $PSScriptRoot '..\static\fonts'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

foreach ($f in $fonts) {
	$url = "$base/$($f[0])"
	$out = Join-Path $outDir $f[1]
	Write-Host "Downloading $($f[1]) ..."
	Invoke-WebRequest -Uri $url -OutFile $out
}

Write-Host "Done. Fonts placed in $outDir"
