// Frontend export flow: pick an output path, hand the timeline EDL to the
// Rust exporter, stream progress, surface the result as a toast.
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { editor } from './store.svelte';

export async function exportProject(): Promise<void> {
	if (editor.clips.length === 0 || editor.exporting) return;

	const output = await save({
		defaultPath: 'katana-export.mp4',
		filters: [{ name: 'Video', extensions: ['mp4'] }]
	});
	if (!output) return;

	// Interim: concatenate in timeline order (by start, then track). True
	// multi-track compositing export (overlay filtergraph honoring start/track/
	// transform) lands in Phase 3.
	const clips = [...editor.clips]
		.sort((a, b) => a.start - b.start || a.track - b.track)
		.map((c) => ({
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
	editor.exportProgress = 0;
	editor.notice = null;
	const unlisten = await listen<number>('export:progress', (e) => {
		editor.exportProgress = e.payload;
	});
	try {
		await invoke('export_video', { clips, format: editor.aspectRatio, output });
		editor.notify('Export complete', 'ok');
	} catch (e) {
		editor.notify(String(e), 'error');
	} finally {
		unlisten();
		editor.exporting = false;
	}
}
