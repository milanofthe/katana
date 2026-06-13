<script lang="ts">
	import { editor, clipDuration, type Clip } from '$lib/editor/store.svelte';
	import { VIEWPORT, HISTORY } from '$lib/constants';
	import { fontFamily } from '$lib/text/fonts';

	interface Props {
		clip: Clip;
		/** Measured output-frame size (px). */
		fw: number;
		fh: number;
		selected: boolean;
		/** Visible at the playhead now. */
		active: boolean;
		onselect: (id: string) => void;
		/** Report snap state up so the frame can draw center guides. */
		ondragstate: (s: { snapX: boolean; snapY: boolean; active: boolean }) => void;
	}

	let { clip, fw, fh, selected, active, onselect, ondragstate }: Props = $props();

	const style = $derived(clip.text);

	// Font size + outline scale with the frame height (resolution-independent) and
	// the clip's transform scale, mirroring the compositing/export math.
	const fontPx = $derived(((style?.sizePct ?? 9) / 100) * fh * clip.transform.scale);
	const outlinePx = $derived(((style?.outline ?? 0) / 100) * fontPx);

	const justify = $derived(
		style?.align === 'left' ? 'flex-start' : style?.align === 'right' ? 'flex-end' : 'center'
	);

	// ── Drag to reposition (selects, then moves) ────────────────
	let dragging = $state(false);
	let startX = 0;
	let startY = 0;
	let baseTx = 0;
	let baseTy = 0;
	// Live drag rendered as a GPU translate (px); store is written once on release.
	let dragOffX = $state(0);
	let dragOffY = $state(0);
	let pendingX = 0;
	let pendingY = 0;

	function onPointerDown(e: PointerEvent) {
		onselect(clip.id);
		dragging = true;
		startX = e.clientX;
		startY = e.clientY;
		baseTx = clip.transform.x;
		baseTy = clip.transform.y;
		pendingX = baseTx;
		pendingY = baseTy;
		dragOffX = 0;
		dragOffY = 0;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging || fw === 0 || fh === 0) return;
		let x = baseTx + (e.clientX - startX) / fw;
		let y = baseTy + (e.clientY - startY) / fh;
		const snapX = Math.abs(x) < VIEWPORT.snapThreshold;
		const snapY = Math.abs(y) < VIEWPORT.snapThreshold;
		if (snapX) x = 0;
		if (snapY) y = 0;
		pendingX = x;
		pendingY = y;
		dragOffX = (x - baseTx) * fw;
		dragOffY = (y - baseTy) * fh;
		ondragstate({ snapX, snapY, active: true });
	}

	function onPointerUp(e: PointerEvent) {
		if (dragging && (pendingX !== baseTx || pendingY !== baseTy)) {
			editor.setTransform(clip.id, { x: pendingX, y: pendingY }); // one store write, one undo step
		}
		dragging = false;
		dragOffX = 0;
		dragOffY = 0;
		ondragstate({ snapX: false, snapY: false, active: false });
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	// Wheel scales the text, committed as one undo step after a short idle.
	let wheelTimer = 0;
	function onWheel(e: WheelEvent) {
		if (!selected) return;
		e.preventDefault();
		editor.beginTransaction();
		const next = clip.transform.scale - e.deltaY * VIEWPORT.scaleStep;
		editor.setTransform(clip.id, {
			scale: Math.max(VIEWPORT.minScale, Math.min(VIEWPORT.maxScale, next))
		});
		clearTimeout(wheelTimer);
		wheelTimer = window.setTimeout(() => editor.endTransaction(), HISTORY.wheelCommitMs);
	}

	// Visual fade: ramp opacity in/out, mirroring video layers + the audio fade.
	const fadeOpacity = $derived.by(() => {
		if (!clip.fadeInSec && !clip.fadeOutSec) return 1;
		const dur = clipDuration(clip);
		const t = editor.localTime(clip);
		let o = 1;
		if (clip.fadeInSec > 0 && t < clip.fadeInSec) o = t / clip.fadeInSec;
		if (clip.fadeOutSec > 0 && t > dur - clip.fadeOutSec)
			o = Math.min(o, (dur - t) / clip.fadeOutSec);
		return Math.max(0, Math.min(1, o));
	});

	const strokeStyle = $derived(
		outlinePx > 0
			? `-webkit-text-stroke:${outlinePx}px ${style?.outlineColor};paint-order:stroke fill;`
			: ''
	);
</script>

{#if style}
	<div class="text-layer" class:hidden={!active} style="justify-content:{justify}">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="text-box"
			class:selected
			class:dragging
			style="
				font-family:{fontFamily(style.fontId)};
				font-size:{fontPx}px;
				font-weight:{style.weight};
				color:{style.color};
				text-align:{style.align};
				opacity:{fadeOpacity};
				transform:translate3d({clip.transform.x * fw + dragOffX}px,{clip.transform.y * fh +
				dragOffY}px,0);
				{strokeStyle}"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onwheel={onWheel}
		>
			{style.content}
		</div>
	</div>
{/if}

<style>
	/* Full-frame flex container: vertical-centers the text; horizontal anchor
	   follows the chosen alignment (justify-content set inline). */
	.text-layer {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		pointer-events: none;
	}
	.text-layer.hidden {
		display: none;
	}

	.text-box {
		max-width: 100%;
		padding: 0 var(--katana-space-2);
		line-height: var(--katana-leading-tight);
		white-space: pre-wrap;
		overflow-wrap: break-word;
		cursor: grab;
		pointer-events: auto;
		user-select: none;
		/* Square selection ring, no layout shift (mirrors clip selection). */
		outline: 0 solid transparent;
		outline-offset: var(--katana-space-1);
	}
	.text-box.selected {
		outline: var(--katana-border-width-thick) solid var(--katana-accent);
	}
	.text-box.dragging {
		cursor: grabbing;
	}
</style>
