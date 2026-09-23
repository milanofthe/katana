// Derived media via the bundled ffmpeg sidecar: filmstrip thumbnails and the
// decoded audio track behind waveforms and scrub grains. Both run in ffmpeg (off
// the UI thread) so the WebView never has to load or decode a source file.
//
// Outputs are written to temp files and read back with std::fs: piping binary
// data through the shell plugin's stdout is NOT binary-safe and corrupts it.
use base64::{engine::general_purpose::STANDARD, Engine};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::ipc::Response;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Unique temp-file stem for one extraction run.
fn temp_stem(kind: &str) -> PathBuf {
	let stamp = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| d.as_nanos())
		.unwrap_or(0);
	std::env::temp_dir().join(format!("katana-{kind}-{stamp}"))
}

/// Run the ffmpeg sidecar to completion; Ok only on a clean exit.
async fn ffmpeg(app: &AppHandle, args: &[&str]) -> Result<(), String> {
	let out = app
		.shell()
		.sidecar("ffmpeg")
		.map_err(|e| format!("Bundled ffmpeg not found: {e}"))?
		.args(args)
		.output()
		.await
		.map_err(|e| format!("ffmpeg failed: {e}"))?;
	if out.status.success() {
		Ok(())
	} else {
		Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
	}
}

/// Extract `count` frames spread across `duration`, each scaled to `width`,
/// as base64 JPEG data URLs the timeline filmstrip can use directly.
#[tauri::command]
pub async fn extract_thumbnails(
	app: AppHandle,
	path: String,
	count: u32,
	width: u32,
	duration: f64,
) -> Result<Vec<String>, String> {
	let count = count.max(1);
	let stem = temp_stem("thumb");
	// Numbered output sequence (ffmpeg starts the counter at 1).
	let pattern = format!("{}-%04d.jpg", stem.display());
	let fps = if duration > 0.0 { count as f64 / duration } else { 1.0 };
	let filter = format!("fps={fps:.6},scale={width}:-2:flags=bilinear,format=yuvj420p");
	let count_str = count.to_string();

	// One spawn for the whole strip; the fps filter samples `count` evenly spaced
	// frames. The first pass decodes keyframes only, which is far cheaper than a
	// full decode on long or high-resolution sources. Sources with too few
	// keyframes to fill the strip fall back to decoding every frame.
	let mut frames: Vec<String> = Vec::new();
	for skip in [&["-skip_frame", "nokey"][..], &[]] {
		let mut args = skip.to_vec();
		args.extend(["-y", "-i", path.as_str(), "-an", "-sn", "-dn", "-vf", filter.as_str()]);
		args.extend(["-frames:v", count_str.as_str(), "-q:v", "4", pattern.as_str()]);
		let ok = ffmpeg(&app, &args).await.is_ok();

		frames.clear();
		for i in 1..=count {
			let out_path = format!("{}-{i:04}.jpg", stem.display());
			if let Ok(bytes) = std::fs::read(&out_path) {
				if ok && !bytes.is_empty() {
					frames.push(format!("data:image/jpeg;base64,{}", STANDARD.encode(&bytes)));
				}
			}
			let _ = std::fs::remove_file(&out_path);
		}
		if frames.len() * 2 >= count as usize {
			break;
		}
	}

	Ok(frames)
}

/// Decode a source's audio to mono 16-bit PCM at `sample_rate` and return the
/// raw little-endian samples (binary IPC, no JSON). Errors if there is no audio.
#[tauri::command]
pub async fn extract_audio(app: AppHandle, path: String, sample_rate: u32) -> Result<Response, String> {
	let out_path = temp_stem("audio").with_extension("pcm");
	let out_str = out_path.to_string_lossy().to_string();
	let rate = sample_rate.to_string();
	let result = ffmpeg(
		&app,
		&[
			"-v", "error", "-y", "-i", &path, "-vn", "-sn", "-dn", "-ac", "1", "-ar", &rate, "-f",
			"s16le", &out_str,
		],
	)
	.await
	.and_then(|()| std::fs::read(&out_path).map_err(|e| e.to_string()));
	let _ = std::fs::remove_file(&out_path);
	Ok(Response::new(result?))
}
