<script lang="ts">
	import Icon from '../icons/Icon.svelte';
	import type { IconName } from '../icons/paths';

	interface Props {
		icon: IconName;
		/** Accessible label — required, since the button is icon-only. */
		label: string;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'ghost' | 'solid' | 'accent';
		/** Toggle/pressed state, e.g. for the snapping switch. */
		active?: boolean;
		disabled?: boolean;
		onclick?: () => void;
	}

	let {
		icon,
		label,
		size = 'md',
		variant = 'ghost',
		active = false,
		disabled = false,
		onclick
	}: Props = $props();
</script>

<button
	class="icon-btn {variant} {size}"
	class:active
	{disabled}
	aria-label={label}
	aria-pressed={active}
	{onclick}
>
	<Icon name={icon} />
</button>

<style>
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		border-radius: var(--snip-radius-md);
		color: var(--snip-text-secondary);
		transition:
			background var(--snip-duration-fast) var(--snip-ease-out),
			color var(--snip-duration-fast) var(--snip-ease-out);
	}

	.icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Sizes — font-size drives the 1em icon. */
	.sm {
		height: var(--snip-control-sm);
		font-size: var(--snip-icon-sm);
	}
	.md {
		height: var(--snip-control-md);
		font-size: var(--snip-icon-md);
	}
	.lg {
		height: var(--snip-control-lg);
		font-size: var(--snip-icon-lg);
	}

	/* Variants */
	.ghost {
		background: transparent;
	}
	.ghost:hover:not(:disabled) {
		background: var(--snip-bg-overlay);
		color: var(--snip-text-primary);
	}

	.solid {
		background: var(--snip-bg-elevated);
		border: var(--snip-border-width) solid var(--snip-border);
		color: var(--snip-text-primary);
	}
	.solid:hover:not(:disabled) {
		background: var(--snip-bg-overlay);
	}

	.accent {
		background: var(--snip-accent);
		color: var(--snip-accent-contrast);
	}
	.accent:hover:not(:disabled) {
		background: var(--snip-accent-hover);
	}

	/* Active / pressed (toggles) */
	.active:not(.accent) {
		background: var(--snip-accent-muted);
		color: var(--snip-accent);
	}
</style>
