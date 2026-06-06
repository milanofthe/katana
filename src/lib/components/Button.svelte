<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit';
		onclick?: () => void;
		children: Snippet;
	}

	let {
		variant = 'secondary',
		size = 'md',
		disabled = false,
		type = 'button',
		onclick,
		children
	}: Props = $props();
</script>

<button class="btn {variant} {size}" {type} {disabled} {onclick}>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--snip-space-2);
		border-radius: var(--snip-radius-md);
		font-family: var(--snip-font-sans);
		font-weight: var(--snip-weight-medium);
		white-space: nowrap;
		transition:
			background var(--snip-duration-fast) var(--snip-ease-out),
			border-color var(--snip-duration-fast) var(--snip-ease-out),
			color var(--snip-duration-fast) var(--snip-ease-out);
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* Sizes */
	.sm {
		height: var(--snip-control-sm);
		padding: 0 var(--snip-space-3);
		font-size: var(--snip-text-xs);
	}
	.md {
		height: var(--snip-control-md);
		padding: 0 var(--snip-space-4);
		font-size: var(--snip-text-sm);
	}
	.lg {
		height: var(--snip-control-lg);
		padding: 0 var(--snip-space-5);
		font-size: var(--snip-text-base);
	}

	/* Variants */
	.primary {
		background: var(--snip-accent);
		color: var(--snip-accent-contrast);
	}
	.primary:hover:not(:disabled) {
		background: var(--snip-accent-hover);
	}

	.secondary {
		background: var(--snip-bg-elevated);
		color: var(--snip-text-primary);
		border: var(--snip-border-width) solid var(--snip-border);
	}
	.secondary:hover:not(:disabled) {
		background: var(--snip-bg-overlay);
		border-color: var(--snip-border-strong);
	}

	.ghost {
		background: transparent;
		color: var(--snip-text-secondary);
	}
	.ghost:hover:not(:disabled) {
		background: var(--snip-bg-overlay);
		color: var(--snip-text-primary);
	}

	.danger {
		background: var(--snip-danger);
		color: var(--snip-text-primary);
	}
	.danger:hover:not(:disabled) {
		filter: brightness(1.1);
	}
</style>
