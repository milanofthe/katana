# Third-party notices

Katana is licensed under the MIT License (see `LICENSE`).

## FFmpeg

Katana invokes **FFmpeg** (`ffmpeg`, `ffprobe`) as separate, bundled executables
to decode, composite and encode video. These binaries are **not** part of
Katana's source and are not linked into the application; Katana only runs them as
external processes.

The distributed binaries are built from FFmpeg and are licensed under the
**GNU General Public License v3 (GPLv3)** because they include GPL components
(e.g. x264 / x265). A copy of that license and the corresponding source are
available from the build provider:

- FFmpeg project: https://ffmpeg.org
- Binary builds: https://github.com/BtbN/FFmpeg-Builds

The bundled FFmpeg executables may be replaced with a compatible FFmpeg build of
your choice. They are fetched, not committed to this repository, via
`scripts/fetch-ffmpeg.ps1`.
