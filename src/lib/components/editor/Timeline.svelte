<script lang="ts">
	import { Icon, IconButton } from '$lib';
	import { editor, clipDuration, type Clip } from '$lib/editor/store.svelte';
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

	// Reorder-drag state
	let dragId = $state<string | null>(null);
	let dragActive = $state(false);
	let dragDx = $state(0);
	let dropIndex = $state(0);
	let justDragged = false; // suppress the click that follows a drag

	const contentWidth = $derived(editor.totalDuration * editor.pxPerSec + TIMELINE.gutterPx * 2);

	// Lay clips end to end; a gutter is carved off each right edge for separation.
	const placed = $derived.by(() => {
		let start = 0;
		return editor.clips.map((c) => {
			const dur = clipDuration(c);
			const fullWidth = dur * editor.pxPerSec;
			const item = {
				clip: c,
				dur,
				left: start * editor.pxPerSec + TIMELINE.gutterPx,
				width: Math.max(TIMELINE.minClipWidthPx, fullWidth - TIMELINE.gutterPx)
			};
			start += dur;
			return item;
		});
	});

	const playheadX = $derived(editor.globalPlayhead * editor.pxPerSec + TIMELINE.gutterPx);

	// Drop indicator position (between clips) during a reorder drag.
	const dropX = $derived.by(() => {
		const others = placed.filter((p) => p.clip.id !== dragId);
		if (others.length === 0) return TIMELINE.gutterPx;
		if (dropIndex <= 0) return others[0].left - TIMELINE.gutterPx / 2;
		const prev = others[Math.min(dropIndex, others.length) - 1];
		return prev.left + prev.width + TIMELINE.gutterPx / 2;
	});

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

	function computeDropIndex(clientX: number): number {
		const x = pointerToContentX(clientX);
		let idx = 0;
		for (const p of placed) {
			if (p.clip.id === dragId) continue;
			if (x > p.left + p.width / 2) idx++;
		}
		return idx;
	}

	// Scrub the playhead by clicking/dragging the ruler. Throttled to one
	// seekGlobal per frame (it's O(n) and can swap the previewed clip).
	function startScrub(e: PointerEvent) {
		e.preventDefault();
		editor.seekGlobal(pointerToSeconds(e.clientX));
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const x = ev.clientX;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => editor.seekGlobal(pointerToSeconds(x)));
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Drag a clip body to reorder it; a small threshold separates click from drag.
	function startClipDrag(e: PointerEvent, id: string) {
		const startX = e.clientX;
		dragId = id;
		dragActive = false;
		dragDx = 0;
		const onMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;
			if (!dragActive && Math.abs(dx) > REORDER.dragThresholdPx) dragActive = true;
			if (dragActive) {
				dragDx = dx;
				dropIndex = computeDropIndex(ev.clientX);
			}
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (dragActive && dragId) {
				editor.moveClip(dragId, dropIndex);
				justDragged = true;
			}
			dragId = null;
			dragActive = false;
			dragDx = 0;
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

			<!-- Single track with positioned clip snippets -->
			<div class="track">
				{#each placed as p (p.clip.id)}
					<div
						class="clip"
						class:selected={p.clip.id === editor.selectedId}
						class:dragging={p.clip.id === dragId && dragActive}
						style="left: {p.left}px; width: {p.width}px;{p.clip.id === dragId && dragActive
							? ` --drag-dx: ${dragDx}px;`
							: ''}"
					>
						<!-- svelte-ignore a11y_no_static_element_interactions -- pointer trim handle -->
						<div
							class="trim-handle trim-start"
							onpointerdown={(e) => startTrim(e, p.clip.id, 'start', p.clip.inPoint, p.clip.outPoint, p.clip.speed)}
						></div>
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
						<!-- svelte-ignore a11y_no_static_element_interactions -- pointer trim handle -->
						<div
							class="trim-handle trim-end"
							onpointerdown={(e) => startTrim(e, p.clip.id, 'end', p.clip.inPoint, p.clip.outPoint, p.clip.speed)}
						></div>
						<div class="clip-actions">
							<IconButton icon="trash" label="Remove clip" size="sm" onclick={() => editor.removeClip(p.clip.id)} />
						</div>
					</div>
				{/each}

				<!-- Reorder drop indicator -->
				{#if dragActive}
					<div class="drop-indicator" style="left: {dropX}px"></div>
				{/if}
			</div>

			<!-- Playhead spanning ruler + track -->
			{#if editor.selectedClip}
				<div class="playhead" style="left: {playheadX}px">
					<div class="playhead-head"></div>
				</div>
			{/if}
		</div>

		{#if editor.clips.length === 0}
			<div class="tl-empty">Import or drop a video to start editing</div>
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
		overflow-y: hidden;
		scrollbar-width: thin;
		scrollbar-color: var(--katana-border-strong) transparent;
	}
	.tl-scroll::-webkit-scrollbar {
		height: var(--katana-space-2);
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

	/* Track lane */
	.track {
		position: relative;
		height: var(--katana-timeline-track-height);
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
		transform: translateX(var(--drag-dx, 0));
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

	/* Reorder drop indicator */
	.drop-indicator {
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--katana-border-width-thick);
		background: var(--katana-accent);
		border-radius: var(--katana-radius-full);
		transform: translateX(-50%);
		z-index: 4;
		pointer-events: none;
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
