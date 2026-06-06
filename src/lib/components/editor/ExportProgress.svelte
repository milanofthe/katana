<script lang="ts">
	import { Icon } from '$lib';
	import { editor } from '$lib/editor/store.svelte';

	// Ring geometry.
	const R = 52;
	const C = 2 * Math.PI * R;

	const pct = $derived(Math.round(editor.exportProgress * 100));
	// FFmpeg needs a moment before the first progress tick; show a spinner until then.
	const starting = $derived(editor.exportProgress < 0.005);
	const dashoffset = $derived(C * (1 - Math.min(1, Math.max(0, editor.exportProgress))));
</script>

{#if editor.exporting}
	<div class="overlay">
		<div class="card">
			<div class="ring">
				<svg viewBox="0 0 120 120" class="ring-svg" class:spinning={starting}>
					<circle class="track" cx="60" cy="60" r={R} />
					{#if starting}
						<circle class="arc indeterminate" cx="60" cy="60" r={R} stroke-dasharray="{C * 0.25} {C}" />
					{:else}
						<circle
							class="arc"
							cx="60"
							cy="60"
							r={R}
							stroke-dasharray={C}
							stroke-dashoffset={dashoffset}
						/>
					{/if}
				</svg>
				<div class="center">
					<Icon name="katana" size={20} class="blade" />
					{#if starting}
						<span class="pct katana-mono">…</span>
					{:else}
						<span class="pct katana-mono">{pct}<span class="unit">%</span></span>
					{/if}
				</div>
			</div>
			<div class="labels">
				<span class="title">Exporting video</span>
				<span class="sub">{starting ? 'Preparing…' : 'Rendering with FFmpeg'}</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--katana-scrim);
		backdrop-filter: blur(2px);
		z-index: var(--katana-z-overlay);
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--katana-space-4);
		padding: var(--katana-space-6) var(--katana-space-7);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border-strong);
		border-radius: var(--katana-radius-lg);
		box-shadow: var(--katana-shadow-pop);
	}

	.ring {
		position: relative;
		width: 7.5rem;
		height: 7.5rem;
	}
	.ring-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg); /* start the arc at 12 o'clock */
	}
	.ring-svg.spinning {
		animation: spin 1s linear infinite;
		transform-origin: center;
	}
	.track {
		fill: none;
		stroke: var(--katana-bg-overlay);
		stroke-width: 7;
	}
	.arc {
		fill: none;
		stroke: var(--katana-accent);
		stroke-width: 7;
		stroke-linecap: round;
		transition: stroke-dashoffset var(--katana-duration-base) var(--katana-ease-out);
	}

	.center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--katana-space-1);
	}
	.center :global(.blade) {
		color: var(--katana-accent);
		opacity: 0.9;
	}
	.pct {
		font-size: var(--katana-text-xl);
		font-weight: var(--katana-weight-semibold);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-primary);
		line-height: var(--katana-leading-none);
	}
	.unit {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
		margin-left: 0.05em;
	}

	.labels {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--katana-space-1);
	}
	.title {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
	}
	.sub {
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* The spin animation rotates the whole svg; keep the indeterminate arc's
	   own base rotation (-90) handled by the parent transform. */
	.indeterminate {
		fill: none;
		stroke: var(--katana-accent);
		stroke-width: 7;
		stroke-linecap: round;
	}

	@media (prefers-reduced-motion: reduce) {
		.ring-svg.spinning {
			animation: none;
		}
	}
</style>
