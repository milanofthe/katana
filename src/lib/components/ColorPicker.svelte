<script lang="ts" module>
	// ── Colour math (pure) ───────────────────────────────────────
	export function hexToRgb(hex: string): { r: number; g: number; b: number } {
		const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
		if (!m) return { r: 255, g: 255, b: 255 };
		const n = parseInt(m[1], 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
	}

	export function rgbToHex(r: number, g: number, b: number): string {
		const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
		return `#${h(r)}${h(g)}${h(b)}`;
	}

	function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const d = max - min;
		let h = 0;
		if (d !== 0) {
			if (max === r) h = ((g - b) / d) % 6;
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h *= 60;
			if (h < 0) h += 360;
		}
		return { h, s: max === 0 ? 0 : d / max, v: max };
	}

	function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
		const c = v * s;
		const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = v - c;
		let r = 0;
		let g = 0;
		let b = 0;
		if (h < 60) [r, g, b] = [c, x, 0];
		else if (h < 120) [r, g, b] = [x, c, 0];
		else if (h < 180) [r, g, b] = [0, c, x];
		else if (h < 240) [r, g, b] = [0, x, c];
		else if (h < 300) [r, g, b] = [x, 0, c];
		else [r, g, b] = [c, 0, x];
		return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
	}
</script>

<script lang="ts">
	interface Props {
		/** Current colour as a hex string (#RRGGBB). Two-way bindable. */
		value: string;
		/** Accessible label for the trigger. */
		label: string;
		/** Optional preset swatches (hex). */
		swatches?: string[];
		/** Fires on every change while interacting. */
		oninput?: (hex: string) => void;
		/** Fires once when an adjustment settles (pointer up / commit). */
		onchange?: () => void;
	}

	const DEFAULT_SWATCHES = [
		'#ffffff',
		'#000000',
		'#ff5c4d',
		'#ffd23f',
		'#3dd68c',
		'#4d9bff',
		'#b15cff',
		'#ff5ca8'
	];

	let {
		value = $bindable(),
		label,
		swatches = DEFAULT_SWATCHES,
		oninput,
		onchange
	}: Props = $props();

	let open = $state(false);

	// Internal HSV is the source of truth while interacting; hue is kept across
	// greyscale values (where it would otherwise be undefined) so dragging the
	// value/saturation to a colour again restores the chosen hue.
	let h = $state(0);
	let s = $state(0);
	let v = $state(1);
	let hexDraft = $state(value);

	// Sync external value -> internal HSV when it differs from what we'd produce
	// (e.g. undo, or another control), without clobbering an in-flight drag.
	$effect(() => {
		const incoming = value;
		const current = rgbToHex(...rgbTuple(h, s, v));
		if (incoming.toLowerCase() !== current.toLowerCase()) {
			const { r, g, b } = hexToRgb(incoming);
			const hsv = rgbToHsv(r, g, b);
			if (hsv.s > 0) h = hsv.h;
			s = hsv.s;
			v = hsv.v;
			hexDraft = incoming;
		}
	});

	function rgbTuple(hh: number, ss: number, vv: number): [number, number, number] {
		const { r, g, b } = hsvToRgb(hh, ss, vv);
		return [r, g, b];
	}

	const hex = $derived(rgbToHex(...rgbTuple(h, s, v)));
	// Pure-hue colour for the saturation/value field background.
	const hueHex = $derived(rgbToHex(...rgbTuple(h, 1, 1)));

	function commitValue() {
		value = hex;
		hexDraft = hex;
		oninput?.(hex);
	}

	// ── SV field drag ────────────────────────────────────────────
	function svFromPointer(el: HTMLElement, clientX: number, clientY: number) {
		const r = el.getBoundingClientRect();
		s = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
		v = Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height));
		commitValue();
	}

	function startSv(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		e.preventDefault();
		svFromPointer(el, e.clientX, e.clientY);
		const move = (ev: PointerEvent) => svFromPointer(el, ev.clientX, ev.clientY);
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			onchange?.();
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	// ── Hue slider drag ──────────────────────────────────────────
	function hueFromPointer(el: HTMLElement, clientX: number) {
		const r = el.getBoundingClientRect();
		h = Math.max(0, Math.min(360, ((clientX - r.left) / r.width) * 360));
		commitValue();
	}

	function startHue(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		e.preventDefault();
		hueFromPointer(el, e.clientX);
		const move = (ev: PointerEvent) => hueFromPointer(el, ev.clientX);
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			onchange?.();
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	// ── Hex input ────────────────────────────────────────────────
	function onHexInput(e: Event) {
		hexDraft = (e.currentTarget as HTMLInputElement).value;
		if (/^#?[0-9a-f]{6}$/i.test(hexDraft.trim())) {
			const { r, g, b } = hexToRgb(hexDraft);
			const hsv = rgbToHsv(r, g, b);
			if (hsv.s > 0) h = hsv.h;
			s = hsv.s;
			v = hsv.v;
			value = hex;
			oninput?.(hex);
		}
	}

	function onHexCommit() {
		hexDraft = hex;
		onchange?.();
	}

	function pickSwatch(sw: string) {
		const { r, g, b } = hexToRgb(sw);
		const hsv = rgbToHsv(r, g, b);
		if (hsv.s > 0) h = hsv.h;
		s = hsv.s;
		v = hsv.v;
		commitValue();
		onchange?.();
	}
</script>

<div class="color-picker">
	<button
		type="button"
		class="trigger"
		aria-label={label}
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class="chip" style="background: {hex}"></span>
		<span class="hex-label">{hex}</span>
	</button>

	{#if open}
		<div class="panel">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="sv"
				style="background-color: {hueHex}"
				onpointerdown={startSv}
				aria-label="Saturation and brightness, {Math.round(s * 100)}% / {Math.round(v * 100)}%"
			>
				<div class="sv-knob" style="left: {s * 100}%; top: {(1 - v) * 100}%"></div>
			</div>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="hue"
				onpointerdown={startHue}
				role="slider"
				aria-label="Hue"
				aria-valuemin="0"
				aria-valuemax="360"
				aria-valuenow={Math.round(h)}
				tabindex="0"
			>
				<div class="hue-knob" style="left: {(h / 360) * 100}%"></div>
			</div>

			<div class="row">
				<input
					class="hex-input"
					type="text"
					spellcheck="false"
					autocomplete="off"
					value={hexDraft}
					aria-label="Hex colour"
					oninput={onHexInput}
					onchange={onHexCommit}
					onblur={onHexCommit}
				/>
			</div>

			<div class="swatches">
				{#each swatches as sw (sw)}
					<button
						type="button"
						class="swatch"
						class:active={sw.toLowerCase() === hex.toLowerCase()}
						style="background: {sw}"
						aria-label="Use {sw}"
						onclick={() => pickSwatch(sw)}
					></button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.color-picker {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
	}

	.trigger {
		display: flex;
		align-items: center;
		gap: var(--katana-space-2);
		height: var(--katana-control-sm);
		padding: 0 var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: var(--katana-bg-overlay);
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-secondary);
		font-family: var(--katana-font-mono);
		font-size: var(--katana-text-xs);
		cursor: pointer;
		transition: border-color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.trigger:hover {
		border-color: var(--katana-border-strong);
		color: var(--katana-text-primary);
	}

	.chip {
		width: var(--katana-space-4);
		height: var(--katana-space-4);
		border-radius: var(--katana-radius-sm);
		border: var(--katana-border-width) solid var(--katana-border-strong);
		flex: none;
	}
	.hex-label {
		text-transform: uppercase;
		letter-spacing: var(--katana-tracking-wide);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
		padding: var(--katana-space-2);
		border-radius: var(--katana-radius-md);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border);
	}

	/* Saturation (x) × brightness (y) field over the current hue. */
	.sv {
		position: relative;
		width: 100%;
		height: 96px;
		border-radius: var(--katana-radius-sm);
		cursor: crosshair;
		touch-action: none;
		background-image:
			linear-gradient(to top, #000000, transparent),
			linear-gradient(to right, #ffffff, transparent);
		/* background-color set inline = the active hue; gradients layer over it. */
	}
	.sv-knob {
		position: absolute;
		width: var(--katana-space-3);
		height: var(--katana-space-3);
		border-radius: var(--katana-radius-full);
		border: var(--katana-border-width-thick) solid #ffffff;
		box-shadow: var(--katana-shadow-sm);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.hue {
		position: relative;
		width: 100%;
		height: var(--katana-space-3);
		border-radius: var(--katana-radius-full);
		cursor: pointer;
		touch-action: none;
		background: linear-gradient(
			to right,
			#ff0000 0%,
			#ffff00 17%,
			#00ff00 33%,
			#00ffff 50%,
			#0000ff 67%,
			#ff00ff 83%,
			#ff0000 100%
		);
	}
	.hue-knob {
		position: absolute;
		top: 50%;
		width: var(--katana-space-2);
		height: calc(var(--katana-space-3) + var(--katana-space-1));
		border-radius: var(--katana-radius-sm);
		background: var(--katana-text-primary);
		border: var(--katana-border-width) solid var(--katana-bg-base);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.row {
		display: flex;
		gap: var(--katana-space-2);
	}
	.hex-input {
		flex: 1;
		min-width: 0;
		height: var(--katana-control-sm);
		padding: 0 var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: var(--katana-bg-overlay);
		border: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-primary);
		font-family: var(--katana-font-mono);
		font-size: var(--katana-text-xs);
		text-transform: uppercase;
	}
	.hex-input:focus-visible {
		outline: none;
		border-color: var(--katana-accent);
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: var(--katana-space-1);
	}
	.swatch {
		aspect-ratio: 1;
		border-radius: var(--katana-radius-sm);
		border: var(--katana-border-width) solid var(--katana-border-strong);
		cursor: pointer;
		padding: 0;
	}
	.swatch.active {
		outline: var(--katana-border-width-thick) solid var(--katana-accent);
		outline-offset: var(--katana-space-px);
	}
</style>
