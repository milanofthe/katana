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
		z-index: var(--snip-z-tooltip);
		white-space: nowrap;
		pointer-events: none;
		background: var(--snip-tooltip-bg);
		color: var(--snip-tooltip-text);
		border: var(--snip-border-width) solid var(--snip-border);
		border-radius: var(--snip-radius-md);
		box-shadow: var(--snip-shadow-pop);
		padding: var(--snip-space-1) var(--snip-space-2);
		font-family: var(--snip-font-sans);
		font-size: var(--snip-text-xs);
		font-weight: var(--snip-weight-medium);
		line-height: var(--snip-leading-tight);
		opacity: 0;
		transition:
			opacity var(--snip-duration-fast) var(--snip-ease-out),
			transform var(--snip-duration-fast) var(--snip-ease-out);
		transition-delay: 0s;
	}

	/* Reveal on hover or keyboard focus, after a short delay. */
	.wrap:hover .tip,
	.wrap:focus-within .tip {
		opacity: 1;
		transform: translate(0, 0);
		transition-delay: var(--snip-tooltip-delay);
	}

	/* Placements — each sits offset from the trigger and animates in from it. */
	.top {
		bottom: calc(100% + var(--snip-tooltip-offset));
		left: 50%;
		transform: translate(-50%, var(--snip-space-1));
	}
	.wrap:hover .top,
	.wrap:focus-within .top {
		transform: translate(-50%, 0);
	}

	.bottom {
		top: calc(100% + var(--snip-tooltip-offset));
		left: 50%;
		transform: translate(-50%, calc(-1 * var(--snip-space-1)));
	}
	.wrap:hover .bottom,
	.wrap:focus-within .bottom {
		transform: translate(-50%, 0);
	}

	.left {
		right: calc(100% + var(--snip-tooltip-offset));
		top: 50%;
		transform: translate(var(--snip-space-1), -50%);
	}
	.wrap:hover .left,
	.wrap:focus-within .left {
		transform: translate(0, -50%);
	}

	.right {
		left: calc(100% + var(--snip-tooltip-offset));
		top: 50%;
		transform: translate(calc(-1 * var(--snip-space-1)), -50%);
	}
	.wrap:hover .right,
	.wrap:focus-within .right {
		transform: translate(0, -50%);
	}
</style>
