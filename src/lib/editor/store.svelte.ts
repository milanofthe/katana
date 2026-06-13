// Central reactive editor state (Svelte 5 runes). Single source of truth for
// the multi-track timeline, compositing and playback. Editor components bind to
// this directly.
//
// Time model: every clip has an absolute `start` on a shared master timeline
// (seconds) and a `track` (z-order lane, higher = rendered on top). Clips may
// overlap in time; the master playhead drives a single clock and every visible
// clip syncs its <video> to it.
import { TIMELINE, CLIP, HISTORY, LAYOUT, PLAYER, TEXT } from '$lib/constants';
import { IntervalIndex } from './intervals';

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

/** Track kind. Video + text composite (z-order); audio clips only mix. */
export type ClipKind = 'video' | 'audio' | 'text';

export type TextAlign = 'left' | 'center' | 'right';

/** Styling of a text overlay (only set on `kind: 'text'` clips). */
export interface TextStyle {
	content: string;
	/** Font id referencing the bundled font manifest (see lib/text/fonts.ts). */
	fontId: string;
	/** Font size as a percentage of the output frame height (resolution-independent). */
	sizePct: number;
	/** Fill colour, hex #RRGGBB. */
	color: string;
	align: TextAlign;
	/** Font weight (400 / 600 / 700). */
	weight: number;
	/** Outline width as a percentage of font size (0 = none). */
	outline: number;
	outlineColor: string;
}

export interface Clip {
	id: string;
	/** Whether this clip carries video (composited) or is audio-only (mixed). */
	kind: ClipKind;
	/** Asset URL the <video>/<audio> can load (from convertFileSrc). */
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
	/** Source frame rate (fps); 0 for audio/text. Drives the project frame rate. */
	fps: number;
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
	/** Text styling; present only on `kind: 'text'` clips. */
	text?: TextStyle;
}

/** A fresh text style with the configured defaults. */
export function defaultTextStyle(): TextStyle {
	return {
		content: TEXT.defaultContent,
		fontId: TEXT.defaultFontId,
		sizePct: TEXT.defaultSizePct,
		color: TEXT.defaultColor,
		align: 'center',
		weight: TEXT.defaultWeight,
		outline: TEXT.defaultOutline,
		outlineColor: TEXT.defaultOutlineColor
	};
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

/** Source media time for a clip at a local timeline offset (seconds from start).
 * The single mapping between timeline time and source time (speed-aware). */
export function clipSourceTime(c: Clip, localTimelineSeconds: number): number {
	return c.inPoint + localTimelineSeconds * (c.speed || 1);
}

/** Index of the nearest captured thumbnail for a local timeline offset. */
export function clipFrameIndex(c: Clip, localTimelineSeconds: number): number {
	const n = c.thumbnails.length;
	if (n === 0) return 0;
	const frac = c.sourceDuration > 0 ? clipSourceTime(c, localTimelineSeconds) / c.sourceDuration : 0;
	return Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Undoable slice of the editor: the document, not the transient view/clock. */
interface Snapshot {
	clips: Clip[];
	aspectRatio: AspectRatio;
	selectedId: string | null;
}

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
	/** True while the playhead is being scrubbed (enables instant LOD preview). */
	scrubbing = $state(false);
	/** Count of in-flight imports (for the busy indicator). */
	importing = $state(0);
	/** True while the export dialog modal is open. */
	exportDialogOpen = $state(false);
	/** True while an export is running. */
	exporting = $state(false);
	/** Export progress, 0..1. */
	exportProgress = $state(0);
	/** Transient toast notice (export result, etc.). */
	notice = $state<{ text: string; kind: 'ok' | 'error' } | null>(null);
	/** Project output format. */
	aspectRatio = $state<AspectRatio>('original');
	/** Peak data per source path for the timeline waveform (not undoable). */
	waveforms = $state<Record<string, number[]>>({});

	// ── UI layout (resizable / collapsible panels; not undoable) ─
	propsWidth = $state<number>(LAYOUT.propsWidthDefault);
	propsCollapsed = $state(false);
	timelineHeight = $state<number>(LAYOUT.timelineHeightDefault);
	timelineCollapsed = $state(false);
	/** Explicit lane counts (added via the timeline "+ track" buttons). */
	videoTracks = $state(1);
	audioTracks = $state(0);
	textTracks = $state(0);

	/** Project length: the latest clip end across all tracks. */
	totalDuration = $derived(this.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0));

	/** Project frame rate: the fastest video clip's fps (others are frame-held to
	 * it). Falls back to the default when there is no probed video. */
	projectFps = $derived.by(() => {
		const rates = this.clips.filter((c) => c.kind === 'video' && c.fps > 0).map((c) => c.fps);
		return rates.length ? Math.max(...rates) : PLAYER.fps;
	});
	selectedClip = $derived(this.clips.find((c) => c.id === this.selectedId) ?? null);

	private trackCountFor(kind: ClipKind): number {
		const tracks = this.clips.filter((c) => c.kind === kind).map((c) => c.track);
		return tracks.length ? Math.max(...tracks) + 1 : 0;
	}

	/** Lanes shown per section: the explicit count, never fewer than occupied. */
	videoLaneCount = $derived(Math.max(this.videoTracks, this.trackCountFor('video')));
	audioLaneCount = $derived(Math.max(this.audioTracks, this.trackCountFor('audio')));
	textLaneCount = $derived(Math.max(this.textTracks, this.trackCountFor('text')));

	/** Add an empty lane to a section (timeline "+ track" buttons). */
	addVideoTrack() {
		this.videoTracks = this.videoLaneCount + 1;
	}
	addAudioTrack() {
		this.audioTracks = this.audioLaneCount + 1;
	}
	addTextTrack() {
		this.textTracks = this.textLaneCount + 1;
	}

	/** Remove an empty lane; lanes above it slide down to close the gap. No-op if occupied. */
	removeVideoTrack(track: number) {
		this.removeTrack('video', track);
	}
	removeAudioTrack(track: number) {
		this.removeTrack('audio', track);
	}
	removeTextTrack(track: number) {
		this.removeTrack('text', track);
	}
	private removeTrack(kind: ClipKind, track: number) {
		if (this.clips.some((c) => c.kind === kind && c.track === track)) return;
		const above = this.clips.filter((c) => c.kind === kind && c.track > track);
		if (above.length) {
			this.recordBefore();
			for (const c of above) c.track -= 1;
		}
		if (kind === 'video') this.videoTracks = Math.max(0, this.videoLaneCount - 1);
		else if (kind === 'audio') this.audioTracks = Math.max(0, this.audioLaneCount - 1);
		else this.textTracks = Math.max(0, this.textLaneCount - 1);
	}

	/** Interval index over clip [start, end); rebuilt only when clips change. */
	private clipIndex = $derived(
		new IntervalIndex(this.clips.map((c) => ({ start: c.start, end: clipEnd(c), clip: c })))
	);

	/** All clips active at the playhead, ordered base-first (track ascending).
	 * O(log n + k) per frame via the interval index, not a full filter+sort. */
	activeClips = $derived(
		this.clipIndex
			.query(this.playhead)
			.map((e) => e.clip)
			.sort((a, b) => a.track - b.track || a.start - b.start)
	);
	/** Active video clips, base-first (for the compositing viewport). */
	activeVideoClips = $derived(this.activeClips.filter((c) => c.kind === 'video'));

	/** Video layers to mount: active clips plus (while playing) upcoming clips
	 * within the look-ahead window, so cuts don't restart decoding. */
	videoLayers = $derived.by(() => {
		const t = this.playhead;
		const look = this.playing ? PLAYER.lookaheadSec : 0;
		return this.clips
			.filter((c) => c.kind === 'video' && clipEnd(c) > t && c.start <= t + look)
			.sort((a, b) => a.track - b.track || a.start - b.start);
	});
	/** Active audio clips (for hidden audio playback). */
	activeAudioClips = $derived(this.activeClips.filter((c) => c.kind === 'audio'));
	/** Active text overlays, base-first; composited on top of all video layers. */
	activeTextClips = $derived(this.activeClips.filter((c) => c.kind === 'text'));

	// ── Undo / redo history (snapshot-based) ────────────────────
	private undoStack = $state<Snapshot[]>([]);
	private redoStack = $state<Snapshot[]>([]);
	/** Open-transaction state: coalesces a gesture into one history step. */
	private inTransaction = false;
	private txnDirty = false;
	private txnStart: Snapshot | null = null;

	canUndo = $derived(this.undoStack.length > 0);
	canRedo = $derived(this.redoStack.length > 0);

	private snapshot(): Snapshot {
		return {
			clips: $state.snapshot(this.clips) as Clip[],
			aspectRatio: this.aspectRatio,
			selectedId: this.selectedId
		};
	}

	private applySnapshot(s: Snapshot) {
		this.clips = structuredClone(s.clips);
		this.aspectRatio = s.aspectRatio;
		this.selectedId = this.clips.some((c) => c.id === s.selectedId) ? s.selectedId : null;
		this.playhead = Math.min(this.playhead, this.totalDuration);
	}

	/** Capture the pre-mutation state. Called at the top of every edit. */
	private recordBefore() {
		if (this.inTransaction) {
			this.txnDirty = true;
			return;
		}
		this.undoStack.push(this.snapshot());
		if (this.undoStack.length > HISTORY.maxEntries) this.undoStack.shift();
		this.redoStack = [];
	}

	/** Begin a gesture (drag/slider): edits until endTransaction become one step. */
	beginTransaction() {
		if (this.inTransaction) return;
		this.inTransaction = true;
		this.txnDirty = false;
		this.txnStart = this.snapshot();
	}

	endTransaction() {
		if (!this.inTransaction) return;
		this.inTransaction = false;
		if (this.txnDirty && this.txnStart) {
			this.undoStack.push(this.txnStart);
			if (this.undoStack.length > HISTORY.maxEntries) this.undoStack.shift();
			this.redoStack = [];
		}
		this.txnStart = null;
	}

	undo() {
		const prev = this.undoStack.pop();
		if (!prev) return;
		this.pause();
		this.redoStack.push(this.snapshot());
		this.applySnapshot(prev);
	}

	redo() {
		const next = this.redoStack.pop();
		if (!next) return;
		this.pause();
		this.undoStack.push(this.snapshot());
		this.applySnapshot(next);
	}

	/** Clips in stable timeline order (by start, then track) for prev/next nav. */
	private ordered() {
		return [...this.clips].sort((a, b) => a.start - b.start || a.track - b.track);
	}

	/** End of content on a kind's track (seconds); 0 if empty. */
	private trackEnd(kind: ClipKind, track: number): number {
		return this.clips.reduce(
			(max, c) => (c.kind === kind && c.track === track ? Math.max(max, clipEnd(c)) : max),
			0
		);
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
		this.recordBefore();
		const track = clip.track ?? 0;
		const full: Clip = { ...clip, track, start: clip.start ?? this.trackEnd(clip.kind, track) };
		this.clips.push(full);
		if (this.selectedId === null) this.select(full.id);
	}

	/** Split the selected video clip's audio into a separate audio clip and mute
	 * the original's audio. No-op for audio clips or already-muted ones. */
	detachAudio(id: string) {
		const v = this.clips.find((c) => c.id === id);
		if (!v || v.kind !== 'video' || v.muted) return;
		this.recordBefore();
		const audio: Clip = {
			...v,
			id: crypto.randomUUID(),
			kind: 'audio',
			track: this.audioLaneCount, // new lane below existing audio
			transform: { ...DEFAULT_TRANSFORM },
			thumbnails: []
		};
		v.muted = true;
		this.clips.push(audio);
		this.selectedId = audio.id;
	}

	/** Add a text overlay at a timeline position (defaults to the playhead). It
	 * composites on top of the video; its on-screen span is editable via trim. */
	addText(start = this.playhead) {
		if (this.textTracks < 1) this.textTracks = 1;
		const id = crypto.randomUUID();
		this.addClip({
			id,
			kind: 'text',
			src: '',
			path: '',
			name: TEXT.defaultContent,
			sourceDuration: TEXT.maxDurationSec,
			inPoint: 0,
			outPoint: TEXT.defaultDurationSec,
			start,
			track: 0,
			aspectRatio: 16 / 9,
			fps: 0,
			thumbnails: [],
			volume: 0,
			muted: true,
			fadeInSec: 0,
			fadeOutSec: 0,
			speed: 1,
			transform: { ...DEFAULT_TRANSFORM },
			text: defaultTextStyle()
		});
		this.select(id);
	}

	/** Update the selected text overlay's content (also keeps its timeline label). */
	setTextContent(content: string) {
		const c = this.selectedClip;
		if (!c || !c.text) return;
		this.recordBefore();
		c.text = { ...c.text, content };
		c.name = content.trim() || TEXT.defaultContent;
	}

	/** Patch one or more style fields of the selected text overlay. */
	setTextStyle(patch: Partial<TextStyle>) {
		const c = this.selectedClip;
		if (!c || !c.text) return;
		this.recordBefore();
		c.text = { ...c.text, ...patch };
	}

	removeClip(id: string) {
		const idx = this.clips.findIndex((c) => c.id === id);
		if (idx === -1) return;
		this.recordBefore();
		this.clips.splice(idx, 1);
		if (this.selectedId === id) {
			const next = this.clips[idx] ?? this.clips[idx - 1] ?? null;
			this.selectedId = next?.id ?? null;
		}
	}

	removeSelected() {
		if (this.selectedId) this.removeClip(this.selectedId);
	}

	/** Replace the whole document with a loaded project. Clears history + caches;
	 * the caller regenerates thumbnails/waveforms from each clip's path. */
	loadProject(clips: Clip[], aspectRatio: AspectRatio) {
		this.pause();
		this.clips = clips;
		this.aspectRatio = aspectRatio;
		this.videoTracks = Math.max(1, this.trackCountFor('video'));
		this.audioTracks = this.trackCountFor('audio');
		this.textTracks = this.trackCountFor('text');
		this.selectedId = clips[0]?.id ?? null;
		this.playhead = 0;
		this.waveforms = {};
		this.undoStack = [];
		this.redoStack = [];
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
	// The base video drives the playhead frame-accurately via reportFrameTime
	// (requestVideoFrameCallback); the wall-clock rAF takes over for gaps,
	// audio-only stretches, or stalled decode.
	private raf = 0;
	private lastTs = 0;
	private lastFrameReport = 0;

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
			// Advance by wall-clock only when no recent video frame drove the clock.
			if (now - this.lastFrameReport >= PLAYER.frameLockStaleMs) {
				const t = this.playhead + dt;
				if (t >= this.totalDuration) {
					this.playhead = this.totalDuration;
					this.playing = false;
					return;
				}
				this.playhead = t;
			}
			this.raf = requestAnimationFrame(step);
		};
		this.raf = requestAnimationFrame(step);
	}

	/** Lock the master playhead to the base video's actual presented frame. */
	reportFrameTime(timelineSeconds: number) {
		if (!this.playing) return;
		this.lastFrameReport = performance.now();
		if (timelineSeconds >= this.totalDuration) {
			this.playhead = this.totalDuration;
			this.pause();
			return;
		}
		this.playhead = Math.max(0, timelineSeconds);
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

	/** Step the playhead by whole frames, snapped to the project frame grid.
	 * Pauses first so the exact frame is shown (precise paused seek). */
	stepByFrames(frames: number) {
		this.pause();
		const fps = this.projectFps;
		const f = Math.round(this.playhead * fps);
		this.seek((f + frames) / fps);
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
		const cut = clipSourceTime(c, local);
		if (cut <= c.inPoint + CLIP.minDurationSec) return;
		if (cut >= c.outPoint - CLIP.minDurationSec) return;
		this.recordBefore();
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
		this.recordBefore();
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
		this.recordBefore();
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
		this.recordBefore();
		c.outPoint = clamp(value, c.inPoint + CLIP.minDurationSec, c.sourceDuration);
	}

	// ── Clip properties (act on the selected clip) ──────────────
	setVolume(v: number) {
		const c = this.selectedClip;
		if (!c) return;
		this.recordBefore();
		c.volume = clamp(v, 0, 1);
	}

	toggleClipMute() {
		const c = this.selectedClip;
		if (!c) return;
		this.recordBefore();
		c.muted = !c.muted;
	}

	setFadeIn(seconds: number) {
		const c = this.selectedClip;
		if (!c) return;
		this.recordBefore();
		c.fadeInSec = clamp(seconds, 0, clipDuration(c));
	}

	setFadeOut(seconds: number) {
		const c = this.selectedClip;
		if (!c) return;
		this.recordBefore();
		c.fadeOutSec = clamp(seconds, 0, clipDuration(c));
	}

	setSpeed(v: number) {
		const c = this.selectedClip;
		if (!c) return;
		this.recordBefore();
		c.speed = clamp(v, CLIP.minSpeed, CLIP.maxSpeed);
	}

	setAspectRatio(ar: AspectRatio) {
		if (this.aspectRatio === ar) return;
		this.recordBefore();
		this.aspectRatio = ar;
	}

	notify(text: string, kind: 'ok' | 'error' = 'ok') {
		this.notice = { text, kind };
	}

	// ── Layout setters ──────────────────────────────────────────
	setPropsWidth(px: number) {
		this.propsWidth = clamp(px, LAYOUT.propsWidthMin, LAYOUT.propsWidthMax);
	}
	togglePropsCollapsed() {
		this.propsCollapsed = !this.propsCollapsed;
	}
	setTimelineHeight(px: number) {
		this.timelineHeight = clamp(px, LAYOUT.timelineHeightMin, LAYOUT.timelineHeightMax);
	}
	toggleTimelineCollapsed() {
		this.timelineCollapsed = !this.timelineCollapsed;
	}

	/** Store extracted waveform peaks for a source path (keyed by clip.path). */
	setWaveform(path: string, peaks: number[]) {
		this.waveforms[path] = peaks;
	}

	/** Attach extracted thumbnails to a clip once they arrive (not undoable). */
	setThumbnails(id: string, thumbnails: string[]) {
		const c = this.clips.find((x) => x.id === id);
		if (c) c.thumbnails = thumbnails;
	}

	/** Update a clip's viewport placement (drag / scale). */
	setTransform(id: string, t: Partial<Transform>) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		this.recordBefore();
		c.transform = {
			x: t.x ?? c.transform.x,
			y: t.y ?? c.transform.y,
			scale: t.scale !== undefined ? Math.max(0.05, t.scale) : c.transform.scale
		};
	}

	resetTransform(id: string) {
		const c = this.clips.find((x) => x.id === id);
		if (!c) return;
		this.recordBefore();
		c.transform = { ...DEFAULT_TRANSFORM };
	}
}

export const editor = new EditorStore();
