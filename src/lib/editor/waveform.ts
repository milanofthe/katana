// Audio extraction for the timeline: the ffmpeg sidecar decodes each source
// once to low-rate mono PCM (the WebView never loads the media file itself),
// which is downsampled to peaks (kept in the reactive store for waveform
// drawing) and cached as an AudioBuffer (kept here, off the reactive store) so
// the playhead scrub can play short audio grains from it.
import { invoke } from '@tauri-apps/api/core';
import { editor } from './store.svelte';
import { WAVEFORM, AUDIO_SCRUB } from '$lib/constants';

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext {
	if (!ctx) ctx = new AudioContext();
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	return ctx;
}

const bufferCache = new Map<string, AudioBuffer>();
const pending = new Set<string>();

/** Downsample to absolute-peak buckets (strided, so cheap on the main thread). */
function computePeaks(data: Float32Array): number[] {
	const n = WAVEFORM.resolution;
	const peaks = new Array<number>(n).fill(0);
	const bucket = Math.max(1, Math.floor(data.length / n));
	const stride = Math.max(1, Math.floor(bucket / WAVEFORM.maxSamplesPerBucket));
	for (let i = 0; i < n; i++) {
		const end = Math.min(data.length, (i + 1) * bucket);
		for (let j = i * bucket; j < end; j += stride) {
			peaks[i] = Math.max(peaks[i], Math.abs(data[j]));
		}
	}
	return peaks;
}

/** Decode a source (once) and publish its waveform; silent failure if no audio. */
export async function ensureWaveform(path: string): Promise<void> {
	if (bufferCache.has(path) || pending.has(path) || editor.waveforms[path]) return;
	pending.add(path);
	try {
		const pcm = new Int16Array(
			await invoke<ArrayBuffer>('extract_audio', { path, sampleRate: WAVEFORM.sampleRate })
		);
		if (pcm.length === 0) return;
		const buffer = new AudioBuffer({ length: pcm.length, sampleRate: WAVEFORM.sampleRate });
		const data = buffer.getChannelData(0);
		for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;
		bufferCache.set(path, buffer);
		editor.setWaveform(path, computePeaks(data));
	} catch {
		// No audio stream or decode failure: leave the clip without a waveform.
	} finally {
		pending.delete(path);
	}
}

let lastGrain = 0;

/** Play a short audio grain from a cached source at a given source time (scrub). */
export function scrubAudio(path: string, sourceTime: number, nowMs: number): void {
	const buffer = bufferCache.get(path);
	if (!buffer) return;
	if (nowMs - lastGrain < AUDIO_SCRUB.throttleMs) return;
	lastGrain = nowMs;

	const ac = audioCtx();
	const t = ac.currentTime;
	const dur = AUDIO_SCRUB.grainSec;
	const fade = AUDIO_SCRUB.grainFadeSec;
	const gain = ac.createGain();
	gain.gain.setValueAtTime(0, t);
	gain.gain.linearRampToValueAtTime(1, t + fade);
	gain.gain.setValueAtTime(1, t + dur - fade);
	gain.gain.linearRampToValueAtTime(0, t + dur);

	const node = ac.createBufferSource();
	node.buffer = buffer;
	node.connect(gain).connect(ac.destination);
	const offset = Math.max(0, Math.min(buffer.duration - dur, sourceTime));
	try {
		node.start(t, offset, dur);
	} catch {
		// Out-of-range offset on an edge: ignore.
	}
}
