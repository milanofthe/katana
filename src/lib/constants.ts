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
	/** Minimum rendered clip width (px) so short clips stay selectable. */
	minClipWidthPx: 24,
	/** Snap distance (px) for the playhead near clip boundaries. */
	snapThresholdPx: 8,
	/** Below this clip width, hide trim handles so they don't cover the body. */
	minTrimWidthPx: 48
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
	minDurationSec: 0.1,
	/** Playback speed bounds. */
	minSpeed: 0.25,
	maxSpeed: 4
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

export const HISTORY = {
	/** Maximum number of undo steps kept; oldest are dropped beyond this. */
	maxEntries: 100,
	/** Idle delay (ms) before a wheel-scale gesture is committed as one step. */
	wheelCommitMs: 300
} as const;

export const LAYOUT = {
	/** Properties sidebar width (px) and drag bounds. */
	propsWidthDefault: 256,
	propsWidthMin: 200,
	propsWidthMax: 480,
	/** Timeline height (px) and drag bounds. */
	timelineHeightDefault: 220,
	timelineHeightMin: 120,
	timelineHeightMax: 560,
	/** Splitter thickness (px). */
	splitterPx: 6
} as const;

export const WAVEFORM = {
	/** Peak buckets sampled per source for the timeline waveform. */
	resolution: 1200,
	/** Max samples inspected per bucket (stride caps the one-time decode cost). */
	maxSamplesPerBucket: 64,
	/** Waveform opacity when drawn over the filmstrip. */
	alpha: 0.55
} as const;

export const AUDIO_SCRUB = {
	/** Grain length played per scrub tick (seconds). */
	grainSec: 0.12,
	/** Fade in/out of each grain to avoid clicks (seconds). */
	grainFadeSec: 0.012,
	/** Minimum interval between scrub grains (ms). */
	throttleMs: 55
} as const;

export const VIEWPORT = {
	/** Snap distance (normalized to viewport size) when dragging near center/edges. */
	snapThreshold: 0.025,
	/** Clip scale bounds in the viewport. */
	minScale: 0.1,
	maxScale: 4,
	/** Scale change per unit of wheel deltaY. */
	scaleStep: 0.0015
} as const;
