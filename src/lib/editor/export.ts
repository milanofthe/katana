// Frontend export flow: pick an output path, hand the timeline EDL to the
// Rust exporter, surface the result as a toast.
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { editor } from './store.svelte';

export async function exportProject(): Promise<void> {
	if (editor.clips.length === 0 || editor.exporting) return;

	const output = await save({
		defaultPath: 'katana-export.mp4',
		filters: [{ name: 'Video', extensions: ['mp4'] }]
	});
	if (!output) return;

	const clips = editor.clips.map((c) => ({
		path: c.path,
		inPoint: c.inPoint,
		outPoint: c.outPoint,
		speed: c.speed,
		volume: c.volume,
		muted: c.muted,
		fadeIn: c.fadeInSec,
		fadeOut: c.fadeOutSec
	}));

	editor.exporting = true;
	editor.notice = null;
	try {
		await invoke('export_video', { clips, format: editor.aspectRatio, output });
		editor.notify('Export complete', 'ok');
	} catch (e) {
		editor.notify(String(e), 'error');
	} finally {
		editor.exporting = false;
	}
}
