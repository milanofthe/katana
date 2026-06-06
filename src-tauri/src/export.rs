// Export pipeline: turn the timeline EDL into a single FFmpeg filter_complex
// invocation (trim + concat + speed + volume/mute + fade + output format) and
// run it, streaming progress back to the UI. Uses ffmpeg/ffprobe from PATH.
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportClip {
	path: String,
	in_point: f64,
	out_point: f64,
	speed: f64,
	volume: f64,
	muted: bool,
	fade_in: f64,
	fade_out: f64,
}

impl ExportClip {
	fn source_span(&self) -> f64 {
		(self.out_point - self.in_point).max(0.01)
	}
	fn timeline_dur(&self) -> f64 {
		self.source_span() / self.speed.max(0.01)
	}
}

fn format_dims(format: &str) -> Option<(u32, u32)> {
	match format {
		"16:9" => Some((1920, 1080)),
		"9:16" => Some((1080, 1920)),
		"1:1" => Some((1080, 1080)),
		_ => None,
	}
}

/// atempo only accepts 0.5..2.0 per stage, so chain stages for extreme speeds.
fn atempo_chain(speed: f64) -> String {
	let mut parts: Vec<String> = Vec::new();
	let mut s = speed;
	while s > 2.0 {
		parts.push("atempo=2.0".into());
		s /= 2.0;
	}
	while s < 0.5 {
		parts.push("atempo=0.5".into());
		s *= 2.0;
	}
	parts.push(format!("atempo={s:.4}"));
	parts.join(",")
}

/// Does this media file carry at least one audio stream?
fn has_audio(path: &str) -> bool {
	Command::new("ffprobe")
		.args([
			"-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of",
			"csv=p=0", path,
		])
		.output()
		.map(|o| !o.stdout.is_empty())
		.unwrap_or(false)
}

/// Build the ffmpeg argument vector. Returns (args, total_output_seconds).
fn build_args(clips: &[ExportClip], format: &str, output: &str) -> Result<(Vec<String>, f64), String> {
	if clips.is_empty() {
		return Err("Nothing to export: the timeline is empty.".into());
	}
	let dims = format_dims(format);
	let total: f64 = clips.iter().map(|c| c.timeline_dur()).sum();

	let mut args: Vec<String> = vec!["-y".into()];

	// Trimmed video inputs (indices 0..N).
	for c in clips {
		args.push("-ss".into());
		args.push(format!("{:.6}", c.in_point));
		args.push("-t".into());
		args.push(format!("{:.6}", c.source_span()));
		args.push("-i".into());
		args.push(c.path.clone());
	}

	// For clips without audio, append a silent source; remember which input
	// index supplies each clip's audio.
	let mut audio_input: Vec<usize> = Vec::with_capacity(clips.len());
	let mut next_input = clips.len();
	for (i, c) in clips.iter().enumerate() {
		if has_audio(&c.path) {
			audio_input.push(i);
		} else {
			args.push("-f".into());
			args.push("lavfi".into());
			args.push("-t".into());
			args.push(format!("{:.6}", c.timeline_dur()));
			args.push("-i".into());
			args.push("anullsrc=channel_layout=stereo:sample_rate=44100".into());
			audio_input.push(next_input);
			next_input += 1;
		}
	}

	// Per-clip chains, then concat.
	let mut filter = String::new();
	let mut concat_inputs = String::new();
	for (i, c) in clips.iter().enumerate() {
		let speed = c.speed.max(0.01);

		// Video: reset PTS, apply speed, optionally scale+pad to format.
		filter.push_str(&format!("[{i}:v]setpts=(PTS-STARTPTS)/{speed:.6}"));
		if let Some((w, h)) = dims {
			filter.push_str(&format!(
				",scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
			));
		}
		filter.push_str(&format!("[v{i}];"));

		// Audio: from the real stream (speed/volume/fade) or the silent source.
		let ai = audio_input[i];
		if ai == i {
			let vol = if c.muted { 0.0 } else { c.volume };
			filter.push_str(&format!(
				"[{ai}:a]asetpts=PTS-STARTPTS,{},volume={vol:.4}",
				atempo_chain(speed)
			));
			if c.fade_in > 0.0 {
				filter.push_str(&format!(",afade=t=in:st=0:d={:.4}", c.fade_in));
			}
			if c.fade_out > 0.0 {
				let st = (c.timeline_dur() - c.fade_out).max(0.0);
				filter.push_str(&format!(",afade=t=out:st={st:.4}:d={:.4}", c.fade_out));
			}
			filter.push_str(&format!("[a{i}];"));
		} else {
			// Silent track already has the right duration.
			filter.push_str(&format!("[{ai}:a]asetpts=PTS-STARTPTS[a{i}];"));
		}

		concat_inputs.push_str(&format!("[v{i}][a{i}]"));
	}
	filter.push_str(&format!(
		"{concat_inputs}concat=n={}:v=1:a=1[outv][outa]",
		clips.len()
	));

	args.push("-filter_complex".into());
	args.push(filter);
	args.extend(
		[
			"-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "veryfast", "-crf",
			"20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
			// Machine-readable progress on stdout.
			"-progress", "pipe:1", "-nostats",
		]
		.iter()
		.map(|s| s.to_string()),
	);
	args.push(output.to_string());
	Ok((args, total))
}

/// Render the timeline to a single output file, emitting `export:progress`
/// (0..1) as it runs.
#[tauri::command]
pub async fn export_video(
	app: AppHandle,
	clips: Vec<ExportClip>,
	format: String,
	output: String,
) -> Result<(), String> {
	tokio::task::spawn_blocking(move || run_ffmpeg(app, &clips, &format, &output))
		.await
		.map_err(|e| e.to_string())?
}

fn run_ffmpeg(app: AppHandle, clips: &[ExportClip], format: &str, output: &str) -> Result<(), String> {
	let (args, total) = build_args(clips, format, output)?;

	let mut child = Command::new("ffmpeg")
		.args(&args)
		.stdout(Stdio::piped())
		.stderr(Stdio::piped())
		.spawn()
		.map_err(|e| format!("Could not run ffmpeg (is it installed / on PATH?): {e}"))?;

	// Drain stderr on a separate thread so the pipe never blocks ffmpeg.
	let stderr = child.stderr.take();
	let stderr_handle = std::thread::spawn(move || {
		let mut buf = String::new();
		if let Some(mut s) = stderr {
			let _ = s.read_to_string(&mut buf);
		}
		buf
	});

	// Parse progress from stdout.
	if let Some(stdout) = child.stdout.take() {
		for line in BufReader::new(stdout).lines().map_while(Result::ok) {
			if let Some(v) = line.strip_prefix("out_time_us=") {
				if let Ok(us) = v.trim().parse::<f64>() {
					emit_progress(&app, us / 1_000_000.0, total);
				}
			} else if let Some(v) = line.strip_prefix("out_time_ms=") {
				// Some builds report microseconds under this key; treat as us.
				if let Ok(us) = v.trim().parse::<f64>() {
					emit_progress(&app, us / 1_000_000.0, total);
				}
			}
		}
	}

	let status = child.wait().map_err(|e| e.to_string())?;
	let stderr_text = stderr_handle.join().unwrap_or_default();
	if status.success() {
		let _ = app.emit("export:progress", 1.0_f64);
		Ok(())
	} else {
		let tail: Vec<&str> = stderr_text.lines().rev().take(6).collect();
		let msg: String = tail.into_iter().rev().collect::<Vec<_>>().join("\n");
		Err(format!("ffmpeg failed:\n{msg}"))
	}
}

fn emit_progress(app: &AppHandle, seconds: f64, total: f64) {
	let pct = if total > 0.0 { (seconds / total).clamp(0.0, 1.0) } else { 0.0 };
	let _ = app.emit("export:progress", pct);
}
