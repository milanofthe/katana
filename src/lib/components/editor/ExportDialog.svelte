<script lang="ts">
	import { editor } from '$lib/editor/store.svelte';
	import { runExport, type ExportSettings } from '$lib/editor/export';

	interface FormatOption {
		value: string;
		label: string;
		hint: string;
	}

	const formats: FormatOption[] = [
		{ value: 'mp4-h264', label: 'MP4 · H.264', hint: 'Universal, best compatibility' },
		{ value: 'mp4-h265', label: 'MP4 · H.265', hint: 'Smaller files, modern devices' },
		{ value: 'webm-vp9', label: 'WebM · VP9', hint: 'Web-optimized, open codec' },
		{ value: 'mov-h264', label: 'MOV · H.264', hint: 'QuickTime / Apple' },
		{ value: 'gif', label: 'GIF', hint: 'Animated, no audio' }
	];

	const resolutions = [
		{ value: 'source', label: 'Source' },
		{ value: '2160', label: '4K' },
		{ value: '1440', label: '1440p' },
		{ value: '1080', label: '1080p' },
		{ value: '720', label: '720p' },
		{ value: '480', label: '480p' }
	];

	const qualities = [
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' }
	];

	let format = $state('mp4-h264');
	let resolution = $state('source');
	let quality = $state('high');

	const isGif = $derived(format === 'gif');

	function close() {
		editor.exportDialogOpen = false;
	}

	function start() {
		const settings: ExportSettings = { format, resolution, quality };
		close();
		runExport(settings);
	}

	function onKey(e: KeyboardEvent) {
		if (!editor.exportDialogOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			start();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if editor.exportDialogOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -- scrim closes on click; Esc handled globally -->
	<div class="scrim" onpointerdown={close}>
		<div
			class="dialog"
			role="dialog"
			aria-label="Export settings"
			aria-modal="true"
			tabindex="-1"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<header class="head">
				<h2 class="heading">Export</h2>
				<p class="sub">Choose a format and quality for the rendered video.</p>
			</header>

			<section class="group">
				<h3 class="label">Format</h3>
				<div class="formats" role="radiogroup" aria-label="Output format">
					{#each formats as f (f.value)}
						<button
							class="format"
							class:active={format === f.value}
							role="radio"
							aria-checked={format === f.value}
							onclick={() => (format = f.value)}
						>
							<span class="format-name">{f.label}</span>
							<span class="format-hint">{f.hint}</span>
						</button>
					{/each}
				</div>
			</section>

			<section class="group">
				<h3 class="label">Resolution</h3>
				<div class="segmented" role="radiogroup" aria-label="Resolution">
					{#each resolutions as r (r.value)}
						<button
							class="seg"
							class:active={resolution === r.value}
							role="radio"
							aria-checked={resolution === r.value}
							onclick={() => (resolution = r.value)}
						>
							{r.label}
						</button>
					{/each}
				</div>
			</section>

			<section class="group" class:disabled={isGif}>
				<h3 class="label">Quality{isGif ? ' (n/a for GIF)' : ''}</h3>
				<div class="segmented" role="radiogroup" aria-label="Quality">
					{#each qualities as qOpt (qOpt.value)}
						<button
							class="seg"
							class:active={quality === qOpt.value}
							role="radio"
							aria-checked={quality === qOpt.value}
							disabled={isGif}
							onclick={() => (quality = qOpt.value)}
						>
							{qOpt.label}
						</button>
					{/each}
				</div>
			</section>

			<footer class="actions">
				<button class="btn ghost" onclick={close}>Cancel</button>
				<button class="btn accent" onclick={start}>Export</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--katana-scrim);
		z-index: var(--katana-z-tooltip);
	}

	.dialog {
		width: min(30rem, 92vw);
		max-height: 88vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-5);
		padding: var(--katana-space-5);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border-strong);
		border-radius: var(--katana-radius-lg);
		box-shadow: var(--katana-shadow-pop);
		scrollbar-width: thin;
		scrollbar-color: var(--katana-border-strong) transparent;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-1);
	}
	.heading {
		margin: 0;
		font-size: var(--katana-text-lg);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
	}
	.sub {
		margin: 0;
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
	}
	.group.disabled {
		opacity: 0.5;
	}
	.label {
		margin: 0;
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--katana-tracking-wide);
		color: var(--katana-text-muted);
	}

	/* Format list */
	.formats {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-1);
	}
	.format {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-px);
		align-items: flex-start;
		padding: var(--katana-space-2) var(--katana-space-3);
		border-radius: var(--katana-radius-md);
		background: var(--katana-bg-surface);
		border: var(--katana-border-width) solid var(--katana-border);
		cursor: pointer;
		text-align: left;
		transition:
			border-color var(--katana-duration-fast) var(--katana-ease-out),
			background var(--katana-duration-fast) var(--katana-ease-out);
	}
	.format:hover {
		border-color: var(--katana-border-strong);
	}
	.format.active {
		border-color: var(--katana-accent);
		background: var(--katana-accent-muted);
	}
	.format-name {
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
		color: var(--katana-text-primary);
	}
	.format-hint {
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}

	/* Segmented controls (resolution, quality) */
	.segmented {
		display: flex;
		flex-wrap: wrap;
		gap: var(--katana-space-1);
	}
	.seg {
		flex: 1 1 auto;
		min-width: 3.25rem;
		height: var(--katana-control-md);
		padding: 0 var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: var(--katana-bg-surface);
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-secondary);
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		cursor: pointer;
		transition:
			background var(--katana-duration-fast) var(--katana-ease-out),
			color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.seg:hover:not(:disabled) {
		background: var(--katana-bg-overlay);
		color: var(--katana-text-primary);
	}
	.seg.active {
		background: var(--katana-accent);
		border-color: var(--katana-accent);
		color: var(--katana-accent-contrast);
	}
	.seg:disabled {
		cursor: not-allowed;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--katana-space-2);
	}
	.btn {
		height: var(--katana-control-md);
		padding: 0 var(--katana-space-4);
		border-radius: var(--katana-radius-md);
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
		cursor: pointer;
	}
	.btn.ghost {
		background: transparent;
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-secondary);
	}
	.btn.ghost:hover {
		background: var(--katana-bg-overlay);
		color: var(--katana-text-primary);
	}
	.btn.accent {
		background: var(--katana-accent);
		border: var(--katana-border-width) solid var(--katana-accent);
		color: var(--katana-accent-contrast);
	}
	.btn.accent:hover {
		background: var(--katana-accent-hover);
	}
</style>
