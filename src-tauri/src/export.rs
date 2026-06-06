// Export pipeline: turn the timeline EDL into a single FFmpeg filter_complex
// invocation (trim + concat + speed + volume/mute + fade + output format) and
// run it. Uses ffmpeg from PATH for now; a bundled sidecar can replace the
// binary name later without changing this logic.
use std::process::Command;

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

/// Target pixel dimensions for a chosen output format ("original" = keep source).
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

/// Build the full ffmpeg argument vector for the given EDL.
fn build_args(clips: &[ExportClip], format: &str, output: &str) -> Result<Vec<String>, String> {
	if clips.is_empty() {
		return Err("Nothing to export: the timeline is empty.".into());
	}
	let dims = format_dims(format);
	let mut args: Vec<String> = vec!["-y".into()];

	// One trimmed input per clip (input seeking for speed).
	for c in clips {
		let span = (c.out_point - c.in_point).max(0.01);
		args.push("-ss".into());
		args.push(format!("{:.6}", c.in_point));
		args.push("-t".into());
		args.push(format!("{span:.6}"));
		args.push("-i".into());
		args.push(c.path.clone());
	}

	// Per-clip video + audio chains, then concat.
	let mut filter = String::new();
	let mut concat_inputs = String::new();
	for (i, c) in clips.iter().enumerate() {
		let speed = c.speed.max(0.01);
		let span = (c.out_point - c.in_point).max(0.01);
		let timeline_dur = span / speed;

		// Video: reset PTS to 0, apply speed, optionally scale+pad to format.
		filter.push_str(&format!("[{i}:v]setpts=(PTS-STARTPTS)/{speed:.6}"));
		if let Some((w, h)) = dims {
			filter.push_str(&format!(
				",scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
			));
		}
		filter.push_str(&format!("[v{i}];"));

		// Audio: reset PTS, apply speed (atempo), volume/mute, fades.
		let vol = if c.muted { 0.0 } else { c.volume };
		filter.push_str(&format!(
			"[{i}:a]asetpts=PTS-STARTPTS,{},volume={vol:.4}",
			atempo_chain(speed)
		));
		if c.fade_in > 0.0 {
			filter.push_str(&format!(",afade=t=in:st=0:d={:.4}", c.fade_in));
		}
		if c.fade_out > 0.0 {
			let st = (timeline_dur - c.fade_out).max(0.0);
			filter.push_str(&format!(",afade=t=out:st={st:.4}:d={:.4}", c.fade_out));
		}
		filter.push_str(&format!("[a{i}];"));

		concat_inputs.push_str(&format!("[v{i}][a{i}]"));
	}
	filter.push_str(&format!(
		"{concat_inputs}concat=n={}:v=1:a=1[outv][outa]",
		clips.len()
	));

	args.push("-filter_complex".into());
	args.push(filter);
	args.push("-map".into());
	args.push("[outv]".into());
	args.push("-map".into());
	args.push("[outa]".into());
	args.extend(
		[
			"-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a",
			"aac", "-b:a", "192k", "-movflags", "+faststart",
		]
		.iter()
		.map(|s| s.to_string()),
	);
	args.push(output.to_string());
	Ok(args)
}

/// Render the timeline to a single output file via ffmpeg.
#[tauri::command]
pub async fn export_video(
	clips: Vec<ExportClip>,
	format: String,
	output: String,
) -> Result<(), String> {
	let args = build_args(&clips, &format, &output)?;
	let result = tokio::task::spawn_blocking(move || Command::new("ffmpeg").args(&args).output())
		.await
		.map_err(|e| e.to_string())?;

	match result {
		Ok(out) if out.status.success() => Ok(()),
		Ok(out) => {
			let stderr = String::from_utf8_lossy(&out.stderr);
			// Surface the last few lines of ffmpeg's error output.
			let tail: String = stderr.lines().rev().take(6).collect::<Vec<_>>()
				.into_iter().rev().collect::<Vec<_>>().join("\n");
			Err(format!("ffmpeg failed:\n{tail}"))
		}
		Err(e) => Err(format!("Could not run ffmpeg (is it installed / on PATH?): {e}")),
	}
}
