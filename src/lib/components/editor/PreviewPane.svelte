<script lang="ts">
	import { Icon, IconButton } from '$lib';
	import { editor, clipDuration, type AspectRatio } from '$lib/editor/store.svelte';
	import { PLAYER, VIEWPORT } from '$lib/constants';

	let video = $state<HTMLVideoElement>();
	const clip = $derived(editor.selectedClip);

	const formats: { value: AspectRatio; label: string }[] = [
		{ value: 'original', label: 'Orig' },
		{ value: '16:9', label: '16:9' },
		{ value: '9:16', label: '9:16' },
		{ value: '1:1', label: '1:1' }
	];

	// Output frame aspect ratio: the chosen format, or the clip's own ratio.
	const frameRatio = $derived(
		editor.aspectRatio === '16:9'
			? 16 / 9
			: editor.aspectRatio === '9:16'
				? 9 / 16
				: editor.aspectRatio === '1:1'
					? 1
					: (clip?.aspectRatio ?? 16 / 9)
	);

	// Measured frame size (px), used to turn the normalized transform into layout.
	let fw = $state(0);
	let fh = $state(0);

	// Placement of the clip's video inside the frame (px), from its transform.
	const box = $derived.by(() => {
		const c = clip;
		if (!c || fw === 0 || fh === 0) return null;
		// Contain-fit baseline: largest box of the clip's ratio inside the frame.
		const fit =
			c.aspectRatio > frameRatio
				? { w: fw, h: fw / c.aspectRatio }
				: { w: fh * c.aspectRatio, h: fh };
		const w = fit.w * c.transform.scale;
		const h = fit.h * c.transform.scale;
		const cx = fw / 2 + c.transform.x * fw;
		const cy = fh / 2 + c.transform.y * fh;
		return { w, h, left: cx - w / 2, top: cy - h / 2 };
	});

	// Snap guides shown while a snapped axis is held during a drag.
	let dragging = $state(false);
	let snapX = $state(false);
	let snapY = $state(false);

	// ── Drag to reposition ──────────────────────────────────────
	let startX = 0;
	let startY = 0;
	let baseTx = 0;
	let baseTy = 0;

	function onPointerDown(e: PointerEvent) {
		if (!clip) return;
		dragging = true;
		startX = e.clientX;
		startY = e.clientY;
		baseTx = clip.transform.x;
		baseTy = clip.transform.y;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging || !clip || fw === 0 || fh === 0) return;
		let x = baseTx + (e.clientX - startX) / fw;
		let y = baseTy + (e.clientY - startY) / fh;
		snapX = Math.abs(x) < VIEWPORT.snapThreshold;
		snapY = Math.abs(y) < VIEWPORT.snapThreshold;
		if (snapX) x = 0;
		if (snapY) y = 0;
		editor.setTransform(clip.id, { x, y });
	}

	function onPointerUp(e: PointerEvent) {
		dragging = false;
		snapX = false;
		snapY = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	// ── Wheel to scale ──────────────────────────────────────────
	function onWheel(e: WheelEvent) {
		if (!clip) return;
		e.preventDefault();
		const next = clip.transform.scale - e.deltaY * VIEWPORT.scaleStep;
		editor.setTransform(clip.id, {
			scale: Math.max(VIEWPORT.minScale, Math.min(VIEWPORT.maxScale, next))
		});
	}

	const transformed = $derived(
		!!clip && (clip.transform.x !== 0 || clip.transform.y !== 0 || clip.transform.scale !== 1)
	);

	// Play/pause follows the store.
	$effect(() => {
		const v = video;
		if (!v) return;
		if (editor.playing) v.play().catch(() => {});
		else v.pause();
	});

	// Playback rate follows clip speed.
	$effect(() => {
		const v = video;
		const c = clip;
		if (v && c) v.playbackRate = c.speed;
	});

	// Mute + base volume: only re-runs when those change, not per playback tick.
	$effect(() => {
		const v = video;
		const c = clip;
		if (!v || !c) return;
		v.muted = c.muted;
		if (c.fadeInSec === 0 && c.fadeOutSec === 0) v.volume = c.volume;
	});

	// Fade ramp: per-tick, but does nothing when no fade is configured.
	$effect(() => {
		const v = video;
		const c = clip;
		if (!v || !c) return;
		if (c.fadeInSec === 0 && c.fadeOutSec === 0) return;
		const dur = clipDuration(c);
		const t = editor.playhead;
		let fade = 1;
		if (c.fadeInSec > 0 && t < c.fadeInSec) fade = t / c.fadeInSec;
		if (c.fadeOutSec > 0 && t > dur - c.fadeOutSec) fade = Math.min(fade, (dur - t) / c.fadeOutSec);
		v.volume = Math.max(0, Math.min(1, c.volume * fade));
	});

	// Keep video time synced to the playhead (skip/scrub), throttled to one seek
	// per frame. Playhead is timeline time; the source time scales by speed.
	let seekRaf = 0;
	$effect(() => {
		const v = video;
		const c = clip;
		if (!v || !c) return;
		const target = c.inPoint + editor.playhead * c.speed;
		if (Math.abs(v.currentTime - target) <= PLAYER.seekThresholdSec) return;
		cancelAnimationFrame(seekRaf);
		seekRaf = requestAnimationFrame(() => {
			v.currentTime = target;
		});
	});

	function onLoadedMeta() {
		if (video && clip) video.currentTime = clip.inPoint + editor.playhead * clip.speed;
	}

	function onTimeUpdate() {
		if (!video || !clip) return;
		editor.playhead = (video.currentTime - clip.inPoint) / clip.speed;
		// At the trim out-point: continue into the next clip, or stop at the end.
		if (video.currentTime >= clip.outPoint) {
			if (!editor.advance()) editor.playing = false;
		}
	}

	function onEnded() {
		editor.playing = false;
	}
</script>

<div class="preview-pane">
	<div class="toolbar">
		<div class="segmented" role="group" aria-label="Output format">
			{#each formats as f (f.value)}
				<button
					class="seg"
					class:active={editor.aspectRatio === f.value}
					onclick={() => editor.setAspectRatio(f.value)}
				>
					{f.label}
				</button>
			{/each}
		</div>
		<IconButton
			icon="reset"
			label="Reset placement"
			size="sm"
			disabled={!transformed}
			onclick={() => clip && editor.resetTransform(clip.id)}
		/>
	</div>

	<div class="stage">
		{#if clip}
			<div class="frame" style="aspect-ratio: {frameRatio}" bind:clientWidth={fw} bind:clientHeight={fh}>
				<!-- svelte-ignore a11y_no_static_element_interactions -- viewport canvas; keyboard handled via shortcuts -->
				<!-- svelte-ignore a11y_media_has_caption -- editing preview, not a captioned content player -->
				<video
					bind:this={video}
					src={clip.src}
					class="video"
					class:dragging
					preload="metadata"
					style={box ? `left:${box.left}px;top:${box.top}px;width:${box.w}px;height:${box.h}px` : ''}
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={onPointerUp}
					onwheel={onWheel}
					onloadedmetadata={onLoadedMeta}
					ontimeupdate={onTimeUpdate}
					onended={onEnded}
				></video>
				{#if dragging && snapX}
					<div class="guide guide-v"></div>
				{/if}
				{#if dragging && snapY}
					<div class="guide guide-h"></div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<Icon name="film" size={48} />
				<p class="empty-text">No media. Import a video to begin.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.preview-pane {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		background: var(--katana-bg-base);
		padding: var(--katana-space-4);
		gap: var(--katana-space-3);
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--katana-space-3);
	}

	/* Format segmented control (project-level output format). */
	.segmented {
		display: flex;
		gap: var(--katana-space-1);
	}
	.seg {
		height: var(--katana-control-sm);
		min-width: 3rem;
		padding: 0 var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-secondary);
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		cursor: pointer;
		transition:
			background var(--katana-duration-fast) var(--katana-ease-out),
			color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.seg:hover {
		background: var(--katana-bg-overlay);
		color: var(--katana-text-primary);
	}
	.seg.active {
		background: var(--katana-accent);
		border-color: var(--katana-accent);
		color: var(--katana-accent-contrast);
	}

	.stage {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: center;
		justify-content: center;
	}

	/* The output frame: a letterboxed canvas at the project aspect ratio. */
	.frame {
		position: relative;
		max-width: 100%;
		max-height: 100%;
		height: 100%;
		background: #000000;
		border-radius: var(--katana-radius-md);
		overflow: hidden;
	}

	.video {
		position: absolute;
		display: block;
		object-fit: fill;
		cursor: grab;
		touch-action: none;
	}
	.video.dragging {
		cursor: grabbing;
	}

	/* Center snap guides shown while an axis is snapped during a drag. */
	.guide {
		position: absolute;
		background: var(--katana-accent);
		pointer-events: none;
		z-index: var(--katana-z-overlay);
	}
	.guide-v {
		top: 0;
		bottom: 0;
		left: 50%;
		width: var(--katana-border-width);
		transform: translateX(-50%);
	}
	.guide-h {
		left: 0;
		right: 0;
		top: 50%;
		height: var(--katana-border-width);
		transform: translateY(-50%);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--katana-space-4);
		color: var(--katana-text-muted);
	}

	.empty-text {
		font-family: var(--katana-font-sans);
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-regular);
		color: var(--katana-text-muted);
		margin: 0;
	}
</style>
