<script lang="ts">
	import { Icon, IconButton } from '$lib';
	import { editor, clipDuration, clipEnd, type Clip } from '$lib/editor/store.svelte';
	import { formatTimecode } from '$lib/editor/time';
	import { TIMELINE, REORDER, THUMB } from '$lib/constants';

	// Frames for a clip's filmstrip: one per AR-correct slot across its width,
	// each showing the captured frame nearest that timeline position. Reacts to
	// trim (inPoint/duration) and zoom (width).
	function filmstripFrames(clip: Clip, widthPx: number): string[] {
		const frames = clip.thumbnails;
		if (!frames || frames.length === 0) return [];
		const ar = clip.aspectRatio || 16 / 9;
		const frameW = THUMB.stripHeightPx * ar;
		const slots = Math.max(1, Math.ceil(widthPx / frameW) + 1);
		const span = clip.outPoint - clip.inPoint; // source-time span (speed-independent)
		const out: string[] = [];
		for (let i = 0; i < slots; i++) {
			const t = clip.inPoint + ((i + 0.5) / slots) * span;
			const frac = clip.sourceDuration > 0 ? t / clip.sourceDuration : 0;
			const idx = Math.round(frac * (frames.length - 1));
			out.push(frames[Math.max(0, Math.min(frames.length - 1, idx))]);
		}
		return out;
	}

	let contentEl: HTMLDivElement | undefined = $state();
	let lanesEl: HTMLDivElement | undefined = $state();

	// Free-drag state (position in time + track).
	let dragId = $state<string | null>(null);
	let dragActive = $state(false);
	let justDragged = false; // suppress the click that follows a drag

	const contentWidth = $derived(editor.totalDuration * editor.pxPerSec + TIMELINE.gutterPx * 2);

	// Lanes rendered top-to-bottom; one spare lane on top to promote a clip into.
	const laneIndices = $derived.by(() => {
		const total = editor.trackCount + 1; // +1 spare lane on top
		return Array.from({ length: total }, (_, i) => total - 1 - i);
	});

	// Each clip placed by absolute start (x) and track (lane).
	const placed = $derived.by(() =>
		editor.clips.map((c) => {
			const dur = clipDuration(c);
			return {
				clip: c,
				dur,
				left: c.start * editor.pxPerSec + TIMELINE.gutterPx,
				width: Math.max(TIMELINE.minClipWidthPx, dur * editor.pxPerSec - TIMELINE.gutterPx)
			};
		})
	);

	function clipsOnTrack(track: number) {
		return placed.filter((p) => p.clip.track === track);
	}

	const playheadX = $derived(editor.playhead * editor.pxPerSec + TIMELINE.gutterPx);

	function niceInterval(targetSeconds: number): number {
		if (targetSeconds <= 0) return 1;
		const magnitude = Math.pow(10, Math.floor(Math.log10(targetSeconds)));
		const norm = targetSeconds / magnitude;
		let nice: number;
		if (norm < 1.5) nice = 1;
		else if (norm < 3.5) nice = 2;
		else if (norm < 7.5) nice = 5;
		else nice = 10;
		return nice * magnitude;
	}

	const ticks = $derived.by(() => {
		const total = editor.totalDuration;
		if (total <= 0) return [];
		const interval = niceInterval(TIMELINE.rulerTickTargetPx / editor.pxPerSec);
		const out: Array<{ label: string; x: number }> = [];
		for (let t = 0; t <= total + 0.001; t += interval) {
			out.push({ label: formatTimecode(t), x: t * editor.pxPerSec + TIMELINE.gutterPx });
		}
		return out;
	});

	function pointerToContentX(clientX: number): number {
		if (!contentEl) return 0;
		return clientX - contentEl.getBoundingClientRect().left;
	}

	function pointerToSeconds(clientX: number): number {
		return (pointerToContentX(clientX) - TIMELINE.gutterPx) / editor.pxPerSec;
	}

	// Which track lane the pointer is over (top lane = highest index).
	function trackFromClientY(clientY: number): number {
		if (!lanesEl) return 0;
		const rect = lanesEl.getBoundingClientRect();
		const count = laneIndices.length;
		const h = rect.height / count;
		const i = Math.max(0, Math.min(count - 1, Math.floor((clientY - rect.top) / h)));
		return laneIndices[i];
	}

	// Snap a timeline position to 0, the playhead, or any other clip edge.
	function snapSeconds(sec: number, excludeId: string | null): number {
		if (!editor.snapping) return Math.max(0, sec);
		const threshold = TIMELINE.snapThresholdPx / editor.pxPerSec;
		const candidates = [0, editor.playhead];
		for (const c of editor.clips) {
			if (c.id === excludeId) continue;
			candidates.push(c.start, clipEnd(c));
		}
		let best = sec;
		let bestDist = threshold;
		for (const cand of candidates) {
			const d = Math.abs(sec - cand);
			if (d <= bestDist) {
				bestDist = d;
				best = cand;
			}
		}
		return Math.max(0, best);
	}

	// Scrub the playhead by clicking/dragging the ruler. Pauses first so the
	// master clock doesn't fight the drag.
	function startScrub(e: PointerEvent) {
		e.preventDefault();
		editor.pause();
		editor.seek(snapSeconds(pointerToSeconds(e.clientX), null));
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const x = ev.clientX;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => editor.seek(snapSeconds(pointerToSeconds(x), null)));
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Drag a clip body to move it in time (horizontal) and across tracks
	// (vertical). A small threshold separates a click (select) from a drag.
	function startClipDrag(e: PointerEvent, id: string) {
		const startX = e.clientX;
		const startY = e.clientY;
		const clip = editor.clips.find((c) => c.id === id);
		if (!clip) return;
		const origStart = clip.start;
		const origLeftPx = origStart * editor.pxPerSec;
		dragId = id;
		dragActive = false;
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;
			if (!dragActive && Math.hypot(dx, dy) > REORDER.dragThresholdPx) dragActive = true;
			if (!dragActive) return;
			const cx = ev.clientX;
			const cy = ev.clientY;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const newStart = snapSeconds((origLeftPx + (cx - startX)) / editor.pxPerSec, id);
				editor.moveClipTo(id, newStart, trackFromClientY(cy));
			});
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (dragActive) justDragged = true;
			dragId = null;
			dragActive = false;
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	function onClipClick(id: string) {
		if (justDragged) {
			justDragged = false;
			return;
		}
		editor.select(id);
	}

	// Trim a clip edge by dragging its handle.
	function startTrim(
		e: PointerEvent,
		clipId: string,
		edge: 'start' | 'end',
		startIn: number,
		startOut: number,
		speed: number
	) {
		e.preventDefault();
		e.stopPropagation();
		const startX = e.clientX;
		// Throttle to one update per frame: each setIn/OutPoint rebuilds filmstrips.
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const x = ev.clientX;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				// Pixel delta -> timeline seconds -> source seconds (scaled by speed).
				const delta = ((x - startX) / editor.pxPerSec) * speed;
				if (edge === 'start') editor.setInPoint(clipId, startIn + delta);
				else editor.setOutPoint(clipId, startOut + delta);
			});
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Plain wheel scrolls horizontally; Ctrl/Cmd+wheel zooms. Non-passive so
	// preventDefault works.
	function wheelZoomScroll(node: HTMLElement) {
		function onWheel(e: WheelEvent) {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				editor.zoomBy(e.deltaY < 0 ? TIMELINE.zoomStep : 1 / TIMELINE.zoomStep);
			} else {
				e.preventDefault();
				node.scrollLeft += e.deltaY + e.deltaX;
			}
		}
		node.addEventListener('wheel', onWheel, { passive: false });
		return {
			destroy() {
				node.removeEventListener('wheel', onWheel);
			}
		};
	}
</script>

<div class="timeline">
	<div class="tl-scroll" use:wheelZoomScroll>
		<div class="tl-content" bind:this={contentEl} style="width: {contentWidth}px">
			<!-- Ruler doubles as the scrub bar -->
			<!-- svelte-ignore a11y_no_static_element_interactions -- pointer scrubbing; keyboard via arrow-key shortcuts -->
			<div class="ruler" onpointerdown={startScrub}>
				{#each ticks as tick (tick.x)}
					<div class="tick" style="left: {tick.x}px">
						<div class="tick-mark"></div>
						<span class="tick-label katana-mono">{tick.label}</span>
					</div>
				{/each}
			</div>

			<!-- Stacked track lanes (top lane is the spare for promotion) -->
			<div class="lanes" bind:this={lanesEl}>
				{#each laneIndices as t (t)}
					<div class="lane" class:spare={t === editor.trackCount}>
						{#each clipsOnTrack(t) as p (p.clip.id)}
							<div
								class="clip"
								class:selected={p.clip.id === editor.selectedId}
								class:dragging={p.clip.id === dragId && dragActive}
								style="left: {p.left}px; width: {p.width}px"
							>
								{#if p.width >= TIMELINE.minTrimWidthPx}
									<!-- svelte-ignore a11y_no_static_element_interactions -- pointer trim handle -->
									<div
										class="trim-handle trim-start"
										onpointerdown={(e) => startTrim(e, p.clip.id, 'start', p.clip.inPoint, p.clip.outPoint, p.clip.speed)}
									></div>
								{/if}
								<button
									class="clip-surface"
									onpointerdown={(e) => startClipDrag(e, p.clip.id)}
									onclick={() => onClipClick(p.clip.id)}
									aria-label="Select {p.clip.name}"
								>
									<div
										class="clip-thumb"
										class:empty={p.clip.thumbnails.length === 0}
										style="--ar: {p.clip.aspectRatio}"
									>
										{#if p.clip.thumbnails.length > 0}
											{#each filmstripFrames(p.clip, p.width) as frame, i (i)}
												<div class="frame" style="background-image: url({frame})"></div>
											{/each}
										{:else}
											<Icon name="film" class="thumb-glyph" />
										{/if}
									</div>
									<div class="clip-meta">
										<span class="clip-name">{p.clip.name}</span>
										<span class="clip-dur katana-mono">{formatTimecode(p.dur)}</span>
									</div>
								</button>
								{#if p.width >= TIMELINE.minTrimWidthPx}
									<!-- svelte-ignore a11y_no_static_element_interactions -- pointer trim handle -->
									<div
										class="trim-handle trim-end"
										onpointerdown={(e) => startTrim(e, p.clip.id, 'end', p.clip.inPoint, p.clip.outPoint, p.clip.speed)}
									></div>
								{/if}
								<div class="clip-actions">
									<IconButton icon="trash" label="Remove clip" size="sm" onclick={() => editor.removeClip(p.clip.id)} />
								</div>
							</div>
						{/each}
					</div>
				{/each}
			</div>

			<!-- Playhead spanning ruler + lanes -->
			{#if editor.clips.length > 0}
				<div class="playhead" style="left: {playheadX}px">
					<div class="playhead-head"></div>
				</div>
			{/if}
		</div>

		{#if editor.clips.length === 0}
			<div class="tl-empty">
				{editor.importing > 0 ? 'Importing…' : 'Import or drop a video to start editing'}
			</div>
		{/if}
	</div>
</div>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		background: var(--katana-bg-base);
		border-top: var(--katana-border-width) solid var(--katana-border);
		flex-shrink: 0;
		user-select: none;
	}

	.tl-scroll {
		position: relative;
		overflow-x: auto;
		overflow-y: auto;
		max-height: 16rem;
		scrollbar-width: thin;
		scrollbar-color: var(--katana-border-strong) transparent;
	}
	.tl-scroll::-webkit-scrollbar {
		height: var(--katana-space-2);
		width: var(--katana-space-2);
	}
	.tl-scroll::-webkit-scrollbar-thumb {
		background: var(--katana-border-strong);
		border-radius: var(--katana-radius-full);
	}

	.tl-content {
		position: relative;
		min-width: 100%;
	}

	/* Ruler (also the scrub bar) */
	.ruler {
		position: relative;
		height: var(--katana-timeline-ruler-height);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
		cursor: pointer;
	}
	.tick {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: flex-end;
		gap: var(--katana-space-1);
		padding-bottom: var(--katana-space-1);
		pointer-events: none;
	}
	.tick-mark {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--katana-border-width);
		height: var(--katana-space-2);
		background: var(--katana-border-strong);
	}
	.tick-label {
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-muted);
		white-space: nowrap;
		padding-left: var(--katana-space-1);
		line-height: var(--katana-leading-none);
	}

	/* Track lanes */
	.lane {
		position: relative;
		height: var(--katana-timeline-track-height);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
	}
	/* The spare lane on top reads as a lighter drop zone for new layers. */
	.lane.spare {
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent var(--katana-space-2),
			var(--katana-bg-surface) var(--katana-space-2),
			var(--katana-bg-surface) calc(var(--katana-space-2) * 2)
		);
		opacity: 0.5;
	}

	/* Clip snippet */
	.clip {
		position: absolute;
		top: var(--katana-timeline-gutter);
		bottom: var(--katana-timeline-gutter);
		display: flex;
		border-radius: var(--katana-radius-md);
		overflow: hidden;
		border: var(--katana-border-width) solid var(--katana-border);
		background: var(--katana-bg-elevated);
		transition: border-color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.clip:hover {
		border-color: var(--katana-border-strong);
	}
	.clip.selected {
		border: var(--katana-border-width-thick) solid var(--katana-accent);
	}
	.clip.dragging {
		z-index: 5;
		opacity: 0.85;
		box-shadow: var(--katana-shadow-pop);
	}

	.clip-surface {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		text-align: left;
		background: transparent;
		cursor: grab;
	}
	.clip.dragging .clip-surface {
		cursor: grabbing;
	}

	/* Filmstrip preview area */
	.clip-thumb {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: stretch;
		justify-content: flex-start;
		overflow: hidden;
		background-color: var(--katana-bg-base);
		font-size: var(--katana-text-xl);
		color: var(--katana-text-muted);
	}
	.clip-thumb.empty {
		align-items: center;
		justify-content: center;
	}
	.frame {
		height: 100%;
		flex: none;
		aspect-ratio: var(--ar);
		background-size: cover;
		background-position: center;
	}
	.frame + .frame {
		border-left: var(--katana-border-width) solid var(--katana-bg-base);
	}
	.clip-thumb :global(.thumb-glyph) {
		opacity: 0.5;
	}

	.clip-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--katana-space-2);
		padding: var(--katana-space-1) var(--katana-space-2);
		background: var(--katana-bg-elevated);
		border-top: var(--katana-border-width) solid var(--katana-border);
	}
	.clip-name {
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		color: var(--katana-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clip-dur {
		flex-shrink: 0;
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-muted);
	}

	/* Trim handles at each clip edge */
	.trim-handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--katana-space-3);
		z-index: 2;
		cursor: ew-resize;
		background: transparent;
		transition: background var(--katana-duration-fast) var(--katana-ease-out);
	}
	.trim-start {
		left: 0;
	}
	.trim-end {
		right: 0;
	}
	.trim-handle::after {
		content: '';
		position: absolute;
		top: 25%;
		bottom: 25%;
		left: 50%;
		transform: translateX(-50%);
		width: var(--katana-border-width-thick);
		border-radius: var(--katana-radius-full);
		background: var(--katana-accent);
		opacity: 0;
		transition: opacity var(--katana-duration-fast) var(--katana-ease-out);
	}
	.clip:hover .trim-handle {
		background: var(--katana-accent-muted);
	}
	.clip:hover .trim-handle::after {
		opacity: 0.6;
	}
	.trim-handle:hover {
		background: var(--katana-accent);
	}

	/* Per-clip action buttons, revealed on hover */
	.clip-actions {
		position: absolute;
		top: var(--katana-space-1);
		right: var(--katana-space-1);
		display: flex;
		gap: var(--katana-space-1);
		opacity: 0;
		z-index: 3;
		transition: opacity var(--katana-duration-fast) var(--katana-ease-out);
	}
	.clip:hover .clip-actions,
	.clip:focus-within .clip-actions {
		opacity: 1;
	}
	.clip-actions :global(.icon-btn) {
		background: var(--katana-bg-base);
	}

	/* Playhead */
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--katana-border-width-thick);
		background: var(--katana-accent);
		transform: translateX(-50%);
		pointer-events: none;
		z-index: var(--katana-z-timeline);
	}
	.playhead-head {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: var(--katana-space-1) solid transparent;
		border-right: var(--katana-space-1) solid transparent;
		border-top: var(--katana-space-2) solid var(--katana-accent);
	}

	/* Empty state */
	.tl-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
		pointer-events: none;
	}
</style>
