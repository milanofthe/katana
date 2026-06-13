// Thumbnail extraction via the bundled ffmpeg sidecar. Pulls evenly spaced
// frames as JPEGs (off the UI thread, no canvas/CORS issues) and returns them as
// base64 data URLs the timeline filmstrip can use directly.
//
// Frames are written to temp files and read back with std::fs: piping binary
// JPEG through the shell plugin's stdout is NOT binary-safe and corrupts the
// image (block artefacts).
use base64::{engine::general_purpose::STANDARD, Engine};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Extract `count` frames spread across `duration`, each scaled to `width`.
#[tauri::command]
pub async fn extract_thumbnails(
	app: AppHandle,
	path: String,
	count: u32,
	width: u32,
	duration: f64,
) -> Result<Vec<String>, String> {
	let count = count.max(1);

	let stamp = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| d.as_nanos())
		.unwrap_or(0);
	let dir = std::env::temp_dir();
	// Numbered output sequence (ffmpeg starts the counter at 1).
	let pattern = dir.join(format!("katana-thumb-{stamp}-%04d.jpg"));
	let pattern_str = pattern.to_string_lossy().to_string();

	// One ffmpeg spawn for the whole strip: the fps filter samples `count` evenly
	// spaced frames in a single decode pass. Spawning once (vs once per frame)
	// keeps dense strips cheap enough that scrubbing tracks the pointer smoothly.
	let fps = if duration > 0.0 {
		count as f64 / duration
	} else {
		1.0
	};
	let cmd = app
		.shell()
		.sidecar("ffmpeg")
		.map_err(|e| format!("Bundled ffmpeg not found: {e}"))?;
	let out = cmd
		.args([
			"-y",
			"-i",
			&path,
			"-vf",
			&format!("fps={fps:.6},scale={width}:-2:flags=bilinear,format=yuvj420p"),
			"-frames:v",
			&count.to_string(),
			"-q:v",
			"4",
			&pattern_str,
		])
		.output()
		.await
		.map_err(|e| format!("ffmpeg failed: {e}"))?;

	let mut frames: Vec<String> = Vec::with_capacity(count as usize);
	if out.status.success() {
		for i in 1..=count {
			let out_path = dir.join(format!("katana-thumb-{stamp}-{i:04}.jpg"));
			if let Ok(bytes) = std::fs::read(&out_path) {
				if !bytes.is_empty() {
					frames.push(format!("data:image/jpeg;base64,{}", STANDARD.encode(&bytes)));
				}
			}
			let _ = std::fs::remove_file(&out_path);
		}
	}

	Ok(frames)
}
