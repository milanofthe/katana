// Central reactive editor state (Svelte 5 runes). Single source of truth for
// the timeline EDL, playback and view. Editor components bind to this directly.
import { TIMELINE, CLIP } from '$lib/constants';

export type AspectRatio = 'original' | '16:9' | '9:16' | '1:1';

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
}

/** Untrimmed source span (seconds). */
export function clipSourceSpan(c: Clip): number {
	return Math.max(0, c.outPoint - c.inPoint);
}

/** Visible timeline length (seconds), shortened/lengthened by playback speed. */
export function clipDuration(c: Clip): number {
	return clipSourceSpan(c) / (c.speed || 1);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

class EditorStore {
	clips = $state<Clip[]>([]);
	selectedId = $state<string | null>(null);
	/** Playhead position within the selected clip, in timeline seconds. */
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

	totalDuration = $derived(this.clips.reduce((sum, c) => sum + clipDuration(c), 0));
	selectedClip = $derived(this.clips.find((c) => c.id === this.selectedId) ?? null);
	activeDuration = $derived(this.selectedClip ? clipDuration(this.selectedClip) : 0);

	/** Timeline offset (seconds) where the selected clip starts. */
	selectedStart = $derived.by(() => {
		let acc = 0;
		for (const c of this.clips) {
			if (c.id === this.selectedId) return acc;
			acc += clipDuration(c);
		}
		return 0;
	});
	/** Playhead position along the whole timeline, in seconds. */
	globalPlayhead = $derived(this.selectedStart + this.playhead);

	addClip(clip: Clip) {
		this.clips.push(clip);
		if (this.selectedId === null) this.select(clip.id);
	}

	removeClip(id: string) {
		const idx = this.clips.findIndex((c) => c.id === id);
		if (idx === -1) return;
		this.clips.splice(idx, 1);
		if (this.selectedId === id) {
			const next = this.clips[idx] ?? this.clips[idx - 1] ?? null;
			this.select(next?.id ?? null);
		}
	}

	removeSelected() {
		if (this.selectedId) this.removeClip(this.selectedId);
	}

	select(id: string | null) {
		this.selectedId = id;
		this.playhead = 0;
		this.playing = false;
	}

	selectPrev() {
		const idx = this.clips.findIndex((c) => c.id === this.selectedId);
		if (idx > 0) this.select(this.clips[idx - 1].id);
	}

	selectNext() {
		const idx = this.clips.findIndex((c) => c.id === this.selectedId);
		if (idx >= 0 && idx < this.clips.length - 1) this.select(this.clips[idx + 1].id);
	}

	togglePlay() {
		if (!this.selectedClip) return;
		// Starting from the very end of the timeline? Rewind first.
		if (!this.playing && this.globalPlayhead >= this.totalDuration - 0.05) {
			this.seekGlobal(0);
		}
		this.playing = !this.playing;
	}

	/** Advance to the next clip for continuous playback. False at the last clip. */
	advance(): boolean {
		const idx = this.clips.findIndex((c) => c.id === this.selectedId);
		if (idx >= 0 && idx < this.clips.length - 1) {
			this.selectedId = this.clips[idx + 1].id;
			this.playhead = 0;
			return true;
		}
		return false;
	}

	toggleSnap() {
		this.snapping = !this.snapping;
	}

	/** Seek within the active clip (timeline seconds). */
	seek(seconds: number) {
		this.playhead = clamp(seconds, 0, this.activeDuration);
	}

	/** Seek to a position on the whole timeline; selects the clip under it. */
	seekGlobal(globalSeconds: number) {
		if (this.clips.length === 0) return;
		const t = Math.max(0, globalSeconds);
		let acc = 0;
		for (let i = 0; i < this.clips.length; i++) {
			const c = this.clips[i];
			const d = clipDuration(c);
			if (t < acc + d || i === this.clips.length - 1) {
				this.selectedId = c.id;
				this.playhead = clamp(t - acc, 0, d);
				return;
			}
			acc += d;
		}
	}

	/** Nudge the global playhead by delta seconds (arrow keys). */
	stepBy(deltaSeconds: number) {
		this.seekGlobal(this.globalPlayhead + deltaSeconds);
	}

	zoomBy(factor: number) {
		this.pxPerSec = clamp(this.pxPerSec * factor, TIMELINE.minPxPerSec, TIMELINE.maxPxPerSec);
	}

	/** Split the active clip into two at the playhead. */
	splitAtPlayhead() {
		const c = this.selectedClip;
		if (!c) return;
		// Playhead is timeline time; convert to a source-time cut point.
		const splitPoint = c.inPoint + this.playhead * c.speed;
		if (splitPoint <= c.inPoint + CLIP.minDurationSec) return;
		if (splitPoint >= c.outPoint - CLIP.minDurationSec) return;
		const idx = this.clips.findIndex((x) => x.id === c.id);
		const left: Clip = { ...c, id: crypto.randomUUID(), outPoint: splitPoint };
		const right: Clip = { ...c, id: crypto.randomUUID(), inPoint: splitPoint };
		this.clips.splice(idx, 1, left, right);
		this.selectedId = right.id;
		this.playhead = 0;
	}

	/** Move a clip to a new position among the others (reorder by drag). */
	moveClip(id: string, toIndex: number) {
		const from = this.clips.findIndex((c) => c.id === id);
		if (from === -1) return;
		const [clip] = this.clips.splice(from, 1);
		const target = clamp(toIndex, 0, this.clips.length);
		this.clips.splice(target, 0, clip);
	}

	/** Trim handles (drag), clamped to keep a minimum length within the source. */
	setInPoint(id: string, value: number) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		c.inPoint = clamp(value, 0, c.outPoint - CLIP.minDurationSec);
	}

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
		// Timeline duration just changed; keep the playhead inside the clip.
		this.playhead = clamp(this.playhead, 0, clipDuration(c));
	}

	setAspectRatio(ar: AspectRatio) {
		this.aspectRatio = ar;
	}

	notify(text: string, kind: 'ok' | 'error' = 'ok') {
		this.notice = { text, kind };
	}
}

export const editor = new EditorStore();
