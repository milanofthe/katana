<script lang="ts">
	import { editor, clipDuration, type Clip } from '$lib/editor/store.svelte';
	import { PLAYER, VIEWPORT } from '$lib/constants';

	interface Props {
		clip: Clip;
		/** Measured output-frame size (px). */
		fw: number;
		fh: number;
		/** Output frame aspect ratio (width / height). */
		frameRatio: number;
		selected: boolean;
		onselect: (id: string) => void;
		/** Report snap state up so the frame can draw center guides. */
		ondragstate: (s: { snapX: boolean; snapY: boolean; active: boolean }) => void;
	}

	let { clip, fw, fh, frameRatio, selected, onselect, ondragstate }: Props = $props();

	let video = $state<HTMLVideoElement>();

	// Placement of the clip's video inside the frame (px), from its transform.
	const box = $derived.by(() => {
		if (fw === 0 || fh === 0) return null;
		const fit =
			clip.aspectRatio > frameRatio
				? { w: fw, h: fw / clip.aspectRatio }
				: { w: fh * clip.aspectRatio, h: fh };
		const w = fit.w * clip.transform.scale;
		const h = fit.h * clip.transform.scale;
		const cx = fw / 2 + clip.transform.x * fw;
		const cy = fh / 2 + clip.transform.y * fh;
		return { w, h, left: cx - w / 2, top: cy - h / 2 };
	});

	// ── Drag to reposition (selects, then moves) ────────────────
	let dragging = $state(false);
	let startX = 0;
	let startY = 0;
	let baseTx = 0;
	let baseTy = 0;

	function onPointerDown(e: PointerEvent) {
		onselect(clip.id);
		dragging = true;
		startX = e.clientX;
		startY = e.clientY;
		baseTx = clip.transform.x;
		baseTy = clip.transform.y;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging || fw === 0 || fh === 0) return;
		let x = baseTx + (e.clientX - startX) / fw;
		let y = baseTy + (e.clientY - startY) / fh;
		const snapX = Math.abs(x) < VIEWPORT.snapThreshold;
		const snapY = Math.abs(y) < VIEWPORT.snapThreshold;
		if (snapX) x = 0;
		if (snapY) y = 0;
		editor.setTransform(clip.id, { x, y });
		ondragstate({ snapX, snapY, active: true });
	}

	function onPointerUp(e: PointerEvent) {
		dragging = false;
		ondragstate({ snapX: false, snapY: false, active: false });
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function onWheel(e: WheelEvent) {
		if (!selected) return;
		e.preventDefault();
		const next = clip.transform.scale - e.deltaY * VIEWPORT.scaleStep;
		editor.setTransform(clip.id, {
			scale: Math.max(VIEWPORT.minScale, Math.min(VIEWPORT.maxScale, next))
		});
	}

	// ── Playback sync (this clip's slice of the master clock) ───
	$effect(() => {
		const v = video;
		if (!v) return;
		if (editor.playing) v.play().catch(() => {});
		else v.pause();
	});

	$effect(() => {
		const v = video;
		if (v) v.playbackRate = clip.speed;
	});

	// Mute + base volume: only re-runs when those change, not per playback tick.
	$effect(() => {
		const v = video;
		if (!v) return;
		v.muted = clip.muted;
		if (clip.fadeInSec === 0 && clip.fadeOutSec === 0) v.volume = clip.volume;
	});

	// Fade ramp: per-tick, but does nothing when no fade is configured.
	$effect(() => {
		const v = video;
		if (!v) return;
		if (clip.fadeInSec === 0 && clip.fadeOutSec === 0) return;
		const dur = clipDuration(clip);
		const t = editor.localTime(clip);
		let fade = 1;
		if (clip.fadeInSec > 0 && t < clip.fadeInSec) fade = t / clip.fadeInSec;
		if (clip.fadeOutSec > 0 && t > dur - clip.fadeOutSec)
			fade = Math.min(fade, (dur - t) / clip.fadeOutSec);
		v.volume = Math.max(0, Math.min(1, clip.volume * fade));
	});

	// Keep the source time synced to the master playhead, throttled to one seek
	// per frame. Local timeline time scales by speed into source time.
	let seekRaf = 0;
	$effect(() => {
		const v = video;
		if (!v) return;
		const target = clip.inPoint + editor.localTime(clip) * clip.speed;
		if (Math.abs(v.currentTime - target) <= PLAYER.seekThresholdSec) return;
		cancelAnimationFrame(seekRaf);
		seekRaf = requestAnimationFrame(() => {
			v.currentTime = target;
		});
	});

	function onLoadedMeta() {
		if (video) video.currentTime = clip.inPoint + editor.localTime(clip) * clip.speed;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -- viewport canvas; keyboard handled via shortcuts -->
<!-- svelte-ignore a11y_media_has_caption -- editing preview, not a captioned content player -->
<video
	bind:this={video}
	src={clip.src}
	class="layer"
	class:selected
	class:dragging
	preload="metadata"
	style={box ? `left:${box.left}px;top:${box.top}px;width:${box.w}px;height:${box.h}px` : ''}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onwheel={onWheel}
	onloadedmetadata={onLoadedMeta}
></video>

<style>
	.layer {
		position: absolute;
		display: block;
		object-fit: fill;
		cursor: grab;
		touch-action: none;
	}
	.layer.selected {
		outline: var(--katana-border-width-thick) solid var(--katana-accent);
		outline-offset: calc(-1 * var(--katana-border-width-thick));
	}
	.layer.dragging {
		cursor: grabbing;
	}
</style>
