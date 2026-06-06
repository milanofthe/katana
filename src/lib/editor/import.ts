// Media import: from the native picker or a file drop. Resolves an asset URL,
// reads duration + aspect ratio, captures a strip of preview frames, and
// appends a clip to the store.
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { editor } from './store.svelte';
import { ensureWaveform } from './waveform';
import { THUMB } from '$lib/constants';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'];

function isVideoPath(path: string): boolean {
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	return VIDEO_EXTENSIONS.includes(ext);
}

/** Draw the current video frame to a canvas and return a short object-URL
 * (not a multi-KB base64 string, which would bloat the DOM when inlined into
 * every filmstrip slot). Object URLs live until page reload — an acceptable
 * trade vs. the per-slot duplication; clips share frames after a split. */
function captureFrame(v: HTMLVideoElement): Promise<string | undefined> {
	return new Promise((resolve) => {
		try {
			const vw = v.videoWidth || THUMB.width;
			const vh = v.videoHeight || Math.round((THUMB.width * 9) / 16);
			const canvas = document.createElement('canvas');
			canvas.width = THUMB.width;
			canvas.height = Math.max(1, Math.round((vh / vw) * THUMB.width));
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				resolve(undefined);
				return;
			}
			ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
			canvas.toBlob(
				(blob) => resolve(blob ? URL.createObjectURL(blob) : undefined),
				'image/jpeg',
				0.6
			);
		} catch {
			resolve(undefined); // tainted canvas or decode failure
		}
	});
}

function loadMetadata(v: HTMLVideoElement): Promise<void> {
	return new Promise((resolve, reject) => {
		v.onloadedmetadata = () => resolve();
		v.onerror = () => reject(new Error('load failed'));
	});
}

function seekTo(v: HTMLVideoElement, t: number): Promise<void> {
	return new Promise((resolve) => {
		const onSeeked = () => {
			v.removeEventListener('seeked', onSeeked);
			resolve();
		};
		v.addEventListener('seeked', onSeeked);
		v.currentTime = t;
	});
}

/** Duration-only probe (no CORS) — always works even if frame capture can't. */
function probeDurationOnly(src: string): Promise<number> {
	return new Promise((resolve) => {
		const v = document.createElement('video');
		v.preload = 'metadata';
		v.onloadedmetadata = () => resolve(v.duration || 0);
		v.onerror = () => resolve(0);
		v.src = src;
	});
}

interface Probe {
	duration: number;
	aspectRatio: number;
	thumbnails: string[];
}

/** Read duration + aspect ratio and capture a strip of frames across the source. */
async function probeMedia(src: string): Promise<Probe> {
	const v = document.createElement('video');
	v.preload = 'auto';
	v.muted = true;
	v.crossOrigin = 'anonymous';
	v.src = src;

	try {
		await loadMetadata(v);
	} catch {
		// CORS/load rejection: fall back to a plain duration probe, no frames.
		return { duration: await probeDurationOnly(src), aspectRatio: 16 / 9, thumbnails: [] };
	}

	const duration = v.duration || 0;
	const aspectRatio = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9;
	const thumbnails: string[] = [];
	const count = THUMB.frameCount;
	for (let i = 0; i < count; i++) {
		const t = duration > 0 ? ((i + 0.5) / count) * duration : 0;
		try {
			await seekTo(v, t);
		} catch {
			break;
		}
		const frame = await captureFrame(v);
		if (!frame) break; // tainted canvas -> stop, fall back to glyph
		thumbnails.push(frame);
	}
	return { duration, aspectRatio, thumbnails };
}

/** Append one or more video files (by absolute path) to the timeline. */
export async function importPaths(paths: string[]): Promise<void> {
	const videos = paths.filter(isVideoPath);
	if (videos.length === 0) return;
	editor.importing += videos.length;
	for (const path of videos) {
		try {
			const src = convertFileSrc(path);
			const { duration, aspectRatio, thumbnails } = await probeMedia(src);
			const name = path.split(/[\\/]/).pop() ?? 'clip';
			editor.addClip({
				id: crypto.randomUUID(),
				src,
				path,
				name,
				sourceDuration: duration,
				inPoint: 0,
				outPoint: duration,
				aspectRatio,
				thumbnails,
				volume: 1,
				muted: false,
				fadeInSec: 0,
				fadeOutSec: 0,
				speed: 1,
				transform: { x: 0, y: 0, scale: 1 }
			});
			// Extract the waveform in the background (don't block import).
			void ensureWaveform(src, path);
		} finally {
			editor.importing--;
		}
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
