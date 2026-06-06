// Central reactive editor state (Svelte 5 runes). Single source of truth for
// the multi-track timeline, compositing and playback. Editor components bind to
// this directly.
//
// Time model: every clip has an absolute `start` on a shared master timeline
// (seconds) and a `track` (z-order lane, higher = rendered on top). Clips may
// overlap in time; the master playhead drives a single clock and every visible
// clip syncs its <video> to it.
import { TIMELINE, CLIP } from '$lib/constants';

export type AspectRatio = 'original' | '16:9' | '9:16' | '1:1';

/** Placement of a clip within the output viewport (compositing). */
export interface Transform {
	/** Center offset from the viewport center, normalized to viewport size (0 = centered). */
	x: number;
	y: number;
	/** Size relative to a "fit to viewport" baseline (1 = contain, >1 = zoom in). */
	scale: number;
}

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 };

export interface Clip {
	id: string;
	/** Asset URL the <video> can load (from convertFileSrc). */
	src: string;
	/** Original file path on disk (for FFmpeg later). */
	path: string;
	name: string;
	/** Full length of the source media in seconds (trim upper bound). */
	sourceDuration: number;
	/** Trim handles, in seconds into the source media. */
	inPoint: number;
	outPoint: number;
	/** Absolute start on the master timeline, in seconds. */
	start: number;
	/** Z-order lane: 0 = base, higher = composited on top. */
	track: number;
	/** Source aspect ratio (width / height) for AR-correct filmstrip frames. */
	aspectRatio: number;
	/** Preview frames captured evenly across the source (filmstrip thumbnails). */
	thumbnails: string[];
	/** Audio level 0..1. */
	volume: number;
	muted: boolean;
	/** Audio fade in/out, in timeline seconds. */
	fadeInSec: number;
	fadeOutSec: number;
	/** Playback speed multiplier (0.25..4). */
	speed: number;
	/** Placement within the output viewport (compositing). */
	transform: Transform;
}

/** Untrimmed source span (seconds). */
export function clipSourceSpan(c: Clip): number {
	return Math.max(0, c.outPoint - c.inPoint);
}

/** Visible timeline length (seconds), shortened/lengthened by playback speed. */
export function clipDuration(c: Clip): number {
	return clipSourceSpan(c) / (c.speed || 1);
}

/** Absolute timeline time where the clip ends (seconds). */
export function clipEnd(c: Clip): number {
	return c.start + clipDuration(c);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

class EditorStore {
	clips = $state<Clip[]>([]);
	selectedId = $state<string | null>(null);
	/** Master playhead, absolute timeline seconds. */
	playhead = $state(0);
	playing = $state(false);
	snapping = $state(true);
	pxPerSec = $state<number>(TIMELINE.defaultPxPerSec);
	/** True while a file is being dragged over the window (for the drop overlay). */
	dropActive = $state(false);
	/** Count of in-flight imports (for the busy indicator). */
	importing = $state(0);
	/** True while an export is running. */
	exporting = $state(false);
	/** Export progress, 0..1. */
	exportProgress = $state(0);
	/** Transient toast notice (export result, etc.). */
	notice = $state<{ text: string; kind: 'ok' | 'error' } | null>(null);
	/** Project output format. */
	aspectRatio = $state<AspectRatio>('original');

	/** Project length: the latest clip end across all tracks. */
	totalDuration = $derived(this.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0));
	selectedClip = $derived(this.clips.find((c) => c.id === this.selectedId) ?? null);

	/** Number of occupied lanes (0 if empty). */
	trackCount = $derived(
		this.clips.length ? Math.max(...this.clips.map((c) => c.track)) + 1 : 0
	);

	/** Clips visible at the playhead, ordered base-first (track ascending). */
	activeClips = $derived(
		this.clips
			.filter((c) => this.playhead >= c.start && this.playhead < clipEnd(c))
			.sort((a, b) => a.track - b.track || a.start - b.start)
	);

	/** Clips in stable timeline order (by start, then track) for prev/next nav. */
	private ordered() {
		return [...this.clips].sort((a, b) => a.start - b.start || a.track - b.track);
	}

	/** End of the content on a track (seconds); 0 if the track is empty. */
	private trackEnd(track: number): number {
		return this.clips.reduce((max, c) => (c.track === track ? Math.max(max, clipEnd(c)) : max), 0);
	}

	/** Local playhead time within a clip (seconds from its start). */
	localTime(c: Clip): number {
		return this.playhead - c.start;
	}

	/**
	 * Add a clip. `start`/`track` are optional: by default it lands on the base
	 * track right after the last clip there, so sequential imports line up.
	 */
	addClip(clip: Omit<Clip, 'start' | 'track'> & Partial<Pick<Clip, 'start' | 'track'>>) {
		const track = clip.track ?? 0;
		const full: Clip = { ...clip, track, start: clip.start ?? this.trackEnd(track) };
		this.clips.push(full);
		if (this.selectedId === null) this.select(full.id);
	}

	removeClip(id: string) {
		const idx = this.clips.findIndex((c) => c.id === id);
		if (idx === -1) return;
		this.clips.splice(idx, 1);
		if (this.selectedId === id) {
			const next = this.clips[idx] ?? this.clips[idx - 1] ?? null;
			this.selectedId = next?.id ?? null;
		}
	}

	removeSelected() {
		if (this.selectedId) this.removeClip(this.selectedId);
	}

	/** Select a clip; leaves the master playhead and playback untouched. */
	select(id: string | null) {
		this.selectedId = id;
	}

	selectPrev() {
		const order = this.ordered();
		const idx = order.findIndex((c) => c.id === this.selectedId);
		if (idx > 0) this.select(order[idx - 1].id);
	}

	selectNext() {
		const order = this.ordered();
		const idx = order.findIndex((c) => c.id === this.selectedId);
		if (idx >= 0 && idx < order.length - 1) this.select(order[idx + 1].id);
	}

	// ── Master playback clock ───────────────────────────────────
	private raf = 0;
	private lastTs = 0;

	play() {
		if (this.playing || this.clips.length === 0) return;
		// Restart from the top if parked at the very end.
		if (this.playhead >= this.totalDuration - 0.02) this.playhead = 0;
		this.playing = true;
		this.lastTs = performance.now();
		const step = () => {
			if (!this.playing) return;
			const now = performance.now();
			const dt = (now - this.lastTs) / 1000;
			this.lastTs = now;
			const t = this.playhead + dt;
			if (t >= this.totalDuration) {
				this.playhead = this.totalDuration;
				this.playing = false;
				return;
			}
			this.playhead = t;
			this.raf = requestAnimationFrame(step);
		};
		this.raf = requestAnimationFrame(step);
	}

	pause() {
		this.playing = false;
		cancelAnimationFrame(this.raf);
	}

	togglePlay() {
		if (this.playing) this.pause();
		else this.play();
	}

	toggleSnap() {
		this.snapping = !this.snapping;
	}

	/** Seek the master playhead to an absolute timeline position. */
	seek(seconds: number) {
		this.playhead = clamp(seconds, 0, this.totalDuration);
	}

	/** Nudge the master playhead by delta seconds (arrow keys). */
	stepBy(deltaSeconds: number) {
		this.seek(this.playhead + deltaSeconds);
	}

	zoomBy(factor: number) {
		this.pxPerSec = clamp(this.pxPerSec * factor, TIMELINE.minPxPerSec, TIMELINE.maxPxPerSec);
	}

	/** Split the selected clip at the playhead (if the playhead lies inside it). */
	splitAtPlayhead() {
		const c = this.selectedClip;
		if (!c) return;
		const local = this.localTime(c);
		if (local <= 0 || local >= clipDuration(c)) return;
		// Local timeline time -> source-time cut point.
		const cut = c.inPoint + local * c.speed;
		if (cut <= c.inPoint + CLIP.minDurationSec) return;
		if (cut >= c.outPoint - CLIP.minDurationSec) return;
		const idx = this.clips.findIndex((x) => x.id === c.id);
		const left: Clip = { ...c, id: crypto.randomUUID(), outPoint: cut };
		const right: Clip = {
			...c,
			id: crypto.randomUUID(),
			inPoint: cut,
			start: c.start + local
		};
		this.clips.splice(idx, 1, left, right);
		this.selectedId = right.id;
	}

	/** Move a clip to an absolute start and track (free drag on the timeline). */
	moveClipTo(id: string, start: number, track: number) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		c.start = Math.max(0, start);
		c.track = Math.max(0, Math.round(track));
	}

	/**
	 * Trim the start edge. Moves the in-point and shifts `start` by the same
	 * timeline amount, so the un-trimmed remainder stays anchored in place.
	 */
	setInPoint(id: string, sourceValue: number) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		let newIn = clamp(sourceValue, 0, c.outPoint - CLIP.minDurationSec);
		const speed = c.speed || 1;
		let newStart = c.start + (newIn - c.inPoint) / speed;
		if (newStart < 0) {
			// Clamp at the timeline origin and back out the in-point to match.
			newIn = c.inPoint - c.start * speed;
			newStart = 0;
		}
		c.inPoint = newIn;
		c.start = newStart;
	}

	/** Trim the end edge (source out-point); the start stays anchored. */
	setOutPoint(id: string, value: number) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		c.outPoint = clamp(value, c.inPoint + CLIP.minDurationSec, c.sourceDuration);
	}

	// ── Clip properties (act on the selected clip) ──────────────
	setVolume(v: number) {
		const c = this.selectedClip;
		if (c) c.volume = clamp(v, 0, 1);
	}

	toggleClipMute() {
		const c = this.selectedClip;
		if (c) c.muted = !c.muted;
	}

	setFadeIn(seconds: number) {
		const c = this.selectedClip;
		if (c) c.fadeInSec = clamp(seconds, 0, clipDuration(c));
	}

	setFadeOut(seconds: number) {
		const c = this.selectedClip;
		if (c) c.fadeOutSec = clamp(seconds, 0, clipDuration(c));
	}

	setSpeed(v: number) {
		const c = this.selectedClip;
		if (!c) return;
		c.speed = clamp(v, CLIP.minSpeed, CLIP.maxSpeed);
	}

	setAspectRatio(ar: AspectRatio) {
		this.aspectRatio = ar;
	}

	notify(text: string, kind: 'ok' | 'error' = 'ok') {
		this.notice = { text, kind };
	}

	/** Update a clip's viewport placement (drag / scale). */
	setTransform(id: string, t: Partial<Transform>) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		c.transform = {
			x: t.x ?? c.transform.x,
			y: t.y ?? c.transform.y,
			scale: t.scale !== undefined ? Math.max(0.05, t.scale) : c.transform.scale
		};
	}

	resetTransform(id: string) {
		const c = this.clips.find((x) => x.id === id);
		if (c) c.transform = { ...DEFAULT_TRANSFORM };
	}
}

export const editor = new EditorStore();
