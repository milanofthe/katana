// Export pipeline: composite the multi-track timeline into one FFmpeg
// filter_complex invocation. Each clip is trimmed, speed-adjusted, scaled by
// its transform, time-shifted to its start and overlaid (z-ordered by track)
// onto a black canvas; audio is delayed and mixed. Progress streams back to the
// UI. FFmpeg/ffprobe ship as bundled sidecars (see scripts/fetch-ffmpeg.ps1).
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportClip {
	/// "video" (composited) or "audio" (mixed only).
	kind: String,
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

/// Output choices from the export dialog.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSettings {
	/// Container + codec: "mp4-h264" | "mp4-h265" | "webm-vp9" | "mov-h264" | "gif".
	format: String,
	/// Target height: "source" | "2160" | "1440" | "1080" | "720" | "480".
	resolution: String,
	/// "high" | "medium" | "low".
	quality: String,
}

/// Frames per second for GIF output.
const GIF_FPS: u32 = 15;

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
	fn is_video(&self) -> bool {
		self.kind == "video"
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

/// Target output height for a resolution preset (None = keep source/canvas).
fn target_height(res: &str) -> Option<i64> {
	match res {
		"2160" => Some(2160),
		"1440" => Some(1440),
		"1080" => Some(1080),
		"720" => Some(720),
		"480" => Some(480),
		_ => None,
	}
}

/// Scale canvas dims to a resolution preset, preserving aspect ratio (even dims).
fn apply_resolution(cw: i64, ch: i64, res: &str) -> (i64, i64) {
	match target_height(res) {
		Some(th) => {
			let s = th as f64 / ch as f64;
			(even((cw as f64 * s).round() as i64), even(th))
		}
		None => (even(cw), even(ch)),
	}
}

/// CRF for a codec family at a quality level (lower = better quality).
fn crf(codec: &str, quality: &str) -> &'static str {
	match (codec, quality) {
		("x265", "high") => "20",
		("x265", "medium") => "25",
		("x265", "low") => "30",
		("vp9", "high") => "24",
		("vp9", "medium") => "31",
		("vp9", "low") => "37",
		(_, "medium") => "23",
		(_, "low") => "28",
		_ => "18", // x264 high / default
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

/// Does this media file carry at least one audio stream? (via ffprobe sidecar)
async fn probe_has_audio(app: &AppHandle, path: &str) -> bool {
	let Ok(cmd) = app.shell().sidecar("ffprobe") else {
		return false;
	};
	let args = [
		"-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0",
		path,
	];
	match cmd.args(args).output().await {
		Ok(out) => out.status.success() && !String::from_utf8_lossy(&out.stdout).trim().is_empty(),
		Err(_) => false,
	}
}

/// Probe a clip's pixel dimensions (via ffprobe sidecar) for "original" canvas.
async fn probe_dims(app: &AppHandle, path: &str) -> Option<(u32, u32)> {
	let cmd = app.shell().sidecar("ffprobe").ok()?;
	let args = [
		"-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of",
		"csv=s=,:p=0", path,
	];
	let out = cmd.args(args).output().await.ok()?;
	if !out.status.success() {
		return None;
	}
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

/// Output canvas size: the chosen aspect format, or the probed base-clip size.
fn canvas_dims(aspect: &str, base_dims: Option<(u32, u32)>) -> (i64, i64) {
	if let Some((w, h)) = format_dims(aspect) {
		return (w as i64, h as i64);
	}
	let (w, h) = base_dims.unwrap_or((1920, 1080));
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

/// Build the ffmpeg argument vector. Pure: all probing is done by the caller and
/// passed in via `order`, `audio_flags` and `base_dims`. Returns (args, total).
fn build_args(
	clips: &[ExportClip],
	order: &[usize],
	aspect: &str,
	settings: &ExportSettings,
	audio_flags: &[bool],
	base_dims: Option<(u32, u32)>,
	output: &str,
) -> (Vec<String>, f64) {
	let total: f64 = clips.iter().map(|c| c.timeline_end()).fold(0.0, f64::max);

	let (cw, ch) = canvas_dims(aspect, base_dims);
	let (cw, ch) = apply_resolution(cw, ch, &settings.resolution);
	let is_gif = settings.format == "gif";

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

	// Black base canvas spanning the whole timeline. With no video clips the base
	// itself is the output video (audio-only export = black frame + audio).
	let has_video = !order.is_empty();
	let base = if has_video { "bg" } else { "outv" };
	chains.push(format!("color=c=black:s={cw}x{ch}:r=30:d={total:.6}[{base}]"));

	// Per-clip video: speed, time-shift to start, scale to placement size.
	let places: Vec<(i64, i64, i64, i64)> = clips.iter().map(|c| placement(cw, ch, c)).collect();
	for (i, c) in clips.iter().enumerate() {
		if !c.is_video() {
			continue;
		}
		let speed = c.speed.max(0.01);
		let (dw, dh, _, _) = places[i];
		chains.push(format!(
			"[{i}:v]setpts=(PTS-STARTPTS)/{speed:.6}+{start:.6}/TB,scale={dw}:{dh},setsar=1[v{i}]",
			start = c.start
		));
	}

	// Overlay chain in z-order (video clips only); each composites in its window.
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

	// Audio (skipped for GIF). Per-clip: speed, volume, fade, delay to start;
	// muted/silent clips contribute nothing and are dropped from the mix.
	if !is_gif {
		let mut alabels: Vec<String> = Vec::new();
		for (i, c) in clips.iter().enumerate() {
			if c.muted || !audio_flags[i] {
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
	} else {
		// GIF: build an optimized palette from the composited video.
		chains.push(format!("[outv]fps={GIF_FPS},split[gv][gp]"));
		chains.push("[gp]palettegen=stats_mode=diff[pal]".into());
		chains.push("[gv][pal]paletteuse=dither=bayer[gifout]".into());
	}

	args.push("-filter_complex".into());
	args.push(chains.join(";"));

	// Encoder + muxer for the chosen format.
	let q = settings.quality.as_str();
	let tail: Vec<&str> = match settings.format.as_str() {
		"gif" => vec!["-map", "[gifout]", "-loop", "0"],
		"mp4-h265" => vec![
			"-map", "[outv]", "-map", "[outa]", "-c:v", "libx265", "-preset", "veryfast", "-crf",
			crf("x265", q), "-pix_fmt", "yuv420p", "-tag:v", "hvc1", "-c:a", "aac", "-b:a", "192k",
			"-movflags", "+faststart",
		],
		"webm-vp9" => vec![
			"-map", "[outv]", "-map", "[outa]", "-c:v", "libvpx-vp9", "-crf", crf("vp9", q), "-b:v",
			"0", "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "128k",
		],
		"mov-h264" => vec![
			"-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "veryfast", "-crf",
			crf("x264", q), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags",
			"+faststart",
		],
		_ => vec![
			// mp4-h264 (default)
			"-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "veryfast", "-crf",
			crf("x264", q), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags",
			"+faststart",
		],
	};
	args.extend(tail.iter().map(|s| s.to_string()));
	// Machine-readable progress on stdout.
	args.extend(["-progress", "pipe:1", "-nostats"].iter().map(|s| s.to_string()));
	args.push(output.to_string());
	(args, total)
}

/// Probe a single stream's codec name (e.g. "h264", "aac"); None if absent.
async fn probe_codec(app: &AppHandle, path: &str, stream: &str) -> Option<String> {
	let cmd = app.shell().sidecar("ffprobe").ok()?;
	let args = [
		"-v", "error", "-select_streams", stream, "-show_entries", "stream=codec_name", "-of",
		"csv=p=0", path,
	];
	let out = cmd.args(args).output().await.ok()?;
	if !out.status.success() {
		return None;
	}
	let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
	if s.is_empty() {
		None
	} else {
		Some(s)
	}
}

/// Structural eligibility for a lossless stream copy: a single, untouched,
/// timeline-origin video clip exported at source size/format. Returns the clip.
fn copy_candidate<'a>(
	clips: &'a [ExportClip],
	aspect: &str,
	settings: &ExportSettings,
) -> Option<&'a ExportClip> {
	if settings.format == "gif" || settings.resolution != "source" || aspect != "original" {
		return None;
	}
	if clips.len() != 1 {
		return None;
	}
	let c = &clips[0];
	let eps = 1e-6;
	if !c.is_video()
		|| c.muted
		|| c.start.abs() > eps
		|| (c.speed - 1.0).abs() > eps
		|| (c.volume - 1.0).abs() > eps
		|| c.fade_in > eps
		|| c.fade_out > eps
		|| c.x.abs() > eps
		|| c.y.abs() > eps
		|| (c.scale - 1.0).abs() > eps
	{
		return None;
	}
	Some(c)
}

/// Can the source streams be copied (not re-encoded) into the chosen format?
fn copy_compatible(format: &str, vcodec: &str, acodec: Option<&str>) -> bool {
	let audio_ok = |allowed: &[&str]| acodec.map_or(true, |a| allowed.contains(&a));
	match format {
		"mp4-h264" | "mov-h264" => vcodec == "h264" && audio_ok(&["aac", "mp3"]),
		"mp4-h265" => vcodec == "hevc" && audio_ok(&["aac", "mp3"]),
		"webm-vp9" => (vcodec == "vp9" || vcodec == "vp8") && audio_ok(&["opus", "vorbis"]),
		_ => false,
	}
}

/// Lossless stream-copy args: trim with `-c copy`, no re-encode.
fn build_copy_args(c: &ExportClip, format: &str, output: &str) -> (Vec<String>, f64) {
	let span = c.source_span();
	let mut args: Vec<String> = vec![
		"-y".into(),
		"-ss".into(),
		format!("{:.6}", c.in_point),
		"-i".into(),
		c.path.clone(),
		"-t".into(),
		format!("{span:.6}"),
		"-map".into(),
		"0:v:0".into(),
		"-map".into(),
		"0:a:0?".into(),
		"-c".into(),
		"copy".into(),
		"-avoid_negative_ts".into(),
		"make_zero".into(),
	];
	if matches!(format, "mp4-h264" | "mp4-h265" | "mov-h264") {
		args.push("-movflags".into());
		args.push("+faststart".into());
	}
	args.extend(["-progress", "pipe:1", "-nostats"].iter().map(|s| s.to_string()));
	args.push(output.to_string());
	(args, span)
}

/// Render the timeline to a single output file, emitting `export:progress`
/// (0..1) as it runs. Uses a lossless stream copy when the timeline is a single
/// untouched trim; otherwise the full compositing re-encode. Sidecars from bundle.
#[tauri::command]
pub async fn export_video(
	app: AppHandle,
	clips: Vec<ExportClip>,
	aspect: String,
	settings: ExportSettings,
	output: String,
) -> Result<(), String> {
	if clips.is_empty() {
		return Err("Nothing to export: the timeline is empty.".into());
	}

	// Lossless stream-copy fastpath (single trimmed clip, compatible codecs).
	if let Some(c) = copy_candidate(&clips, &aspect, &settings) {
		let vcodec = probe_codec(&app, &c.path, "v:0").await;
		let acodec = probe_codec(&app, &c.path, "a:0").await;
		if let Some(vc) = vcodec.as_deref() {
			if copy_compatible(&settings.format, vc, acodec.as_deref()) {
				let (args, total) = build_copy_args(c, &settings.format, &output);
				return run_ffmpeg(app, args, total).await;
			}
		}
	}

	// Composite bottom-to-top: video clips only, lower track first, ties by start.
	let mut order: Vec<usize> = (0..clips.len()).filter(|&i| clips[i].is_video()).collect();
	order.sort_by(|&a, &b| {
		clips[a]
			.track
			.cmp(&clips[b].track)
			.then(clips[a].start.partial_cmp(&clips[b].start).unwrap_or(std::cmp::Ordering::Equal))
	});

	// Probe up front (async) so build_args stays pure.
	let mut audio_flags: Vec<bool> = Vec::with_capacity(clips.len());
	for c in &clips {
		audio_flags.push(probe_has_audio(&app, &c.path).await);
	}
	let base_dims = if format_dims(&aspect).is_none() && !order.is_empty() {
		probe_dims(&app, &clips[order[0]].path).await
	} else {
		None
	};

	let (args, total) =
		build_args(&clips, &order, &aspect, &settings, &audio_flags, base_dims, &output);

	run_ffmpeg(app, args, total).await
}

/// Spawn the bundled ffmpeg sidecar with the given args and stream progress.
async fn run_ffmpeg(app: AppHandle, args: Vec<String>, total: f64) -> Result<(), String> {
	let cmd = app
		.shell()
		.sidecar("ffmpeg")
		.map_err(|e| format!("Bundled ffmpeg not found: {e}"))?;
	let (mut rx, _child) = cmd
		.args(args)
		.spawn()
		.map_err(|e| format!("Could not start ffmpeg: {e}"))?;

	let mut stderr_tail: Vec<String> = Vec::new();
	let mut exit_ok = false;
	while let Some(event) = rx.recv().await {
		match event {
			CommandEvent::Stdout(bytes) => {
				let line = String::from_utf8_lossy(&bytes);
				parse_progress(&app, &line, total);
			}
			CommandEvent::Stderr(bytes) => {
				let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
				if !line.is_empty() {
					stderr_tail.push(line);
					if stderr_tail.len() > 50 {
						stderr_tail.remove(0);
					}
				}
			}
			CommandEvent::Terminated(payload) => {
				exit_ok = payload.code == Some(0);
			}
			_ => {}
		}
	}

	if exit_ok {
		let _ = app.emit("export:progress", 1.0_f64);
		Ok(())
	} else {
		let tail: Vec<String> = stderr_tail.iter().rev().take(6).cloned().collect();
		let msg = tail.into_iter().rev().collect::<Vec<_>>().join("\n");
		Err(format!("ffmpeg failed:\n{msg}"))
	}
}

/// Parse a `-progress` stdout line and emit a 0..1 fraction.
fn parse_progress(app: &AppHandle, line: &str, total: f64) {
	let line = line.trim();
	if let Some(v) = line.strip_prefix("out_time_us=") {
		if let Ok(us) = v.trim().parse::<f64>() {
			emit_progress(app, us / 1_000_000.0, total);
		}
	} else if let Some(v) = line.strip_prefix("out_time_ms=") {
		// Some builds report microseconds under this key; treat as us.
		if let Ok(us) = v.trim().parse::<f64>() {
			emit_progress(app, us / 1_000_000.0, total);
		}
	}
}

fn emit_progress(app: &AppHandle, seconds: f64, total: f64) {
	let pct = if total > 0.0 { (seconds / total).clamp(0.0, 1.0) } else { 0.0 };
	let _ = app.emit("export:progress", pct);
}
