<script lang="ts">
	import { onMount } from 'svelte';
	import {
		TopBar,
		PreviewPane,
		TransportBar,
		Timeline,
		PropertiesPanel
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
</style>
