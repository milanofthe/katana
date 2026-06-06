// Media import: native file picker -> probe duration -> add a clip to the store.
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { editor } from './store.svelte';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'];

/** Read a media file's duration (seconds) via a throwaway <video> element. */
function probeDuration(src: string): Promise<number> {
	return new Promise((resolve) => {
		const v = document.createElement('video');
		v.preload = 'metadata';
		v.onloadedmetadata = () => resolve(v.duration || 0);
		v.onerror = () => resolve(0);
		v.src = src;
	});
}

/** Open the native file picker and append the chosen video(s) to the timeline. */
export async function importMedia(): Promise<void> {
	const selected = await open({
		multiple: true,
		filters: [{ name: 'Video', extensions: VIDEO_EXTENSIONS }]
	});
	if (!selected) return;

	const paths = Array.isArray(selected) ? selected : [selected];
	for (const path of paths) {
		const src = convertFileSrc(path);
		const duration = await probeDuration(src);
		const name = path.split(/[\\/]/).pop() ?? 'clip';
		editor.addClip({
			id: crypto.randomUUID(),
			src,
			path,
			name,
			inPoint: 0,
			outPoint: duration
		});
	}
}
