<script lang="ts">
	import { slide } from 'svelte/transition';
	import Icon from '../icons/Icon.svelte';

	interface Option {
		value: string;
		label: string;
		/** Optional CSS font-family to preview the option (e.g. a font picker). */
		font?: string;
	}

	interface Props {
		/** Selected option value. Two-way bindable. */
		value: string;
		options: Option[];
		/** Accessible label for the control. */
		label: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), options, label, disabled = false, onchange }: Props = $props();

	let open = $state(false);
	let active = $state(0); // keyboard-highlighted index
	let root = $state<HTMLDivElement>();

	const selected = $derived(options.find((o) => o.value === value));

	function toggle() {
		if (disabled) return;
		open = !open;
		if (open) active = Math.max(0, options.findIndex((o) => o.value === value));
	}

	function close() {
		open = false;
	}

	function choose(v: string) {
		value = v;
		onchange?.(v);
		close();
	}

	function onTriggerKey(e: KeyboardEvent) {
		if (disabled) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!open) {
				open = true;
				active = Math.max(0, options.findIndex((o) => o.value === value));
				return;
			}
			const dir = e.key === 'ArrowDown' ? 1 : -1;
			active = (active + dir + options.length) % options.length;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (open && options[active]) choose(options[active].value);
			else toggle();
		} else if (e.key === 'Escape') {
			if (open) {
				e.preventDefault();
				close();
			}
		} else if (e.key === 'Tab') {
			close();
		}
	}

	// Close when clicking outside the control.
	function onWindowPointer(e: PointerEvent) {
		if (open && root && !root.contains(e.target as Node)) close();
	}
</script>

<svelte:window onpointerdown={onWindowPointer} />

<div class="select" bind:this={root}>
	<button
		type="button"
		class="trigger"
		class:open
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={label}
		onclick={toggle}
		onkeydown={onTriggerKey}
	>
		<span class="value" style={selected?.font ? `font-family:${selected.font}` : ''}>
			{selected?.label ?? ''}
		</span>
		<Icon name="chevronDown" size={14} />
	</button>

	{#if open}
		<ul class="menu" role="listbox" aria-label={label} transition:slide={{ duration: 140 }}>
			{#each options as o, i (o.value)}
				<li>
					<button
						type="button"
						class="option"
						class:selected={o.value === value}
						class:active={i === active}
						role="option"
						aria-selected={o.value === value}
						style={o.font ? `font-family:${o.font}` : ''}
						onpointermove={() => (active = i)}
						onclick={() => choose(o.value)}
					>
						{o.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.select {
		position: relative;
		flex: 1;
		min-width: 0;
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--katana-space-2);
		width: 100%;
		height: var(--katana-control-sm);
		padding: 0 var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: var(--katana-bg-overlay);
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-primary);
		font-size: var(--katana-text-xs);
		cursor: pointer;
		transition:
			border-color var(--katana-duration-fast) var(--katana-ease-out),
			background var(--katana-duration-fast) var(--katana-ease-out);
	}
	.trigger:hover:not(:disabled) {
		border-color: var(--katana-border-strong);
	}
	.trigger.open {
		border-color: var(--katana-accent);
	}
	.trigger:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.trigger:focus-visible {
		outline: none;
		border-color: var(--katana-accent);
	}
	/* Chevron rotates as the menu unfolds. */
	.trigger :global(svg) {
		color: var(--katana-text-muted);
		transition: transform var(--katana-duration-fast) var(--katana-ease-out);
		flex: none;
	}
	.trigger.open :global(svg) {
		transform: rotate(180deg);
		color: var(--katana-accent);
	}
	.value {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.menu {
		list-style: none;
		margin: var(--katana-space-1) 0 0;
		padding: var(--katana-space-1);
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: var(--katana-z-dropdown);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border-strong);
		border-radius: var(--katana-radius-md);
		box-shadow: var(--katana-shadow-pop);
		max-height: 14rem;
		overflow-y: auto;
		scrollbar-width: thin;
	}

	.option {
		display: block;
		width: 100%;
		padding: var(--katana-space-2) var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: transparent;
		border: none;
		color: var(--katana-text-secondary);
		font-size: var(--katana-text-xs);
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: pointer;
	}
	/* Keyboard / hover highlight. */
	.option.active {
		background: var(--katana-bg-overlay);
		color: var(--katana-text-primary);
	}
	/* Current selection in the accent. */
	.option.selected {
		color: var(--katana-accent);
	}
	.option.selected.active {
		background: var(--katana-accent-muted);
	}
</style>
