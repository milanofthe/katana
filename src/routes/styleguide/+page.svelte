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
			<p class="timecode katana-mono">00:12:04 / 00:48:21</p>
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
		padding: var(--katana-space-12) var(--katana-space-8);
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-12);
	}

	/* Brand */
	.brand {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
	}
	.brand :global(.brand-logo) {
		font-size: var(--katana-text-xl);
	}
	.brand p {
		color: var(--katana-text-muted);
		font-size: var(--katana-text-sm);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-4);
	}
	h2 {
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--katana-tracking-wide);
		color: var(--katana-text-muted);
	}

	/* Palette */
	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: var(--katana-space-3);
	}
	.swatch {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
	}
	.chip {
		height: var(--katana-space-12);
		border-radius: var(--katana-radius-md);
		border: var(--katana-border-width) solid var(--katana-border);
	}
	.swatch code {
		font-family: var(--katana-font-mono);
		font-size: var(--katana-text-xs);
		color: var(--katana-text-secondary);
	}
	.sw-accent {
		background: var(--katana-accent);
	}
	.sw-accent-hover {
		background: var(--katana-accent-hover);
	}
	.sw-surface {
		background: var(--katana-bg-surface);
	}
	.sw-elevated {
		background: var(--katana-bg-elevated);
	}
	.sw-overlay {
		background: var(--katana-bg-overlay);
	}
	.sw-success {
		background: var(--katana-success);
	}
	.sw-danger {
		background: var(--katana-danger);
	}

	/* Type */
	.type {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
	}
	.t-xl {
		font-size: var(--katana-text-xl);
		font-weight: var(--katana-weight-semibold);
		letter-spacing: var(--katana-tracking-tight);
	}
	.t-lg {
		font-size: var(--katana-text-lg);
		font-weight: var(--katana-weight-semibold);
	}
	.t-md {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-medium);
	}
	.t-base {
		font-size: var(--katana-text-base);
		color: var(--katana-text-secondary);
	}
	.t-sm {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-secondary);
	}
	.t-xs {
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}
	.timecode {
		margin-top: var(--katana-space-2);
		font-size: var(--katana-text-lg);
		color: var(--katana-accent);
	}

	/* Layout helpers */
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--katana-space-3);
	}
	.tooltip-demo {
		padding: var(--katana-space-8) 0;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--katana-space-1);
		padding: var(--katana-space-2);
		background: var(--katana-bg-surface);
		border: var(--katana-border-width) solid var(--katana-border);
		border-radius: var(--katana-radius-lg);
	}
	.divider {
		width: var(--katana-border-width);
		align-self: stretch;
		margin: var(--katana-space-1) var(--katana-space-2);
		background: var(--katana-border);
	}
	.spacer {
		flex: 1;
	}
</style>
