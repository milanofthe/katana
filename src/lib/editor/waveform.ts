// Audio extraction for the timeline: decode each source once via WebAudio,
// downsample to peaks (kept in the reactive store for waveform drawing) and
// cache the decoded AudioBuffer (kept here, off the reactive store) so the
// playhead scrub can play short audio grains from it.
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

// One reusable worker for peak extraction (created lazily, client-side only).
let worker: Worker | null = null;
let workerBroken = false;
function getWorker(): Worker | null {
	if (workerBroken) return null;
	if (!worker) {
		try {
			worker = new Worker(new URL('./waveform.worker.ts', import.meta.url), { type: 'module' });
		} catch {
			workerBroken = true;
			return null;
		}
	}
	return worker;
}

/** Copy a buffer's channels so transferring to the worker keeps the original. */
function copyChannels(buffer: AudioBuffer): Float32Array[] {
	const out: Float32Array[] = [];
	for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
		out.push(buffer.getChannelData(ch).slice(0));
	}
	return out;
}

/** Main-thread fallback (same algorithm) if the worker is unavailable. */
function computePeaksMain(channels: Float32Array[]): number[] {
	const n = WAVEFORM.resolution;
	const peaks = new Array<number>(n).fill(0);
	const len = channels[0]?.length ?? 0;
	const bucket = Math.max(1, Math.floor(len / n));
	const stride = Math.max(1, Math.floor(bucket / WAVEFORM.maxSamplesPerBucket));
	for (const data of channels) {
		for (let i = 0; i < n; i++) {
			const start = i * bucket;
			const end = Math.min(len, start + bucket);
			let peak = 0;
			for (let j = start; j < end; j += stride) {
				const a = Math.abs(data[j]);
				if (a > peak) peak = a;
			}
			if (peak > peaks[i]) peaks[i] = peak;
		}
	}
	return peaks;
}

/** Downsample to absolute-peak buckets in a worker; fall back to main thread. */
function extractPeaks(buffer: AudioBuffer): Promise<number[]> {
	const channels = copyChannels(buffer);
	const w = getWorker();
	if (!w) return Promise.resolve(computePeaksMain(channels));
	return new Promise((resolve) => {
		const onMessage = (e: MessageEvent<Float32Array>) => {
			w.removeEventListener('message', onMessage);
			resolve(Array.from(e.data));
		};
		w.addEventListener('message', onMessage);
		w.postMessage(
			{ channels, resolution: WAVEFORM.resolution, maxSamplesPerBucket: WAVEFORM.maxSamplesPerBucket },
			channels.map((c) => c.buffer)
		);
	});
}

/** Decode a source (once) and publish its waveform; silent failure if no audio. */
export async function ensureWaveform(src: string, path: string): Promise<void> {
	if (bufferCache.has(path) || pending.has(path) || editor.waveforms[path]) return;
	pending.add(path);
	try {
		const res = await fetch(src);
		const bytes = await res.arrayBuffer();
		const buffer = await audioCtx().decodeAudioData(bytes);
		bufferCache.set(path, buffer);
		editor.setWaveform(path, await extractPeaks(buffer));
	} catch {
		// No audio stream, CORS, or decode failure: leave the clip without a waveform.
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
