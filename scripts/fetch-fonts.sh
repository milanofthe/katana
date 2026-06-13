#!/usr/bin/env bash
# Fetch the bundled overlay fonts (TTF) used by text overlays.
#
# Preview (WebView) renders these via @font-face (static/fonts), and the FFmpeg
# exporter draws the SAME TTF via drawtext, so preview and export match. The
# files are NOT committed (run this once before `tauri dev` / `tauri build`).
#
# Source: the Google Fonts repo (all five are OFL-licensed). Variable TTFs ship
# their default instance to drawtext; Archivo Black is a single heavy weight.
#
# This mirrors scripts/fetch-fonts.ps1 (the Windows equivalent).
set -euo pipefail

base='https://raw.githubusercontent.com/google/fonts/main'
# "url_path output_filename" (output must match lib/text/fonts.ts `file`).
fonts=(
  "ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf PlusJakartaSans.ttf"
  "ofl/inter/Inter%5Bopsz,wght%5D.ttf Inter.ttf"
  "ofl/archivoblack/ArchivoBlack-Regular.ttf ArchivoBlack.ttf"
  "ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf PlayfairDisplay.ttf"
  "ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf JetBrainsMono.ttf"
)

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out_dir="$script_dir/../static/fonts"
mkdir -p "$out_dir"

for entry in "${fonts[@]}"; do
  url_path="${entry%% *}"
  out_name="${entry##* }"
  echo "Downloading $out_name ..."
  curl -fL "$base/$url_path" -o "$out_dir/$out_name"
done

echo "Done. Fonts placed in $out_dir"
