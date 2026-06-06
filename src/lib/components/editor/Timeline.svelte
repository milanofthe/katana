<script lang="ts">
	interface Clip {
		id: string;
		label: string;
		duration: number; // seconds
	}

	interface Props {
		clips?: Clip[];
		selectedId?: string;
		playhead?: number; // 0–100 percentage
		onSelect?: (id: string) => void;
	}

	const DEFAULT_CLIPS: Clip[] = [
		{ id: 'c1', label: 'clip_01.mp4', duration: 12 },
		{ id: 'c2', label: 'clip_02.mp4', duration: 8 },
		{ id: 'c3', label: 'clip_03.mp4', duration: 20 },
		{ id: 'c4', label: 'clip_04.mp4', duration: 15 },
	];

	let {
		clips = DEFAULT_CLIPS,
		selectedId = 'c2',
		playhead = 35,
		onSelect,
	}: Props = $props();

	const totalDuration = $derived(clips.reduce((sum, c) => sum + c.duration, 0));

	function niceInterval(total: number, targetTicks: number): number {
		if (total === 0) return 1;
		const raw = total / targetTicks;
		const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
		const norm = raw / magnitude;
		let nice: number;
		if (norm < 1.5) nice = 1;
		else if (norm < 3.5) nice = 2;
		else if (norm < 7.5) nice = 5;
		else nice = 10;
		return nice * magnitude;
	}

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const rulerTicks = $derived.by(() => {
		if (totalDuration === 0) return [];
		const interval = niceInterval(totalDuration, 8);
		const ticks: Array<{ label: string; percent: number }> = [];
		for (let t = 0; t <= totalDuration; t += interval) {
			ticks.push({
				label: formatTime(t),
				percent: (t / totalDuration) * 100,
			});
		}
		return ticks;
	});
</script>

<div class="timeline" style="--playhead-pos: {playhead}%">
	<!-- Ruler row: time ticks with labels -->
	<div class="ruler" role="presentation">
		{#each rulerTicks as tick (tick.percent)}
			<div class="tick" style="left: {tick.percent}%">
				<span class="tick-label">{tick.label}</span>
				<div class="tick-mark"></div>
			</div>
		{/each}
	</div>

	<!-- Single track lane holding all clip blocks -->
	<div class="track-lane" role="region" aria-label="Timeline track">
		{#each clips as clip (clip.id)}
			<button
				class="clip-block"
				class:selected={clip.id === selectedId}
				style="width: {(clip.duration / totalDuration) * 100}%"
				onclick={() => onSelect?.(clip.id)}
				type="button"
				title={clip.label}
				aria-pressed={clip.id === selectedId}
			>
				<span class="clip-label">{clip.label}</span>
			</button>
		{/each}
	</div>

	<!-- Playhead: vertical line with a downward-pointing CSS triangle head -->
	<div class="playhead" aria-hidden="true">
		<div class="playhead-head"></div>
	</div>
</div>

<style>
	/* Timeline shell */
	.timeline {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--snip-bg-base);
		border-top: var(--snip-border-width) solid var(--snip-border);
		flex-shrink: 0;
		user-select: none;
		z-index: var(--snip-z-timeline);
		overflow: hidden;
	}

	/* Ruler */
	.ruler {
		position: relative;
		height: var(--snip-space-6);
		background: var(--snip-bg-base);
		border-bottom: var(--snip-border-width) solid var(--snip-border-strong);
		overflow: hidden;
	}

	.tick {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translateX(-50%);
		pointer-events: none;
	}

	.tick-label {
		font-family: var(--snip-font-mono);
		font-size: var(--snip-text-xs);
		font-variant-numeric: tabular-nums;
		font-weight: var(--snip-weight-regular);
		color: var(--snip-text-muted);
		white-space: nowrap;
		line-height: var(--snip-leading-none);
		padding-top: var(--snip-space-1);
	}

	.tick-mark {
		width: var(--snip-border-width);
		flex: 1;
		background: var(--snip-border-strong);
		margin-top: var(--snip-space-1);
	}

	/* Track lane */
	.track-lane {
		display: flex;
		flex-direction: row;
		gap: var(--snip-space-px);
		height: var(--snip-space-10);
		background: var(--snip-bg-surface);
		padding: var(--snip-space-1) 0;
		align-items: stretch;
	}

	/* Clip block */
	.clip-block {
		appearance: none;
		flex-shrink: 0;
		min-width: 0;
		overflow: hidden;
		display: flex;
		align-items: center;
		padding: 0 var(--snip-space-2);
		border: var(--snip-border-width) solid var(--snip-border);
		border-radius: var(--snip-radius-md);
		background: var(--snip-bg-elevated);
		cursor: pointer;
		transition:
			background var(--snip-duration-fast) var(--snip-ease-out),
			border-color var(--snip-duration-fast) var(--snip-ease-out);
	}

	.clip-block:hover {
		background: var(--snip-bg-overlay);
		border-color: var(--snip-border-strong);
	}

	.clip-block.selected {
		background: var(--snip-accent-muted);
		border: var(--snip-border-width-thick) solid var(--snip-accent);
	}

	.clip-label {
		display: block;
		width: 100%;
		font-family: var(--snip-font-sans);
		font-size: var(--snip-text-sm);
		font-weight: var(--snip-weight-regular);
		color: var(--snip-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Playhead */
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--playhead-pos);
		width: var(--snip-border-width-thick);
		background: var(--snip-accent);
		transform: translateX(-50%);
		pointer-events: none;
		z-index: 2;
		transition: left var(--snip-duration-fast) var(--snip-ease-out);
	}

	/* CSS border triangle — downward-pointing head at top of playhead line */
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
</style>
