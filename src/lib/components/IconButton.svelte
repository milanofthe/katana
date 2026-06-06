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
		border-radius: var(--katana-radius-md);
		color: var(--katana-text-secondary);
		transition:
			background var(--katana-duration-fast) var(--katana-ease-out),
			color var(--katana-duration-fast) var(--katana-ease-out);
	}

	.icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Sizes — font-size drives the 1em icon. */
	.sm {
		height: var(--katana-control-sm);
		font-size: var(--katana-icon-sm);
	}
	.md {
		height: var(--katana-control-md);
		font-size: var(--katana-icon-md);
	}
	.lg {
		height: var(--katana-control-lg);
		font-size: var(--katana-icon-lg);
	}

	/* Variants */
	.ghost {
		background: transparent;
	}
	.ghost:hover:not(:disabled) {
		background: var(--katana-bg-overlay);
		color: var(--katana-text-primary);
	}

	.solid {
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-primary);
	}
	.solid:hover:not(:disabled) {
		background: var(--katana-bg-overlay);
	}

	.accent {
		background: var(--katana-accent);
		color: var(--katana-accent-contrast);
	}
	.accent:hover:not(:disabled) {
		background: var(--katana-accent-hover);
	}

	/* Active / pressed (toggles) */
	.active:not(.accent) {
		background: var(--katana-accent-muted);
		color: var(--katana-accent);
	}
</style>
