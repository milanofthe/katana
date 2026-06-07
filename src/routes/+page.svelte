<script lang="ts">
	import { onMount } from 'svelte';
	import {
		TopBar,
		PreviewPane,
		TransportBar,
		Timeline,
		PropertiesPanel,
		CommandPalette,
		ExportDialog,
		ExportProgress
	} from '$lib/components/editor';
	import { Icon } from '$lib';
	import { handleEditorKeydown } from '$lib/editor/keyboard';
	import { setupDragDrop } from '$lib/editor/dragdrop';
	import { editor } from '$lib/editor/store.svelte';
	import { LAYOUT } from '$lib/constants';

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

	// Drag the divider to resize the properties sidebar (drag left = wider).
	// Dragging well below the minimum snaps it collapsed.
	function startPropsResize(e: PointerEvent) {
		e.preventDefault();
		const startX = e.clientX;
		const startW = editor.propsWidth;
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		const onMove = (ev: PointerEvent) => {
			const raw = startW + (startX - ev.clientX);
			if (raw < LAYOUT.propsWidthMin - LAYOUT.collapseSnapPx) {
				editor.propsCollapsed = true; // snap to collapsed; gesture ends
				onUp();
				return;
			}
			editor.setPropsWidth(raw);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Drag the divider to resize the timeline height (drag up = taller).
	// Dragging well below the minimum snaps it collapsed.
	function startTimelineResize(e: PointerEvent) {
		e.preventDefault();
		const startY = e.clientY;
		const startH = editor.timelineHeight;
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		const onMove = (ev: PointerEvent) => {
			const raw = startH + (startY - ev.clientY);
			if (raw < LAYOUT.timelineHeightMin - LAYOUT.collapseSnapPx) {
				editor.timelineCollapsed = true; // snap to collapsed; gesture ends
				onUp();
				return;
			}
			editor.setTimelineHeight(raw);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}
</script>

<svelte:window onkeydown={handleEditorKeydown} />

<div class="editor">
	<TopBar />
	<div class="stage-row">
		<PreviewPane />
		{#if !editor.propsCollapsed}
			<!-- svelte-ignore a11y_no_static_element_interactions -- pointer resize handle -->
			<div
				class="v-splitter"
				role="separator"
				aria-orientation="vertical"
				onpointerdown={startPropsResize}
			></div>
		{/if}
		<PropertiesPanel />
	</div>
	<TransportBar />
	{#if !editor.timelineCollapsed}
		<!-- svelte-ignore a11y_no_static_element_interactions -- pointer resize handle -->
		<div
			class="h-splitter"
			role="separator"
			aria-orientation="horizontal"
			onpointerdown={startTimelineResize}
		></div>
		<div class="timeline-wrap" style="height: {editor.timelineHeight}px">
			<Timeline />
		</div>
	{:else}
		<button class="rail-bar" onclick={() => (editor.timelineCollapsed = false)}>
			<Icon name="chevronUp" size={14} />
			<span>Timeline</span>
		</button>
	{/if}

	{#if editor.dropActive}
		<div class="drop-overlay">
			<span class="drop-message">Drop video to add it to the timeline</span>
		</div>
	{/if}

	<ExportProgress />

	{#if editor.notice}
		<div class="toast {editor.notice.kind}" role="status">{editor.notice.text}</div>
	{/if}

	<CommandPalette />
	<ExportDialog />
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

	/* Resize handles between panels. Invisible until hovered/dragged. */
	.v-splitter {
		flex: none;
		width: var(--katana-space-2);
		margin-inline: calc(var(--katana-space-2) / -2);
		cursor: col-resize;
		background: transparent;
		z-index: var(--katana-z-timeline);
		transition: background var(--katana-duration-fast) var(--katana-ease-out);
	}
	.h-splitter {
		flex: none;
		height: var(--katana-space-2);
		margin-block: calc(var(--katana-space-2) / -2);
		cursor: row-resize;
		background: transparent;
		z-index: var(--katana-z-timeline);
		transition: background var(--katana-duration-fast) var(--katana-ease-out);
	}
	.v-splitter:hover,
	.h-splitter:hover {
		background: var(--katana-accent);
	}

	.timeline-wrap {
		flex: none;
		min-height: 0;
		overflow: hidden;
	}

	/* Collapsed timeline: a thin bar that re-expands on click. */
	.rail-bar {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--katana-space-2);
		height: var(--katana-control-sm);
		background: var(--katana-bg-surface);
		border-top: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-muted);
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		cursor: pointer;
		transition: color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.rail-bar:hover {
		color: var(--katana-text-primary);
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
