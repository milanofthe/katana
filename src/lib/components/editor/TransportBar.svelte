<script lang="ts">
	import { IconButton, Tooltip } from '$lib';
	import { editor } from '$lib/editor/store.svelte';
	import { formatTimecode } from '$lib/editor/time';
	import { TIMELINE } from '$lib/constants';

	const hasClip = $derived(editor.selectedClip !== null);
	const hasClips = $derived(editor.clips.length > 0);
	const currentTime = $derived(formatTimecode(editor.playhead));
	const duration = $derived(formatTimecode(editor.totalDuration));

	function deleteSelected() {
		if (editor.selectedId) editor.removeClip(editor.selectedId);
	}
</script>

<div class="transport-bar" role="toolbar" aria-label="Transport controls">
	<!-- Transport group: skip back, play/pause, skip forward -->
	<div class="group transport">
		<Tooltip text="To start" placement="top">
			<IconButton icon="skipBack" label="To start" size="md" disabled={!hasClips} onclick={() => editor.seek(0)} />
		</Tooltip>
		<Tooltip text={editor.playing ? 'Pause' : 'Play'} placement="top">
			<IconButton
				icon={editor.playing ? 'pause' : 'play'}
				label={editor.playing ? 'Pause' : 'Play'}
				size="lg"
				variant="accent"
				disabled={!hasClips}
				onclick={() => editor.togglePlay()}
			/>
		</Tooltip>
		<Tooltip text="To end" placement="top">
			<IconButton icon="skipForward" label="To end" size="md" disabled={!hasClips} onclick={() => editor.seek(editor.totalDuration)} />
		</Tooltip>
	</div>

	<!-- Timecode readout -->
	<div class="timecode" aria-label="Timecode">
		<span class="time-current">{currentTime}</span>
		<span class="time-separator">&nbsp;/&nbsp;</span>
		<span class="time-duration">{duration}</span>
	</div>

	<div class="spacer" aria-hidden="true"></div>

	<!-- History group: undo, redo -->
	<div class="group history">
		<Tooltip text="Undo (Ctrl+Z)" placement="top">
			<IconButton icon="undo" label="Undo" size="md" disabled={!editor.canUndo} onclick={() => editor.undo()} />
		</Tooltip>
		<Tooltip text="Redo (Ctrl+Shift+Z)" placement="top">
			<IconButton icon="redo" label="Redo" size="md" disabled={!editor.canRedo} onclick={() => editor.redo()} />
		</Tooltip>
	</div>

	<span class="divider" aria-hidden="true"></span>

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

	<!-- Track group: add empty video / audio lanes -->
	<div class="group tracks">
		<Tooltip text="Add video track" placement="top">
			<IconButton icon="film" label="Add video track" size="md" disabled={!hasClips} onclick={() => editor.addVideoTrack()} />
		</Tooltip>
		<Tooltip text="Add audio track" placement="top">
			<IconButton icon="volume" label="Add audio track" size="md" disabled={!hasClips} onclick={() => editor.addAudioTrack()} />
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
		gap: var(--katana-space-3);
		height: calc(var(--katana-control-lg) + var(--katana-space-2) * 2);
		padding-inline: var(--katana-space-4);
		background: var(--katana-bg-surface);
		border-top: var(--katana-border-width) solid var(--katana-border);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
		flex-shrink: 0;
	}

	.group {
		display: flex;
		align-items: center;
		gap: var(--katana-space-1);
	}

	.timecode {
		display: flex;
		align-items: baseline;
		font-family: var(--katana-font-mono);
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
		font-variant-numeric: tabular-nums;
		user-select: none;
	}
	.time-current {
		color: var(--katana-accent);
	}
	.time-separator,
	.time-duration {
		color: var(--katana-text-muted);
	}

	.spacer {
		flex: 1;
	}

	.divider {
		display: block;
		width: var(--katana-border-width);
		height: var(--katana-control-sm);
		background: var(--katana-border);
		flex-shrink: 0;
		margin-inline: var(--katana-space-1);
	}
</style>
