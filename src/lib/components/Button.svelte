<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit';
		/** When set, renders an anchor styled as a button. */
		href?: string;
		target?: string;
		onclick?: () => void;
		children: Snippet;
	}

	let {
		variant = 'secondary',
		size = 'md',
		disabled = false,
		type = 'button',
		href,
		target,
		onclick,
		children
	}: Props = $props();
</script>

{#if href}
	<a
		class="btn {variant} {size}"
		{href}
		{target}
		rel={target === '_blank' ? 'noreferrer' : undefined}
		{onclick}
	>
		{@render children()}
	</a>
{:else}
	<button class="btn {variant} {size}" {type} {disabled} {onclick}>
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--katana-space-2);
		border-radius: var(--katana-radius-md);
		font-family: var(--katana-font-sans);
		font-weight: var(--katana-weight-medium);
		text-decoration: none;
		white-space: nowrap;
		transition:
			background var(--katana-duration-fast) var(--katana-ease-out),
			border-color var(--katana-duration-fast) var(--katana-ease-out),
			color var(--katana-duration-fast) var(--katana-ease-out);
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* Sizes */
	.sm {
		height: var(--katana-control-sm);
		padding: 0 var(--katana-space-3);
		font-size: var(--katana-text-xs);
	}
	.md {
		height: var(--katana-control-md);
		padding: 0 var(--katana-space-4);
		font-size: var(--katana-text-sm);
	}
	.lg {
		height: var(--katana-control-lg);
		padding: 0 var(--katana-space-5);
		font-size: var(--katana-text-base);
	}

	/* Variants */
	.primary {
		background: var(--katana-accent);
		color: var(--katana-accent-contrast);
	}
	.primary:hover:not(:disabled) {
		background: var(--katana-accent-hover);
	}

	.secondary {
		background: var(--katana-bg-elevated);
		color: var(--katana-text-primary);
		border: var(--katana-border-width) solid var(--katana-border);
	}
	.secondary:hover:not(:disabled) {
		background: var(--katana-bg-overlay);
		border-color: var(--katana-border-strong);
	}

	.ghost {
		background: transparent;
		color: var(--katana-text-secondary);
	}
	.ghost:hover:not(:disabled) {
		background: var(--katana-bg-overlay);
		color: var(--katana-text-primary);
	}

	.danger {
		background: var(--katana-danger);
		color: var(--katana-text-primary);
	}
	.danger:hover:not(:disabled) {
		filter: brightness(1.1);
	}
</style>
