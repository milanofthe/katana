<script lang="ts">
	import { Logo, Button, IconButton, Tooltip } from '$lib';

	// Swatch list references token names; each color is applied via a scoped
	// class below (no inline styles), so this stays a pure design showcase.
	const swatches = [
		{ name: 'accent', cls: 'sw-accent' },
		{ name: 'accent-hover', cls: 'sw-accent-hover' },
		{ name: 'bg-surface', cls: 'sw-surface' },
		{ name: 'bg-elevated', cls: 'sw-elevated' },
		{ name: 'bg-overlay', cls: 'sw-overlay' },
		{ name: 'success', cls: 'sw-success' },
		{ name: 'danger', cls: 'sw-danger' }
	];

	const typeScale = [
		{ label: 'xl · Display', cls: 't-xl' },
		{ label: 'lg · Heading', cls: 't-lg' },
		{ label: 'md · Emphasis', cls: 't-md' },
		{ label: 'base · Body', cls: 't-base' },
		{ label: 'sm · Label', cls: 't-sm' },
		{ label: 'xs · Caption', cls: 't-xs' }
	];

	let snapping = $state(true);
	let playing = $state(false);
</script>

<div class="page">
	<header class="brand">
		<Logo variant="full" class="brand-logo" />
		<p>fast, minimalist video editor</p>
	</header>

	<section>
		<h2>Palette</h2>
		<div class="swatches">
			{#each swatches as s (s.name)}
				<div class="swatch">
					<div class="chip {s.cls}"></div>
					<code>{s.name}</code>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Typography · Plus Jakarta Sans</h2>
		<div class="type">
			{#each typeScale as t (t.label)}
				<p class={t.cls}>{t.label}</p>
			{/each}
			<p class="timecode snip-mono">00:12:04 / 00:48:21</p>
		</div>
	</section>

	<section>
		<h2>Buttons</h2>
		<div class="row">
			<Button variant="primary">Export</Button>
			<Button variant="secondary">Import</Button>
			<Button variant="ghost">Cancel</Button>
			<Button variant="danger">Delete</Button>
			<Button variant="primary" disabled>Disabled</Button>
		</div>
		<div class="row">
			<Button variant="secondary" size="sm">Small</Button>
			<Button variant="secondary" size="md">Medium</Button>
			<Button variant="secondary" size="lg">Large</Button>
		</div>
	</section>

	<section>
		<h2>Toolbar</h2>
		<div class="toolbar">
			<IconButton icon="import" label="Import media" variant="solid" />
			<span class="divider"></span>
			<IconButton icon="skipBack" label="To start" />
			<IconButton
				icon={playing ? 'pause' : 'play'}
				label={playing ? 'Pause' : 'Play'}
				variant="accent"
				size="lg"
				onclick={() => (playing = !playing)}
			/>
			<IconButton icon="skipForward" label="To end" />
			<span class="divider"></span>
			<IconButton icon="scissors" label="Split" />
			<IconButton icon="trim" label="Trim" />
			<IconButton icon="trash" label="Delete clip" />
			<span class="divider"></span>
			<IconButton icon="undo" label="Undo" />
			<IconButton icon="redo" label="Redo" />
			<span class="divider"></span>
			<IconButton icon="zoomOut" label="Zoom out" />
			<IconButton icon="zoomIn" label="Zoom in" />
			<IconButton
				icon="magnet"
				label="Snapping"
				active={snapping}
				onclick={() => (snapping = !snapping)}
			/>
			<span class="spacer"></span>
			<IconButton icon="export" label="Export" variant="accent" />
		</div>
	</section>

	<section>
		<h2>Tooltips</h2>
		<div class="row tooltip-demo">
			<Tooltip text="Appears above" placement="top">
				<Button variant="secondary">Top</Button>
			</Tooltip>
			<Tooltip text="Appears below" placement="bottom">
				<Button variant="secondary">Bottom</Button>
			</Tooltip>
			<Tooltip text="Appears left" placement="left">
				<Button variant="secondary">Left</Button>
			</Tooltip>
			<Tooltip text="Appears right" placement="right">
				<Button variant="secondary">Right</Button>
			</Tooltip>
			<Tooltip text="Split clip at playhead" placement="top">
				<IconButton icon="scissors" label="Split" variant="solid" />
			</Tooltip>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: var(--snip-space-12) var(--snip-space-8);
		display: flex;
		flex-direction: column;
		gap: var(--snip-space-12);
	}

	/* Brand */
	.brand {
		display: flex;
		flex-direction: column;
		gap: var(--snip-space-2);
	}
	.brand :global(.brand-logo) {
		font-size: var(--snip-text-xl);
	}
	.brand p {
		color: var(--snip-text-muted);
		font-size: var(--snip-text-sm);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--snip-space-4);
	}
	h2 {
		font-size: var(--snip-text-xs);
		font-weight: var(--snip-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--snip-tracking-wide);
		color: var(--snip-text-muted);
	}

	/* Palette */
	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: var(--snip-space-3);
	}
	.swatch {
		display: flex;
		flex-direction: column;
		gap: var(--snip-space-2);
	}
	.chip {
		height: var(--snip-space-12);
		border-radius: var(--snip-radius-md);
		border: var(--snip-border-width) solid var(--snip-border);
	}
	.swatch code {
		font-family: var(--snip-font-mono);
		font-size: var(--snip-text-xs);
		color: var(--snip-text-secondary);
	}
	.sw-accent {
		background: var(--snip-accent);
	}
	.sw-accent-hover {
		background: var(--snip-accent-hover);
	}
	.sw-surface {
		background: var(--snip-bg-surface);
	}
	.sw-elevated {
		background: var(--snip-bg-elevated);
	}
	.sw-overlay {
		background: var(--snip-bg-overlay);
	}
	.sw-success {
		background: var(--snip-success);
	}
	.sw-danger {
		background: var(--snip-danger);
	}

	/* Type */
	.type {
		display: flex;
		flex-direction: column;
		gap: var(--snip-space-2);
	}
	.t-xl {
		font-size: var(--snip-text-xl);
		font-weight: var(--snip-weight-semibold);
		letter-spacing: var(--snip-tracking-tight);
	}
	.t-lg {
		font-size: var(--snip-text-lg);
		font-weight: var(--snip-weight-semibold);
	}
	.t-md {
		font-size: var(--snip-text-md);
		font-weight: var(--snip-weight-medium);
	}
	.t-base {
		font-size: var(--snip-text-base);
		color: var(--snip-text-secondary);
	}
	.t-sm {
		font-size: var(--snip-text-sm);
		color: var(--snip-text-secondary);
	}
	.t-xs {
		font-size: var(--snip-text-xs);
		color: var(--snip-text-muted);
	}
	.timecode {
		margin-top: var(--snip-space-2);
		font-size: var(--snip-text-lg);
		color: var(--snip-accent);
	}

	/* Layout helpers */
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--snip-space-3);
	}
	.tooltip-demo {
		padding: var(--snip-space-8) 0;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--snip-space-1);
		padding: var(--snip-space-2);
		background: var(--snip-bg-surface);
		border: var(--snip-border-width) solid var(--snip-border);
		border-radius: var(--snip-radius-lg);
	}
	.divider {
		width: var(--snip-border-width);
		align-self: stretch;
		margin: var(--snip-space-1) var(--snip-space-2);
		background: var(--snip-border);
	}
	.spacer {
		flex: 1;
	}
</style>
