// Frontend export flow: gather the timeline EDL + chosen settings, pick an
// output path, hand it to the Rust exporter, stream progress, surface the
// result as a toast.
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { editor } from './store.svelte';
import { fontById } from '$lib/text/fonts';

export interface ExportSettings {
	/** Container + codec: "mp4-h264" | "mp4-h265" | "webm-vp9" | "mov-h264" | "gif". */
	format: string;
	/** Target height: "source" | "2160" | "1440" | "1080" | "720" | "480". */
	resolution: string;
	/** "high" | "medium" | "low". */
	quality: string;
}

/** File extension for an output format. */
function extensionFor(format: string): string {
	switch (format) {
		case 'webm-vp9':
			return 'webm';
		case 'mov-h264':
			return 'mov';
		case 'gif':
			return 'gif';
		default:
			return 'mp4';
	}
}

export async function runExport(settings: ExportSettings): Promise<void> {
	if (editor.clips.length === 0 || editor.exporting) return;

	const ext = extensionFor(settings.format);
	const output = await save({
		defaultPath: `katana-export.${ext}`,
		filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
	});
	if (!output) return;

	// Full compositing payload: the Rust exporter overlays each clip by its
	// start/track (z-order) and transform (x/y/scale) onto the output canvas.
	const clips = editor.clips.map((c) => ({
		kind: c.kind,
		path: c.path,
		inPoint: c.inPoint,
		outPoint: c.outPoint,
		speed: c.speed,
		volume: c.volume,
		muted: c.muted,
		fadeIn: c.fadeInSec,
		fadeOut: c.fadeOutSec,
		start: c.start,
		track: c.track,
		x: c.transform.x,
		y: c.transform.y,
		scale: c.transform.scale,
		aspectRatio: c.aspectRatio,
		// Text overlays carry their styling; the font id maps to a bundled TTF the
		// Rust exporter resolves to a resource path for drawtext.
		text: c.text
			? {
					content: c.text.content,
					fontFile: fontById(c.text.fontId).file,
					sizePct: c.text.sizePct,
					color: c.text.color,
					align: c.text.align,
					outline: c.text.outline,
					outlineColor: c.text.outlineColor
				}
			: undefined
	}));

	editor.exporting = true;
	editor.exportProgress = 0;
	editor.notice = null;
	const unlisten = await listen<number>('export:progress', (e) => {
		editor.exportProgress = e.payload;
	});
	try {
		await invoke('export_video', {
			clips,
			aspect: editor.aspectRatio,
			settings,
			fps: editor.projectFps,
			output
		});
		editor.notify('Export complete', 'ok');
	} catch (e) {
		editor.notify(String(e), 'error');
	} finally {
		unlisten();
		editor.exporting = false;
	}
}
