<script lang="ts">
	import { onMount } from 'svelte';
	import { TopBar, PreviewPane, TransportBar, Timeline } from '$lib/components/editor';
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
	<PreviewPane />
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
		background: var(--snip-bg-base);
		overflow: hidden;
	}

	.drop-overlay {
		position: absolute;
		inset: var(--snip-space-4);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--snip-accent-muted);
		border: var(--snip-border-width-thick) dashed var(--snip-accent);
		border-radius: var(--snip-radius-lg);
		z-index: var(--snip-z-overlay);
		pointer-events: none;
	}
	.drop-message {
		font-size: var(--snip-text-md);
		font-weight: var(--snip-weight-semibold);
		color: var(--snip-accent);
	}
</style>
