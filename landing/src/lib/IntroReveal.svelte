<script lang="ts">
	// One-shot intro: the screen starts covered in the background color. The katana
	// descends the center, driving a single progress value (--cut). The two halves
	// are identical mirror images; the LEFT half sits in front of the blade and the
	// RIGHT half behind it, so the blade looks stuck through the slit it cuts. The
	// cut edge is an irregular slash that tracks the blade, no fades, until the
	// blade leaves the bottom and the page is fully revealed.
	import { onMount } from 'svelte';
	import { Logo } from '$ui';

	let visible = $state(true);

	onMount(() => {
		const t = setTimeout(() => (visible = false), 2000);
		return () => clearTimeout(t);
	});
</script>

{#if visible}
	<div class="intro" aria-hidden="true">
		<!-- DOM order = z-order: right half (behind blade), blade, left half (front). -->
		<div class="half right"></div>
		<div class="blade"><Logo variant="mark" /></div>
		<div class="half left"></div>
	</div>
{/if}

<style>
	/* Single animated progress, inherited by the blade and both halves so the cut
	   and the blade stay locked together. 0 = top, 1 = bottom of the viewport. */
	@property --cut {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}

	.intro {
		position: fixed;
		inset: 0;
		z-index: 9999;
		overflow: hidden;
		pointer-events: none; /* never block the page underneath */

		/* Tuning knobs. */
		--dur: 1700ms;
		--angle: 0deg; /* blade rotation (natural mark orientation) */
		--blade-offset: 12vh; /* raise the blade so it leads the cut */
		--vee: 22%; /* V depth: how much the outer edges lag the center seam */

		--cut: -0.2;
		animation: progress var(--dur) cubic-bezier(0.5, 0, 0.5, 1) forwards;
	}
	@keyframes progress {
		from {
			--cut: -0.2;
		}
		to {
			--cut: 1.3;
		}
	}

	/* Two halves in the background color cover the page, then peel away. The cut
	   edge is an irregular slash, deepest at the center seam (under the blade). The
	   two halves are exact mirror images of each other. */
	.half {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 50.5%; /* slight overlap so the center never shows a seam */
		/* The curtain is a touch lighter than the page background it peels off. */
		background: var(--katana-bg-elevated);
	}
	.half.right {
		right: 0;
		z-index: 1; /* behind the blade */
		clip-path: polygon(
			100% calc(var(--cut) * 100% - var(--vee)),
			0% calc(var(--cut) * 100%),
			0% 100%,
			100% 100%
		);
	}
	.half.left {
		left: 0;
		z-index: 3; /* in front of the blade */
		clip-path: polygon(
			0% calc(var(--cut) * 100% - var(--vee)),
			100% calc(var(--cut) * 100%),
			100% 100%,
			0% 100%
		);
	}

	/* The blade rides the cut, centered on X so it straddles the seam: its left
	   side is hidden by the front half, its right side shows over the back half. */
	.blade {
		position: absolute;
		left: 50%;
		top: 0;
		z-index: 2;
		font-size: clamp(6rem, 14vh, 11rem); /* sizes the Logo mark (height 1.3em) */
		line-height: 0;
		filter: drop-shadow(0 0 16px rgba(0, 0, 0, 0.55));
		transform: translate(-50%, calc(var(--cut) * 100vh - var(--blade-offset)))
			rotate(var(--angle));
	}

	/* Respect reduced motion: no intro, page is shown immediately. */
	@media (prefers-reduced-motion: reduce) {
		.intro {
			display: none;
		}
	}
</style>
