// Centralized app constants (non-design logic values).
// Design tokens (colors, sizes, spacing) live in design/tokens.css + theme.ts.

export const TIMELINE = {
	/** Default horizontal zoom: pixels per second of media. */
	defaultPxPerSec: 24,
	/** Zoom bounds (pixels per second). */
	minPxPerSec: 6,
	maxPxPerSec: 240,
	/** Multiplicative zoom step per wheel notch / zoom-button press. */
	zoomStep: 1.15,
	/** Preferred pixel spacing between ruler ticks; the interval is chosen near this. */
	rulerTickTargetPx: 96,
	/**
	 * Uniform spacing (px) around and between clip snippets — identical in every
	 * direction (top, bottom, left, right, and between clips). Must match the CSS
	 * token --katana-timeline-gutter.
	 */
	gutterPx: 8,
	/** Minimum rendered clip width (px) so short clips stay legible. */
	minClipWidthPx: 8
} as const;

export const PLAYER = {
	/**
	 * Re-seek the <video> only when the playhead diverges by more than this many
	 * seconds. Prevents a feedback loop between timeupdate -> playhead -> seek.
	 */
	seekThresholdSec: 0.25
} as const;

export const SEEK = {
	/** Arrow-key playhead step (seconds). */
	stepSec: 1,
	/** Shift+arrow playhead step (seconds). */
	bigStepSec: 5
} as const;

export const CLIP = {
	/** Minimum clip length kept when trimming or splitting (seconds). */
	minDurationSec: 0.1
} as const;

export const THUMB = {
	/** Captured preview frame width (px); height keeps the source aspect ratio. */
	width: 240,
	/** Number of frames captured evenly across the source for the filmstrip. */
	frameCount: 10,
	/** Assumed filmstrip height (px) used for slot math; tracks the clip thumb height. */
	stripHeightPx: 88
} as const;

export const REORDER = {
	/** Pointer travel (px) before a clip click turns into a reorder drag. */
	dragThresholdPx: 4
} as const;
