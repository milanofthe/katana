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
	seekThresholdSec: 0.25,
	/**
	 * If no video frame has driven the clock within this many ms, the wall-clock
	 * takes over (gaps / audio-only / stalled decode).
	 */
	frameLockStaleMs: 120,
	/**
	 * During playback, mount + pre-decode upcoming clips this many seconds before
	 * they start, so clip boundaries don't restart decoding (no stutter at cuts).
	 */
	lookaheadSec: 0.6,
	/**
	 * While scrubbing, the full-res <video> is re-seeked at most this often (ms)
	 * so the decoder isn't choked, but the preview still sharpens continuously
	 * (not only on release). The dense thumbnail LOD bridges the gaps between.
	 */
	scrubSeekThrottleMs: 90
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
	/**
	 * Captured strip frame width (px); height keeps the source aspect ratio.
	 * Low-res by design: the strip is a scrub-LOD / filmstrip proxy, not the
	 * full-res preview, so a modest width keeps a dense strip cheap in memory
	 * while staying sharp enough to bridge a scrub before the video catches up.
	 */
	width: 320,
	/**
	 * Target spacing between captured frames (seconds of source). Denser frames
	 * let the scrub LOD track the pointer smoothly instead of snapping in chunks.
	 */
	secondsPerFrame: 1.2,
	/** Frame-count clamp: floor keeps short clips usable, ceiling bounds memory. */
	minFrames: 16,
	maxFrames: 90,
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
	splitterPx: 6,
	/** Dragging a panel smaller than (min - this) snaps it to collapsed. */
	collapseSnapPx: 72,
	/** Thickness of the collapsed rail/bar that re-expands on click (px). */
	railPx: 22
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

export const TEXT = {
	/** Default on-screen duration of a freshly added text overlay (seconds). */
	defaultDurationSec: 10,
	/** Generous virtual source length so a text clip can be stretched on the timeline. */
	maxDurationSec: 3600,
	/** Default + bounds of the font size, expressed as a percentage of frame height
	 *  (resolution-independent, so preview and export agree at any output size). */
	defaultSizePct: 9,
	minSizePct: 2,
	maxSizePct: 40,
	/** Default style of a new overlay. */
	defaultContent: 'Text',
	defaultFontId: 'jakarta',
	defaultColor: '#ffffff',
	defaultWeight: 700,
	/** Outline width as a percentage of font size (0 = none); aids legibility. */
	defaultOutline: 0,
	maxOutlinePct: 20,
	defaultOutlineColor: '#000000'
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
