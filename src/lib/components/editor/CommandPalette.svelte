<script lang="ts">
	import { editor } from '$lib/editor/store.svelte';
	import { importMedia } from '$lib/editor/import';
	import { TIMELINE } from '$lib/constants';

	interface Command {
		id: string;
		title: string;
		hint?: string;
		disabled?: boolean;
		run: () => void;
	}

	let open = $state(false);
	let query = $state('');
	let selected = $state(0);
	let inputEl = $state<HTMLInputElement>();

	const commands = $derived<Command[]>([
		{ id: 'import', title: 'Import media…', run: () => importMedia() },
		{
			id: 'export',
			title: 'Export video…',
			disabled: editor.clips.length === 0 || editor.exporting,
			run: () => (editor.exportDialogOpen = true)
		},
		{
			id: 'play',
			title: editor.playing ? 'Pause' : 'Play',
			hint: 'Space',
			disabled: editor.clips.length === 0,
			run: () => editor.togglePlay()
		},
		{
			id: 'split',
			title: 'Split at playhead',
			hint: 'S',
			disabled: !editor.selectedClip,
			run: () => editor.splitAtPlayhead()
		},
		{
			id: 'delete',
			title: 'Delete selected clip',
			hint: 'Del',
			disabled: !editor.selectedClip,
			run: () => editor.removeSelected()
		},
		{
			id: 'detach-audio',
			title: 'Detach audio to its own track',
			disabled:
				!editor.selectedClip || editor.selectedClip.kind !== 'video' || editor.selectedClip.muted,
			run: () => editor.selectedClip && editor.detachAudio(editor.selectedClip.id)
		},
		{ id: 'undo', title: 'Undo', hint: 'Ctrl+Z', disabled: !editor.canUndo, run: () => editor.undo() },
		{
			id: 'redo',
			title: 'Redo',
			hint: 'Ctrl+Shift+Z',
			disabled: !editor.canRedo,
			run: () => editor.redo()
		},
		{
			id: 'start',
			title: 'Go to start',
			hint: 'Home',
			disabled: editor.clips.length === 0,
			run: () => editor.seek(0)
		},
		{
			id: 'end',
			title: 'Go to end',
			hint: 'End',
			disabled: editor.clips.length === 0,
			run: () => editor.seek(editor.totalDuration)
		},
		{ id: 'zoom-in', title: 'Zoom in', run: () => editor.zoomBy(TIMELINE.zoomStep) },
		{ id: 'zoom-out', title: 'Zoom out', run: () => editor.zoomBy(1 / TIMELINE.zoomStep) },
		{
			id: 'snap',
			title: editor.snapping ? 'Disable snapping' : 'Enable snapping',
			run: () => editor.toggleSnap()
		},
		{
			id: 'reset',
			title: 'Reset placement',
			disabled: !editor.selectedClip,
			run: () => editor.selectedClip && editor.resetTransform(editor.selectedClip.id)
		},
		{ id: 'fmt-orig', title: 'Format: Original', run: () => editor.setAspectRatio('original') },
		{ id: 'fmt-169', title: 'Format: 16:9', run: () => editor.setAspectRatio('16:9') },
		{ id: 'fmt-916', title: 'Format: 9:16', run: () => editor.setAspectRatio('9:16') },
		{ id: 'fmt-11', title: 'Format: 1:1', run: () => editor.setAspectRatio('1:1') }
	]);

	// Subsequence fuzzy match: returns a score (higher = better) or null if the
	// query characters don't all appear in order.
	function fuzzy(q: string, text: string): number | null {
		if (!q) return 0;
		const t = text.toLowerCase();
		const s = q.toLowerCase();
		let ti = 0;
		let score = 0;
		let streak = 0;
		for (let si = 0; si < s.length; si++) {
			let found = -1;
			for (; ti < t.length; ti++) {
				if (t[ti] === s[si]) {
					found = ti;
					break;
				}
			}
			if (found === -1) return null;
			// Reward consecutive hits and word-start / early-position matches.
			streak = found === 0 || t[found - 1] === ' ' ? streak + 2 : streak + 1;
			score += streak + Math.max(0, 10 - found);
			ti = found + 1;
		}
		return score;
	}

	const results = $derived.by(() => {
		const q = query.trim();
		return commands
			.map((c) => ({ c, score: fuzzy(q, c.title) }))
			.filter((x): x is { c: Command; score: number } => x.score !== null)
			.sort((a, b) => b.score - a.score)
			.map((x) => x.c);
	});

	// Keep the selection within range as results shrink.
	$effect(() => {
		if (selected >= results.length) selected = Math.max(0, results.length - 1);
	});

	function openPalette() {
		open = true;
		query = '';
		selected = 0;
		requestAnimationFrame(() => inputEl?.focus());
	}

	function closePalette() {
		open = false;
	}

	function runCommand(c: Command) {
		if (c.disabled) return;
		closePalette();
		c.run();
	}

	function onWindowKey(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			if (open) closePalette();
			else openPalette();
			return;
		}
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closePalette();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selected = Math.min(results.length - 1, selected + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selected = Math.max(0, selected - 1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const c = results[selected];
			if (c) runCommand(c);
		}
	}
</script>

<svelte:window onkeydown={onWindowKey} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -- scrim closes on click; Esc handled globally -->
	<div class="cmdk-scrim" onpointerdown={closePalette}>
		<div
			class="cmdk"
			role="dialog"
			aria-label="Command palette"
			tabindex="-1"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<input
				bind:this={inputEl}
				bind:value={query}
				class="cmdk-input"
				placeholder="Type a command…"
				aria-label="Command search"
				spellcheck="false"
				autocomplete="off"
				oninput={() => (selected = 0)}
			/>
			<ul class="cmdk-list" role="listbox" aria-label="Commands">
				{#each results as c, i (c.id)}
					<li>
						<button
							class="cmdk-item"
							class:active={i === selected}
							onpointermove={() => (selected = i)}
							onclick={() => runCommand(c)}
							disabled={c.disabled}
						>
							<span class="cmdk-title">{c.title}</span>
							{#if c.hint}<span class="cmdk-hint katana-mono">{c.hint}</span>{/if}
						</button>
					</li>
				{:else}
					<li class="cmdk-empty">No matching command</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.cmdk-scrim {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-top: 12vh;
		background: var(--katana-scrim);
		z-index: var(--katana-z-tooltip);
	}

	.cmdk {
		width: min(34rem, 90vw);
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border-strong);
		border-radius: var(--katana-radius-lg);
		box-shadow: var(--katana-shadow-pop);
		overflow: hidden;
	}

	.cmdk-input {
		flex: none;
		height: var(--katana-control-lg);
		padding: 0 var(--katana-space-4);
		background: transparent;
		border: none;
		border-bottom: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-primary);
		font-family: var(--katana-font-sans);
		font-size: var(--katana-text-md);
	}
	.cmdk-input::placeholder {
		color: var(--katana-text-muted);
	}
	.cmdk-input:focus {
		outline: none;
	}

	.cmdk-list {
		list-style: none;
		margin: 0;
		padding: var(--katana-space-1);
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--katana-border-strong) transparent;
	}

	.cmdk-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--katana-space-3);
		width: 100%;
		padding: var(--katana-space-2) var(--katana-space-3);
		border-radius: var(--katana-radius-sm);
		background: transparent;
		color: var(--katana-text-secondary);
		text-align: left;
		cursor: pointer;
	}
	.cmdk-item.active {
		background: var(--katana-accent-muted);
		color: var(--katana-text-primary);
	}
	.cmdk-item:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.cmdk-title {
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
	}
	.cmdk-hint {
		flex: none;
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}

	.cmdk-empty {
		padding: var(--katana-space-3);
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
		text-align: center;
	}
</style>
