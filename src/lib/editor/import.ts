// Media import: from the native picker or a file drop. Resolves an asset URL,
// reads duration + aspect ratio (metadata only), appends a clip immediately,
// then fills the filmstrip from the ffmpeg sidecar in the background.
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { editor } from './store.svelte';
import { ensureWaveform } from './waveform';
import { THUMB } from '$lib/constants';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'];

function extOf(path: string): string {
	return path.split('.').pop()?.toLowerCase() ?? '';
}
function isVideoPath(path: string): boolean {
	return VIDEO_EXTENSIONS.includes(extOf(path));
}
function isAudioPath(path: string): boolean {
	return AUDIO_EXTENSIONS.includes(extOf(path));
}

/** Duration of an audio file via a metadata-only <audio> load. */
function probeAudioDuration(src: string): Promise<number> {
	return new Promise((resolve) => {
		const a = document.createElement('audio');
		a.preload = 'metadata';
		a.onloadedmetadata = () => resolve(a.duration || 0);
		a.onerror = () => resolve(0);
		a.src = src;
	});
}

interface VideoMeta {
	duration: number;
	aspectRatio: number;
}

/** Read duration + aspect ratio via a metadata-only <video> load (no decode). */
function probeVideoMeta(src: string): Promise<VideoMeta> {
	return new Promise((resolve) => {
		const v = document.createElement('video');
		v.preload = 'metadata';
		v.onloadedmetadata = () => {
			const aspectRatio = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9;
			resolve({ duration: v.duration || 0, aspectRatio });
		};
		v.onerror = () => resolve({ duration: 0, aspectRatio: 16 / 9 });
		v.src = src;
	});
}

/** Pull filmstrip frames from the ffmpeg sidecar and attach them to the clip. */
export async function extractThumbs(id: string, path: string, duration: number): Promise<void> {
	// Frame count scales with duration so long clips stay scrub-smooth, clamped
	// so short clips are still usable and very long clips stay memory-bounded.
	const count = Math.max(
		THUMB.minFrames,
		Math.min(THUMB.maxFrames, Math.round((duration || 0) / THUMB.secondsPerFrame))
	);
	try {
		const thumbs = await invoke<string[]>('extract_thumbnails', {
			path,
			count,
			width: THUMB.width,
			duration
		});
		if (thumbs.length) editor.setThumbnails(id, thumbs);
	} catch {
		// Leave the clip with its glyph if extraction fails.
	}
}

/** Append one or more media files (video or audio) to the timeline. */
export async function importPaths(paths: string[]): Promise<void> {
	const media = paths.filter((p) => isVideoPath(p) || isAudioPath(p));
	if (media.length === 0) return;
	editor.importing += media.length;
	for (const path of media) {
		try {
			const src = convertFileSrc(path);
			const name = path.split(/[\\/]/).pop() ?? 'clip';
			if (isAudioPath(path)) {
				const duration = await probeAudioDuration(src);
				editor.addClip({
					id: crypto.randomUUID(),
					kind: 'audio',
					src,
					path,
					name,
					sourceDuration: duration,
					inPoint: 0,
					outPoint: duration,
					aspectRatio: 1,
					thumbnails: [],
					volume: 1,
					muted: false,
					fadeInSec: 0,
					fadeOutSec: 0,
					speed: 1,
					transform: { x: 0, y: 0, scale: 1 }
				});
			} else {
				const { duration, aspectRatio } = await probeVideoMeta(src);
				const id = crypto.randomUUID();
				editor.addClip({
					id,
					kind: 'video',
					src,
					path,
					name,
					sourceDuration: duration,
					inPoint: 0,
					outPoint: duration,
					aspectRatio,
					thumbnails: [],
					volume: 1,
					muted: false,
					fadeInSec: 0,
					fadeOutSec: 0,
					speed: 1,
					transform: { x: 0, y: 0, scale: 1 }
				});
				// Fill the filmstrip in the background (sidecar, off the UI thread).
				void extractThumbs(id, path, duration);
			}
			// Extract the waveform in the background (don't block import).
			void ensureWaveform(src, path);
		} finally {
			editor.importing--;
		}
	}
}

/** Open the native file picker and append the chosen media. */
export async function importMedia(): Promise<void> {
	const selected = await open({
		multiple: true,
		filters: [
			{ name: 'Media', extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS] },
			{ name: 'Video', extensions: VIDEO_EXTENSIONS },
			{ name: 'Audio', extensions: AUDIO_EXTENSIONS }
		]
	});
	if (!selected) return;
	const paths = Array.isArray(selected) ? selected : [selected];
	await importPaths(paths);
}
