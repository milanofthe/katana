<p align="center">
  <img src="static/katana-logo.svg" alt="Katana" width="420" />
</p>

<p align="center"><b>A fast, minimalist video editor.</b></p>

<p align="center">Trim, cut and concatenate clips, the part of the job you'd otherwise open Clipchamp for, without the sluggish UX.</p>

---

## What it is

Katana is a lightweight desktop video editor focused on the everyday cut: import clips, trim and split them, reorder, and export. It's built to feel instant, the heavy lifting is done with native FFmpeg and lossless stream-copy where possible, so a cut is I/O-bound rather than a full re-encode.

## Features

- **Import** via native file dialog or drag-and-drop from the file manager
- **Filmstrip previews** on every clip, aspect-correct frames sampled across the source
- **Playback** with live timecode and a playhead that follows the video
- **Scrubbing** by dragging the ruler
- **Split** at the playhead, **trim** by dragging clip edges, **delete**
- **Reorder** clips by dragging them along the timeline
- **Keyboard-first**: Space to play, arrows to step, `S` to split, and more

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Step playhead ±1s |
| `Shift` + `←` / `→` | Step ±5s |
| `↑` / `↓` | Previous / next clip |
| `Home` / `End` | Jump to start / end |
| `S` | Split at playhead |
| `Delete` / `Backspace` | Delete selected clip |

## Tech stack

- **[Tauri 2](https://tauri.app)** desktop shell (Rust core, ~native window)
- **[SvelteKit](https://svelte.dev)** + **Svelte 5 runes** UI, static SPA
- **Vanilla CSS** with a fully tokenized design system
- **FFmpeg** sidecar for export (stream-copy first)

## Development

Requires Node, Rust and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev     # run the desktop app (Vite on :1420)
npm run check         # type-check
npm run tauri build   # production build
```

## License

[MIT](LICENSE) © Milan Rother.

Bundled fonts (Plus Jakarta Sans, JetBrains Mono) are licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org/) and retain their own license.
