<script lang="ts">
	import { Icon, IconButton } from '$lib';
	import { editor, type AspectRatio } from '$lib/editor/store.svelte';
	import CompositeLayer from './CompositeLayer.svelte';

	const formats: { value: AspectRatio; label: string }[] = [
		{ value: 'original', label: 'Orig' },
		{ value: '16:9', label: '16:9' },
		{ value: '9:16', label: '9:16' },
		{ value: '1:1', label: '1:1' }
	];

	// Output frame aspect ratio: the chosen format, or a representative clip's ratio.
	const frameRatio = $derived(
		editor.aspectRatio === '16:9'
			? 16 / 9
			: editor.aspectRatio === '9:16'
				? 9 / 16
				: editor.aspectRatio === '1:1'
					? 1
					: (editor.selectedClip?.aspectRatio ?? editor.activeClips[0]?.aspectRatio ?? 16 / 9)
	);

	// Measured frame size (px), handed to each layer for its placement math.
	let fw = $state(0);
	let fh = $state(0);

	// Snap guides, surfaced by the layer currently being dragged.
	let guide = $state({ snapX: false, snapY: false, active: false });

	const hasClips = $derived(editor.clips.length > 0);
	const selectedTransformed = $derived(
		!!editor.selectedClip &&
			(editor.selectedClip.transform.x !== 0 ||
				editor.selectedClip.transform.y !== 0 ||
				editor.selectedClip.transform.scale !== 1)
	);
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
			disabled={!selectedTransformed}
			onclick={() => editor.selectedClip && editor.resetTransform(editor.selectedClip.id)}
		/>
	</div>

	<div class="stage">
		{#if hasClips}
			<div class="frame" style="--ar: {frameRatio}" bind:clientWidth={fw} bind:clientHeight={fh}>
				{#each editor.activeClips as clip (clip.id)}
					<CompositeLayer
						{clip}
						{fw}
						{fh}
						{frameRatio}
						selected={clip.id === editor.selectedId}
						onselect={(id) => editor.select(id)}
						ondragstate={(s) => (guide = s)}
					/>
				{/each}

				{#if editor.activeClips.length === 0}
					<span class="frame-empty">No clip at the playhead</span>
				{/if}

				{#if guide.active && guide.snapX}
					<div class="guide guide-v"></div>
				{/if}
				{#if guide.active && guide.snapY}
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
		/* Size container so the frame can fit itself to both axes (cqw/cqh). */
		container-type: size;
	}

	/* The output frame: a letterboxed canvas at the project aspect ratio.
	   Square corners: it represents the real (rectangular) output video.
	   Width is the largest that fits BOTH axes; height follows the aspect ratio,
	   so resizing never squishes it. */
	.frame {
		position: relative;
		aspect-ratio: var(--ar);
		width: min(100cqw, 100cqh * var(--ar));
		max-width: 100%;
		max-height: 100%;
		background: #000000;
		overflow: hidden;
	}

	.frame-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
		pointer-events: none;
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
