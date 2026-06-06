<script lang="ts">
	import { IconButton, Tooltip } from '$lib';
	import { editor } from '$lib/editor/store.svelte';
	import { formatTimecode } from '$lib/editor/time';
	import { TIMELINE } from '$lib/constants';

	const hasClip = $derived(editor.selectedClip !== null);
	const currentTime = $derived(formatTimecode(editor.playhead));
	const duration = $derived(formatTimecode(editor.activeDuration));

	function deleteSelected() {
		if (editor.selectedId) editor.removeClip(editor.selectedId);
	}
</script>

<div class="transport-bar" role="toolbar" aria-label="Transport controls">
	<!-- Transport group: skip back, play/pause, skip forward -->
	<div class="group transport">
		<Tooltip text="To start" placement="top">
			<IconButton icon="skipBack" label="To start" size="md" disabled={!hasClip} onclick={() => editor.seek(0)} />
		</Tooltip>
		<Tooltip text={editor.playing ? 'Pause' : 'Play'} placement="top">
			<IconButton
				icon={editor.playing ? 'pause' : 'play'}
				label={editor.playing ? 'Pause' : 'Play'}
				size="lg"
				variant="accent"
				disabled={!hasClip}
				onclick={() => editor.togglePlay()}
			/>
		</Tooltip>
		<Tooltip text="To end" placement="top">
			<IconButton icon="skipForward" label="To end" size="md" disabled={!hasClip} onclick={() => editor.seek(editor.activeDuration)} />
		</Tooltip>
	</div>

	<!-- Timecode readout -->
	<div class="timecode" aria-label="Timecode">
		<span class="time-current">{currentTime}</span>
		<span class="time-separator">&nbsp;/&nbsp;</span>
		<span class="time-duration">{duration}</span>
	</div>

	<div class="spacer" aria-hidden="true"></div>

	<!-- Editing tools group: split, delete -->
	<div class="group tools">
		<Tooltip text="Split (S)" placement="top">
			<IconButton icon="scissors" label="Split" size="md" disabled={!hasClip} onclick={() => editor.splitAtPlayhead()} />
		</Tooltip>
		<Tooltip text="Delete (Del)" placement="top">
			<IconButton icon="trash" label="Delete clip" size="md" disabled={!hasClip} onclick={deleteSelected} />
		</Tooltip>
	</div>

	<span class="divider" aria-hidden="true"></span>

	<!-- Zoom and snap group -->
	<div class="group zoom-snap">
		<Tooltip text="Zoom out" placement="top">
			<IconButton icon="zoomOut" label="Zoom out" size="md" onclick={() => editor.zoomBy(1 / TIMELINE.zoomStep)} />
		</Tooltip>
		<Tooltip text="Zoom in" placement="top">
			<IconButton icon="zoomIn" label="Zoom in" size="md" onclick={() => editor.zoomBy(TIMELINE.zoomStep)} />
		</Tooltip>
		<Tooltip text="Snapping" placement="top">
			<IconButton icon="magnet" label="Snapping" size="md" active={editor.snapping} onclick={() => editor.toggleSnap()} />
		</Tooltip>
	</div>
</div>

<style>
	.transport-bar {
		display: flex;
		align-items: center;
		gap: var(--snip-space-3);
		height: calc(var(--snip-control-lg) + var(--snip-space-2) * 2);
		padding-inline: var(--snip-space-4);
		background: var(--snip-bg-surface);
		border-top: var(--snip-border-width) solid var(--snip-border);
		border-bottom: var(--snip-border-width) solid var(--snip-border);
		flex-shrink: 0;
	}

	.group {
		display: flex;
		align-items: center;
		gap: var(--snip-space-1);
	}

	.timecode {
		display: flex;
		align-items: baseline;
		font-family: var(--snip-font-mono);
		font-size: var(--snip-text-sm);
		font-weight: var(--snip-weight-medium);
		font-variant-numeric: tabular-nums;
		user-select: none;
	}
	.time-current {
		color: var(--snip-accent);
	}
	.time-separator,
	.time-duration {
		color: var(--snip-text-muted);
	}

	.spacer {
		flex: 1;
	}

	.divider {
		display: block;
		width: var(--snip-border-width);
		height: var(--snip-control-sm);
		background: var(--snip-border);
		flex-shrink: 0;
		margin-inline: var(--snip-space-1);
	}
</style>
