<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Tooltip label. */
		text: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		children: Snippet;
	}

	let { text, placement = 'top', children }: Props = $props();
</script>

<span class="wrap">
	{@render children()}
	<span class="tip {placement}" role="tooltip">{text}</span>
</span>

<style>
	.wrap {
		position: relative;
		display: inline-flex;
	}

	.tip {
		position: absolute;
		z-index: var(--katana-z-tooltip);
		white-space: nowrap;
		pointer-events: none;
		background: var(--katana-tooltip-bg);
		color: var(--katana-tooltip-text);
		border: var(--katana-border-width) solid var(--katana-border);
		border-radius: var(--katana-radius-md);
		box-shadow: var(--katana-shadow-pop);
		padding: var(--katana-space-1) var(--katana-space-2);
		font-family: var(--katana-font-sans);
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		line-height: var(--katana-leading-tight);
		opacity: 0;
		transition:
			opacity var(--katana-duration-fast) var(--katana-ease-out),
			transform var(--katana-duration-fast) var(--katana-ease-out);
		transition-delay: 0s;
	}

	/* Reveal on hover or keyboard focus, after a short delay. */
	.wrap:hover .tip,
	.wrap:focus-within .tip {
		opacity: 1;
		transform: translate(0, 0);
		transition-delay: var(--katana-tooltip-delay);
	}

	/* Placements — each sits offset from the trigger and animates in from it. */
	.top {
		bottom: calc(100% + var(--katana-tooltip-offset));
		left: 50%;
		transform: translate(-50%, var(--katana-space-1));
	}
	.wrap:hover .top,
	.wrap:focus-within .top {
		transform: translate(-50%, 0);
	}

	.bottom {
		top: calc(100% + var(--katana-tooltip-offset));
		left: 50%;
		transform: translate(-50%, calc(-1 * var(--katana-space-1)));
	}
	.wrap:hover .bottom,
	.wrap:focus-within .bottom {
		transform: translate(-50%, 0);
	}

	.left {
		right: calc(100% + var(--katana-tooltip-offset));
		top: 50%;
		transform: translate(var(--katana-space-1), -50%);
	}
	.wrap:hover .left,
	.wrap:focus-within .left {
		transform: translate(0, -50%);
	}

	.right {
		left: calc(100% + var(--katana-tooltip-offset));
		top: 50%;
		transform: translate(calc(-1 * var(--katana-space-1)), -50%);
	}
	.wrap:hover .right,
	.wrap:focus-within .right {
		transform: translate(0, -50%);
	}
</style>
