#!/usr/bin/env bash
# Fetch FFmpeg + ffprobe and place them as Tauri sidecars (Linux).
#
# Katana invokes ffmpeg/ffprobe as separate processes. For a self-contained
# bundle they are shipped as sidecars (src-tauri/binaries/<name>-<triple>).
# The binaries are NOT committed (large, and GitHub blocks files > 100 MB) — run
# this script once before `tauri build` / `tauri dev` on Linux.
#
# Uses the BtbN GPL static build (includes x264/x265/vp9/opus). That binary is
# GPL; Katana itself stays MIT (FFmpeg runs as a separate process). See NOTICE.
#
# This mirrors scripts/fetch-ffmpeg.ps1 (the Windows equivalent).
set -euo pipefail

# Linux x86_64 target only (the URL is linux64-specific).
triple='x86_64-unknown-linux-gnu'
url='https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz'

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bin_dir="$script_dir/../src-tauri/binaries"
mkdir -p "$bin_dir"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
tarball="$tmp/ffmpeg.tar.xz"

echo "Downloading FFmpeg (GPL static) ..."
curl -fL "$url" -o "$tarball"

echo "Extracting ..."
tar -xf "$tarball" -C "$tmp"

ffmpeg="$(find "$tmp" -type f -name ffmpeg | head -n1)"
ffprobe="$(find "$tmp" -type f -name ffprobe | head -n1)"
if [[ -z "$ffmpeg" || -z "$ffprobe" ]]; then
  echo "ffmpeg / ffprobe not found in archive" >&2
  exit 1
fi

install -m 0755 "$ffmpeg" "$bin_dir/ffmpeg-$triple"
install -m 0755 "$ffprobe" "$bin_dir/ffprobe-$triple"

echo "Done. Sidecars placed in $bin_dir"
