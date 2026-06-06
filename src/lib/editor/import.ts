// Media import: from the native picker or a file drop. Resolves an asset URL,
// probes duration, grabs a preview frame, and appends a clip to the store.
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { editor } from './store.svelte';
import { THUMB } from '$lib/constants';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'];

function isVideoPath(path: string): boolean {
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	return VIDEO_EXTENSIONS.includes(ext);
}

/** Draw the current video frame to a canvas and return a JPEG data URL. */
function captureFrame(v: HTMLVideoElement): string | undefined {
	try {
		const vw = v.videoWidth || THUMB.width;
		const vh = v.videoHeight || Math.round((THUMB.width * 9) / 16);
		const canvas = document.createElement('canvas');
		canvas.width = THUMB.width;
		canvas.height = Math.max(1, Math.round((vh / vw) * THUMB.width));
		const ctx = canvas.getContext('2d');
		if (!ctx) return undefined;
		ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/jpeg', 0.7);
	} catch {
		return undefined; // tainted canvas or decode failure -> fall back to glyph
	}
}

/** Read just the duration (seconds), without CORS — always works for playback. */
function probeDurationOnly(src: string): Promise<number> {
	return new Promise((resolve) => {
		const v = document.createElement('video');
		v.preload = 'metadata';
		v.onloadedmetadata = () => resolve(v.duration || 0);
		v.onerror = () => resolve(0);
		v.src = src;
	});
}

/** Load a media file to read its duration and capture one preview frame.
 * crossOrigin is required for an untainted canvas; if the asset protocol
 * rejects it, fall back to a duration-only probe (no thumbnail). */
function probeMedia(src: string): Promise<{ duration: number; thumbnail?: string }> {
	return new Promise((resolve) => {
		const v = document.createElement('video');
		v.preload = 'metadata';
		v.muted = true;
		v.crossOrigin = 'anonymous';
		let duration = 0;
		let done = false;
		const finish = (thumbnail?: string) => {
			if (done) return;
			done = true;
			resolve({ duration, thumbnail });
		};
		v.onloadedmetadata = () => {
			duration = v.duration || 0;
			v.currentTime = Math.min(THUMB.atMaxSec, duration * THUMB.atFraction);
		};
		v.onseeked = () => finish(captureFrame(v));
		v.onerror = () => probeDurationOnly(src).then((d) => ((duration = d), finish(undefined)));
		v.src = src;
	});
}

/** Append one or more video files (by absolute path) to the timeline. */
export async function importPaths(paths: string[]): Promise<void> {
	for (const path of paths) {
		if (!isVideoPath(path)) continue;
		const src = convertFileSrc(path);
		const { duration, thumbnail } = await probeMedia(src);
		const name = path.split(/[\\/]/).pop() ?? 'clip';
		editor.addClip({
			id: crypto.randomUUID(),
			src,
			path,
			name,
			sourceDuration: duration,
			inPoint: 0,
			outPoint: duration,
			thumbnail
		});
	}
}

/** Open the native file picker and append the chosen video(s). */
export async function importMedia(): Promise<void> {
	const selected = await open({
		multiple: true,
		filters: [{ name: 'Video', extensions: VIDEO_EXTENSIONS }]
	});
	if (!selected) return;
	const paths = Array.isArray(selected) ? selected : [selected];
	await importPaths(paths);
}
