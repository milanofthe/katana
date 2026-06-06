// Central reactive editor state (Svelte 5 runes). Single source of truth for
// the timeline EDL, playback and view. Editor components bind to this directly.
import { TIMELINE } from '$lib/constants';

export interface Clip {
	id: string;
	/** Asset URL the <video> can load (from convertFileSrc). */
	src: string;
	/** Original file path on disk (for FFmpeg later). */
	path: string;
	name: string;
	/** Trim handles, in seconds into the source media. */
	inPoint: number;
	outPoint: number;
	/** Optional preview frame. Real thumbnails come from FFmpeg later. */
	thumbnail?: string;
}

/** Visible (trimmed) length of a clip in seconds. */
export function clipDuration(c: Clip): number {
	return Math.max(0, c.outPoint - c.inPoint);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

class EditorStore {
	clips = $state<Clip[]>([]);
	selectedId = $state<string | null>(null);
	/** Playhead position within the selected clip, in seconds. */
	playhead = $state(0);
	playing = $state(false);
	snapping = $state(true);
	pxPerSec = $state<number>(TIMELINE.defaultPxPerSec);

	totalDuration = $derived(this.clips.reduce((sum, c) => sum + clipDuration(c), 0));
	selectedClip = $derived(this.clips.find((c) => c.id === this.selectedId) ?? null);
	/** Trimmed length of the active clip, used for the transport readout. */
	activeDuration = $derived(this.selectedClip ? clipDuration(this.selectedClip) : 0);

	addClip(clip: Clip) {
		this.clips.push(clip);
		// Auto-select the first imported clip so the preview has something to show.
		if (this.selectedId === null) {
			this.select(clip.id);
		}
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

	select(id: string | null) {
		this.selectedId = id;
		this.playhead = 0;
		this.playing = false;
	}

	togglePlay() {
		if (!this.selectedClip) return;
		this.playing = !this.playing;
	}

	toggleSnap() {
		this.snapping = !this.snapping;
	}

	/** Seek within the active clip (seconds). */
	seek(seconds: number) {
		this.playhead = clamp(seconds, 0, this.activeDuration);
	}

	zoomBy(factor: number) {
		this.pxPerSec = clamp(this.pxPerSec * factor, TIMELINE.minPxPerSec, TIMELINE.maxPxPerSec);
	}
}

export const editor = new EditorStore();
