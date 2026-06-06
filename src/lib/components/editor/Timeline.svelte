<script lang="ts">
	import { Icon, IconButton } from '$lib';
	import { editor, clipDuration } from '$lib/editor/store.svelte';
	import { formatTimecode } from '$lib/editor/time';
	import { TIMELINE } from '$lib/constants';

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

	// Global playhead = durations of clips before the selected one + local playhead.
	const selectedStart = $derived.by(() => {
		let acc = 0;
		for (const c of editor.clips) {
			if (c.id === editor.selectedId) return acc;
			acc += clipDuration(c);
		}
		return 0;
	});
	const playheadX = $derived((selectedStart + editor.playhead) * editor.pxPerSec + TIMELINE.gutterPx);

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
		<div class="tl-content" style="width: {contentWidth}px">
			<!-- Ruler: ticks with left-anchored labels -->
			<div class="ruler">
				{#each ticks as tick (tick.x)}
					<div class="tick" style="left: {tick.x}px">
						<div class="tick-mark"></div>
						<span class="tick-label snip-mono">{tick.label}</span>
					</div>
				{/each}
			</div>

			<!-- Single track with positioned clip snippets -->
			<div class="track">
				{#each placed as p (p.clip.id)}
					<div
						class="clip"
						class:selected={p.clip.id === editor.selectedId}
						style="left: {p.left}px; width: {p.width}px"
					>
						<button class="clip-surface" onclick={() => editor.select(p.clip.id)} aria-label="Select {p.clip.name}">
							<div
								class="clip-thumb"
								style={p.clip.thumbnail ? `background-image: url(${p.clip.thumbnail})` : ''}
							>
								{#if !p.clip.thumbnail}
									<Icon name="film" class="thumb-glyph" />
								{/if}
							</div>
							<div class="clip-meta">
								<span class="clip-name">{p.clip.name}</span>
								<span class="clip-dur snip-mono">{formatTimecode(p.dur)}</span>
							</div>
						</button>
						<div class="clip-actions">
							<IconButton icon="trash" label="Remove clip" size="sm" onclick={() => editor.removeClip(p.clip.id)} />
						</div>
					</div>
				{/each}
			</div>

			<!-- Playhead spanning ruler + track -->
			{#if editor.selectedClip}
				<div class="playhead" style="left: {playheadX}px">
					<div class="playhead-head"></div>
				</div>
			{/if}
		</div>

		{#if editor.clips.length === 0}
			<div class="tl-empty">Import media to start editing</div>
		{/if}
	</div>
</div>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		background: var(--snip-bg-base);
		border-top: var(--snip-border-width) solid var(--snip-border);
		flex-shrink: 0;
		user-select: none;
	}

	/* Horizontal scroll viewport */
	.tl-scroll {
		position: relative;
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: thin;
		scrollbar-color: var(--snip-border-strong) transparent;
	}
	.tl-scroll::-webkit-scrollbar {
		height: var(--snip-space-2);
	}
	.tl-scroll::-webkit-scrollbar-thumb {
		background: var(--snip-border-strong);
		border-radius: var(--snip-radius-full);
	}

	.tl-content {
		position: relative;
		min-width: 100%;
	}

	/* Ruler */
	.ruler {
		position: relative;
		height: var(--snip-timeline-ruler-height);
		border-bottom: var(--snip-border-width) solid var(--snip-border);
	}
	.tick {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: flex-end;
		gap: var(--snip-space-1);
		padding-bottom: var(--snip-space-1);
		pointer-events: none;
	}
	.tick-mark {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--snip-border-width);
		height: var(--snip-space-2);
		background: var(--snip-border-strong);
	}
	.tick-label {
		font-size: var(--snip-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--snip-text-muted);
		white-space: nowrap;
		padding-left: var(--snip-space-1);
		line-height: var(--snip-leading-none);
	}

	/* Track lane */
	.track {
		position: relative;
		height: var(--snip-timeline-track-height);
	}

	/* Clip snippet */
	.clip {
		position: absolute;
		top: var(--snip-timeline-gutter);
		bottom: var(--snip-timeline-gutter);
		display: flex;
		border-radius: var(--snip-radius-md);
		overflow: hidden;
		border: var(--snip-border-width) solid var(--snip-border);
		background: var(--snip-bg-elevated);
		transition: border-color var(--snip-duration-fast) var(--snip-ease-out);
	}
	.clip:hover {
		border-color: var(--snip-border-strong);
	}
	.clip.selected {
		border: var(--snip-border-width-thick) solid var(--snip-accent);
	}

	.clip-surface {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		text-align: left;
		background: transparent;
		cursor: pointer;
	}

	/* Thumbnail / preview area (solid placeholder until real frames are extracted) */
	.clip-thumb {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--snip-bg-base);
		background-size: cover;
		background-position: center;
		font-size: var(--snip-text-xl);
		color: var(--snip-text-muted);
	}
	.clip-thumb :global(.thumb-glyph) {
		opacity: 0.5;
	}

	/* Footer: name + duration */
	.clip-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--snip-space-2);
		padding: var(--snip-space-1) var(--snip-space-2);
		background: var(--snip-bg-elevated);
		border-top: var(--snip-border-width) solid var(--snip-border);
	}
	.clip-name {
		font-size: var(--snip-text-xs);
		font-weight: var(--snip-weight-medium);
		color: var(--snip-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clip-dur {
		flex-shrink: 0;
		font-size: var(--snip-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--snip-text-muted);
	}

	/* Per-clip action buttons, revealed on hover */
	.clip-actions {
		position: absolute;
		top: var(--snip-space-1);
		right: var(--snip-space-1);
		display: flex;
		gap: var(--snip-space-1);
		opacity: 0;
		transition: opacity var(--snip-duration-fast) var(--snip-ease-out);
	}
	.clip:hover .clip-actions,
	.clip:focus-within .clip-actions {
		opacity: 1;
	}
	.clip-actions :global(.icon-btn) {
		background: var(--snip-bg-base);
	}

	/* Playhead */
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--snip-border-width-thick);
		background: var(--snip-accent);
		transform: translateX(-50%);
		pointer-events: none;
		z-index: var(--snip-z-timeline);
	}
	.playhead-head {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: var(--snip-space-1) solid transparent;
		border-right: var(--snip-space-1) solid transparent;
		border-top: var(--snip-space-2) solid var(--snip-accent);
	}

	/* Empty state */
	.tl-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--snip-text-sm);
		color: var(--snip-text-muted);
		pointer-events: none;
	}
</style>
