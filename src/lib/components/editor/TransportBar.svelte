<script lang="ts">
	import { IconButton, Tooltip } from '$lib';

	interface Props {
		playing?: boolean;
		snapping?: boolean;
		currentTime?: string;
		duration?: string;
		onPlayToggle?: () => void;
		onSkipBack?: () => void;
		onSkipForward?: () => void;
		onSplit?: () => void;
		onTrim?: () => void;
		onDelete?: () => void;
		onZoomIn?: () => void;
		onZoomOut?: () => void;
		onSnapToggle?: () => void;
	}

	let {
		playing = false,
		snapping = false,
		currentTime = '00:00:00',
		duration = '00:00:00',
		onPlayToggle,
		onSkipBack,
		onSkipForward,
		onSplit,
		onTrim,
		onDelete,
		onZoomIn,
		onZoomOut,
		onSnapToggle
	}: Props = $props();
</script>

<div class="transport-bar" role="toolbar" aria-label="Transport controls">
	<!-- Transport group: skip back, play/pause, skip forward -->
	<div class="group transport">
		<Tooltip text="Skip back" placement="top">
			<IconButton icon="skipBack" label="Skip back" size="md" onclick={onSkipBack} />
		</Tooltip>
		<Tooltip text={playing ? 'Pause' : 'Play'} placement="top">
			<IconButton
				icon={playing ? 'pause' : 'play'}
				label={playing ? 'Pause' : 'Play'}
				size="lg"
				variant="accent"
				onclick={onPlayToggle}
			/>
		</Tooltip>
		<Tooltip text="Skip forward" placement="top">
			<IconButton icon="skipForward" label="Skip forward" size="md" onclick={onSkipForward} />
		</Tooltip>
	</div>

	<!-- Timecode readout -->
	<div class="timecode" aria-label="Timecode">
		<span class="time-current">{currentTime}</span>
		<span class="time-separator">&nbsp;/&nbsp;</span>
		<span class="time-duration">{duration}</span>
	</div>

	<!-- Flexible spacer -->
	<div class="spacer" aria-hidden="true"></div>

	<!-- Editing tools group: split, trim, delete -->
	<div class="group tools">
		<Tooltip text="Split" placement="top">
			<IconButton icon="scissors" label="Split" size="md" onclick={onSplit} />
		</Tooltip>
		<Tooltip text="Trim" placement="top">
			<IconButton icon="trim" label="Trim" size="md" onclick={onTrim} />
		</Tooltip>
		<Tooltip text="Delete clip" placement="top">
			<IconButton icon="trash" label="Delete clip" size="md" onclick={onDelete} />
		</Tooltip>
	</div>

	<!-- Divider -->
	<span class="divider" aria-hidden="true"></span>

	<!-- Zoom and snap group -->
	<div class="group zoom-snap">
		<Tooltip text="Zoom out" placement="top">
			<IconButton icon="zoomOut" label="Zoom out" size="md" onclick={onZoomOut} />
		</Tooltip>
		<Tooltip text="Zoom in" placement="top">
			<IconButton icon="zoomIn" label="Zoom in" size="md" onclick={onZoomIn} />
		</Tooltip>
		<Tooltip text="Snapping" placement="top">
			<IconButton
				icon="magnet"
				label="Snapping"
				size="md"
				active={snapping}
				onclick={onSnapToggle}
			/>
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

	/* Button groups — tighter internal spacing */
	.group {
		display: flex;
		align-items: center;
		gap: var(--snip-space-1);
	}

	/* Timecode display */
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

	/* Flexible spacer pushes tools/zoom to the right */
	.spacer {
		flex: 1;
	}

	/* Thin vertical divider between tool groups */
	.divider {
		display: block;
		width: var(--snip-border-width);
		height: var(--snip-control-sm);
		background: var(--snip-border);
		flex-shrink: 0;
		margin-inline: var(--snip-space-1);
	}
</style>
