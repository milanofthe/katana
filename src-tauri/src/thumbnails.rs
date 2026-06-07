// Thumbnail extraction via the bundled ffmpeg sidecar. Pulls evenly spaced
// frames as JPEGs (off the UI thread, no canvas/CORS issues) and returns them as
// base64 data URLs the timeline filmstrip can use directly.
use base64::{engine::general_purpose::STANDARD, Engine};
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

	for i in 0..count {
		let t = if duration > 0.0 {
			((i as f64 + 0.5) / count as f64) * duration
		} else {
			0.0
		};
		let cmd = app
			.shell()
			.sidecar("ffmpeg")
			.map_err(|e| format!("Bundled ffmpeg not found: {e}"))?;
		// Fast keyframe seek before input, one frame out, scaled, as a JPEG on stdout.
		let out = cmd
			.args([
				"-ss",
				&format!("{t:.3}"),
				"-i",
				&path,
				"-frames:v",
				"1",
				"-vf",
				&format!("scale={width}:-2"),
				"-q:v",
				"4",
				"-f",
				"image2pipe",
				"-vcodec",
				"mjpeg",
				"-",
			])
			.output()
			.await
			.map_err(|e| format!("ffmpeg failed: {e}"))?;

		if out.status.success() && !out.stdout.is_empty() {
			frames.push(format!("data:image/jpeg;base64,{}", STANDARD.encode(&out.stdout)));
		}
	}

	Ok(frames)
}
