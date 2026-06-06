// Export pipeline: composite the multi-track timeline into one FFmpeg
// filter_complex invocation. Each clip is trimmed, speed-adjusted, scaled by
// its transform, time-shifted to its start and overlaid (z-ordered by track)
// onto a black canvas; audio is delayed and mixed. Progress streams back to the
// UI. Uses ffmpeg/ffprobe from PATH.
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
	/// Absolute start on the master timeline (seconds).
	start: f64,
	/// Z-order lane (higher = composited on top).
	track: i64,
	/// Viewport transform: center offset (normalized) + scale (relative to fit).
	x: f64,
	y: f64,
	scale: f64,
	/// Source aspect ratio (width / height).
	aspect_ratio: f64,
}

impl ExportClip {
	fn source_span(&self) -> f64 {
		(self.out_point - self.in_point).max(0.01)
	}
	fn timeline_dur(&self) -> f64 {
		self.source_span() / self.speed.max(0.01)
	}
	fn timeline_end(&self) -> f64 {
		self.start + self.timeline_dur()
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

/// Round down to the nearest even number (libx264/yuv420p needs even dims).
fn even(v: i64) -> i64 {
	(v - (v % 2)).max(2)
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

/// Probe a clip's pixel dimensions (for the "original" canvas size).
fn probe_dims(path: &str) -> Option<(u32, u32)> {
	let out = Command::new("ffprobe")
		.args([
			"-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of",
			"csv=s=,:p=0", path,
		])
		.output()
		.ok()?;
	let text = String::from_utf8_lossy(&out.stdout);
	let mut it = text.trim().split(',');
	let w: u32 = it.next()?.trim().parse().ok()?;
	let h: u32 = it.next()?.trim().parse().ok()?;
	if w == 0 || h == 0 {
		None
	} else {
		Some((w, h))
	}
}

/// Output canvas size: the chosen format, or the base clip's native size.
fn canvas_dims(clips: &[ExportClip], order: &[usize], format: &str) -> (i64, i64) {
	if let Some((w, h)) = format_dims(format) {
		return (w as i64, h as i64);
	}
	let base = &clips[order[0]];
	let (w, h) = probe_dims(&base.path).unwrap_or((1920, 1080));
	(even(w as i64), even(h as i64))
}

/// Compositing placement of a clip on the canvas: scaled size (even) + overlay
/// offset (may be negative when the clip is panned/zoomed past an edge).
fn placement(cw: i64, ch: i64, c: &ExportClip) -> (i64, i64, i64, i64) {
	let (cwf, chf) = (cw as f64, ch as f64);
	let canvas_ar = cwf / chf;
	let ar = if c.aspect_ratio > 0.0 { c.aspect_ratio } else { canvas_ar };
	// Contain-fit baseline, then the clip's relative scale.
	let (fit_w, fit_h) = if ar > canvas_ar {
		(cwf, cwf / ar)
	} else {
		(chf * ar, chf)
	};
	let dw = even((fit_w * c.scale).round() as i64);
	let dh = even((fit_h * c.scale).round() as i64);
	let cx = cwf / 2.0 + c.x * cwf;
	let cy = chf / 2.0 + c.y * chf;
	let ox = (cx - dw as f64 / 2.0).round() as i64;
	let oy = (cy - dh as f64 / 2.0).round() as i64;
	(dw, dh, ox, oy)
}

/// Build the ffmpeg argument vector. Returns (args, total_output_seconds).
fn build_args(clips: &[ExportClip], format: &str, output: &str) -> Result<(Vec<String>, f64), String> {
	if clips.is_empty() {
		return Err("Nothing to export: the timeline is empty.".into());
	}
	let total: f64 = clips.iter().map(|c| c.timeline_end()).fold(0.0, f64::max);

	// Composite bottom-to-top: lower track first, ties broken by start.
	let mut order: Vec<usize> = (0..clips.len()).collect();
	order.sort_by(|&a, &b| {
		clips[a]
			.track
			.cmp(&clips[b].track)
			.then(clips[a].start.partial_cmp(&clips[b].start).unwrap_or(std::cmp::Ordering::Equal))
	});

	let (cw, ch) = canvas_dims(clips, &order, format);

	let mut args: Vec<String> = vec!["-y".into()];
	// Trimmed inputs (indices 0..N), one per clip.
	for c in clips {
		args.push("-ss".into());
		args.push(format!("{:.6}", c.in_point));
		args.push("-t".into());
		args.push(format!("{:.6}", c.source_span()));
		args.push("-i".into());
		args.push(c.path.clone());
	}

	// Filtergraph assembled as discrete chains, joined by ';'.
	let mut chains: Vec<String> = Vec::new();

	// Black base canvas spanning the whole timeline.
	chains.push(format!("color=c=black:s={cw}x{ch}:r=30:d={total:.6}[bg]"));

	// Per-clip video: speed, time-shift to start, scale to placement size.
	let places: Vec<(i64, i64, i64, i64)> = clips.iter().map(|c| placement(cw, ch, c)).collect();
	for (i, c) in clips.iter().enumerate() {
		let speed = c.speed.max(0.01);
		let (dw, dh, _, _) = places[i];
		chains.push(format!(
			"[{i}:v]setpts=(PTS-STARTPTS)/{speed:.6}+{start:.6}/TB,scale={dw}:{dh},setsar=1[v{i}]",
			start = c.start
		));
	}

	// Overlay chain in z-order; each clip only composites within its window.
	let mut last = "bg".to_string();
	for (k, &i) in order.iter().enumerate() {
		let c = &clips[i];
		let (_, _, ox, oy) = places[i];
		let out_label = if k == order.len() - 1 {
			"outv".to_string()
		} else {
			format!("ov{i}")
		};
		chains.push(format!(
			"[{last}][v{i}]overlay=x={ox}:y={oy}:eof_action=pass:enable='between(t,{s:.6},{e:.6})'[{out_label}]",
			s = c.start,
			e = c.timeline_end()
		));
		last = out_label;
	}

	// Per-clip audio: speed, volume, fade, delay to start. Muted/silent clips
	// contribute nothing and are dropped from the mix.
	let mut alabels: Vec<String> = Vec::new();
	for (i, c) in clips.iter().enumerate() {
		if c.muted || !has_audio(&c.path) {
			continue;
		}
		let speed = c.speed.max(0.01);
		let mut chain = format!(
			"[{i}:a]asetpts=PTS-STARTPTS,{},volume={:.4}",
			atempo_chain(speed),
			c.volume
		);
		if c.fade_in > 0.0 {
			chain.push_str(&format!(",afade=t=in:st=0:d={:.4}", c.fade_in));
		}
		if c.fade_out > 0.0 {
			let st = (c.timeline_dur() - c.fade_out).max(0.0);
			chain.push_str(&format!(",afade=t=out:st={st:.4}:d={:.4}", c.fade_out));
		}
		let ms = (c.start * 1000.0).round() as i64;
		if ms > 0 {
			chain.push_str(&format!(",adelay={ms}:all=1"));
		}
		chain.push_str(&format!("[a{i}]"));
		chains.push(chain);
		alabels.push(format!("[a{i}]"));
	}
	if alabels.is_empty() {
		chains.push(format!("anullsrc=r=44100:cl=stereo,atrim=0:{total:.6}[outa]"));
	} else if alabels.len() == 1 {
		chains.push(format!("{}anull[outa]", alabels[0]));
	} else {
		chains.push(format!(
			"{}amix=inputs={}:normalize=0:dropout_transition=0[outa]",
			alabels.join(""),
			alabels.len()
		));
	}

	args.push("-filter_complex".into());
	args.push(chains.join(";"));
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
