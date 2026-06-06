<script lang="ts">
	import { onMount } from 'svelte';
	import {
		TopBar,
		PreviewPane,
		TransportBar,
		Timeline,
		PropertiesPanel,
		CommandPalette
	} from '$lib/components/editor';
	import { handleEditorKeydown } from '$lib/editor/keyboard';
	import { setupDragDrop } from '$lib/editor/dragdrop';
	import { editor } from '$lib/editor/store.svelte';

	onMount(() => {
		let unlisten: (() => void) | undefined;
		let cancelled = false;
		setupDragDrop().then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	});

	// Auto-dismiss the toast a few seconds after it appears.
	$effect(() => {
		if (!editor.notice) return;
		const t = setTimeout(() => (editor.notice = null), 4000);
		return () => clearTimeout(t);
	});
</script>

<svelte:window onkeydown={handleEditorKeydown} />

<div class="editor">
	<TopBar />
	<div class="stage-row">
		<PreviewPane />
		<PropertiesPanel />
	</div>
	<TransportBar />
	<Timeline />

	{#if editor.dropActive}
		<div class="drop-overlay">
			<span class="drop-message">Drop video to add it to the timeline</span>
		</div>
	{/if}

	{#if editor.exporting}
		<div class="export-overlay">
			<div class="export-box">
				<span class="export-message">Exporting… {Math.round(editor.exportProgress * 100)}%</span>
				<div class="export-bar">
					<div class="export-fill" style="width: {editor.exportProgress * 100}%"></div>
				</div>
			</div>
		</div>
	{/if}

	{#if editor.notice}
		<div class="toast {editor.notice.kind}" role="status">{editor.notice.text}</div>
	{/if}

	<CommandPalette />
</div>

<style>
	.editor {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--katana-bg-base);
		overflow: hidden;
	}

	/* Preview + properties panel side by side */
	.stage-row {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.drop-overlay {
		position: absolute;
		inset: var(--katana-space-4);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--katana-accent-muted);
		border: var(--katana-border-width-thick) dashed var(--katana-accent);
		border-radius: var(--katana-radius-lg);
		z-index: var(--katana-z-overlay);
		pointer-events: none;
	}
	.drop-message {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-accent);
	}

	/* Export busy overlay */
	.export-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--katana-scrim);
		z-index: var(--katana-z-overlay);
	}
	.export-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--katana-space-3);
		min-width: 16rem;
	}
	.export-message {
		font-size: var(--katana-text-lg);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
		font-variant-numeric: tabular-nums;
	}
	.export-bar {
		width: 100%;
		height: var(--katana-space-1);
		border-radius: var(--katana-radius-full);
		background: var(--katana-bg-overlay);
		overflow: hidden;
	}
	.export-fill {
		height: 100%;
		background: var(--katana-accent);
		border-radius: var(--katana-radius-full);
		transition: width var(--katana-duration-fast) var(--katana-ease-out);
	}

	/* Result toast */
	.toast {
		position: absolute;
		bottom: var(--katana-space-6);
		left: 50%;
		transform: translateX(-50%);
		max-width: 80%;
		padding: var(--katana-space-2) var(--katana-space-4);
		border-radius: var(--katana-radius-md);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border);
		box-shadow: var(--katana-shadow-pop);
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
		color: var(--katana-text-primary);
		white-space: pre-line;
		z-index: var(--katana-z-tooltip);
	}
	.toast.ok {
		border-color: var(--katana-success);
	}
	.toast.error {
		border-color: var(--katana-danger);
	}
</style>
