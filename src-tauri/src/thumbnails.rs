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
	let mut frames: Vec<String> = Vec::with_capacity(count as usize);

	let stamp = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| d.as_nanos())
		.unwrap_or(0);
	let dir = std::env::temp_dir();

	for i in 0..count {
		let t = if duration > 0.0 {
			((i as f64 + 0.5) / count as f64) * duration
		} else {
			0.0
		};
		let out_path = dir.join(format!("katana-thumb-{stamp}-{i}.jpg"));
		let out_str = out_path.to_string_lossy().to_string();

		let cmd = app
			.shell()
			.sidecar("ffmpeg")
			.map_err(|e| format!("Bundled ffmpeg not found: {e}"))?;
		// Fast keyframe seek before input, one frame out, scaled, written to a file.
		let out = cmd
			.args([
				"-y",
				"-ss",
				&format!("{t:.3}"),
				"-i",
				&path,
				"-frames:v",
				"1",
				"-vf",
				&format!("scale={width}:-2:flags=bilinear,format=yuvj420p"),
				"-q:v",
				"4",
				&out_str,
			])
			.output()
			.await
			.map_err(|e| format!("ffmpeg failed: {e}"))?;

		if out.status.success() {
			if let Ok(bytes) = std::fs::read(&out_path) {
				if !bytes.is_empty() {
					frames.push(format!("data:image/jpeg;base64,{}", STANDARD.encode(&bytes)));
				}
			}
		}
		let _ = std::fs::remove_file(&out_path);
	}

	Ok(frames)
}
