<script lang="ts">
	// One-shot intro: the screen starts fully covered in the background color, the
	// katana blade drops from above and slices down the center, then the two
	// halves fold away left and right to reveal the page beneath.
	import { onMount } from 'svelte';
	import { Logo } from '$ui';

	let visible = $state(true);

	onMount(() => {
		// Reduced motion is handled in CSS (overlay hidden); here we just unmount
		// after the animation so the node is gone and nothing lingers in the DOM.
		const t = setTimeout(() => (visible = false), 1750);
		return () => clearTimeout(t);
	});
</script>

{#if visible}
	<div class="intro" aria-hidden="true">
		<div class="half left"></div>
		<div class="half right"></div>
		<div class="edge"></div>
		<div class="blade"><Logo variant="mark" /></div>
	</div>
{/if}

<style>
	.intro {
		position: fixed;
		inset: 0;
		z-index: 9999;
		overflow: hidden;
		pointer-events: none; /* never block the page underneath */
		perspective: 1400px;
	}

	/* Two halves in the background color cover the page, then part. */
	.half {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 50.5%; /* slight overlap so the center never shows a seam */
		background: var(--katana-bg-base);
		backface-visibility: hidden;
	}
	.half.left {
		left: 0;
		transform-origin: left center;
		animation: part-left 1650ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
	}
	.half.right {
		right: 0;
		transform-origin: right center;
		animation: part-right 1650ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
	}
	@keyframes part-left {
		0%,
		42% {
			transform: translateX(0) rotateY(0deg);
		}
		100% {
			transform: translateX(-101%) rotateY(-40deg);
		}
	}
	@keyframes part-right {
		0%,
		42% {
			transform: translateX(0) rotateY(0deg);
		}
		100% {
			transform: translateX(101%) rotateY(40deg);
		}
	}

	/* The cut: a bright accent line drawn down the center as the blade lands. */
	.edge {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 2px;
		transform: translateX(-50%);
		transform-origin: top center;
		background: var(--katana-accent);
		box-shadow: 0 0 18px 3px var(--katana-accent);
		opacity: 0;
		animation: cut 1650ms ease-out forwards;
	}
	@keyframes cut {
		0%,
		12% {
			opacity: 0;
			transform: translateX(-50%) scaleY(0);
		}
		36% {
			opacity: 1;
			transform: translateX(-50%) scaleY(1);
		}
		44% {
			opacity: 1;
			transform: translateX(-50%) scaleY(1);
		}
		66% {
			opacity: 0;
		}
		100% {
			opacity: 0;
		}
	}

	/* The blade descends from above, slices the center, and continues out. */
	.blade {
		position: absolute;
		left: 50%;
		top: 50%;
		font-size: clamp(18rem, 46vh, 40rem); /* sizes the Logo mark */
		line-height: 0;
		filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55));
		animation: blade 1650ms cubic-bezier(0.5, 0, 0.25, 1) forwards;
	}
	@keyframes blade {
		0% {
			transform: translate(-50%, -50%) translateY(-150vh) rotate(12deg);
			opacity: 0;
		}
		12% {
			opacity: 1;
		}
		36% {
			transform: translate(-50%, -50%) translateY(0) rotate(0deg);
			opacity: 1;
		}
		44% {
			transform: translate(-50%, -50%) translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) translateY(155vh) rotate(-5deg);
			opacity: 0;
		}
	}

	/* Respect reduced motion: no intro, page is shown immediately. */
	@media (prefers-reduced-motion: reduce) {
		.intro {
			display: none;
		}
	}
</style>
