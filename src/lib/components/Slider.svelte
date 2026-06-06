<script lang="ts">
	interface Props {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		/** Accessible label for the control. */
		label: string;
		disabled?: boolean;
		oninput?: (value: number) => void;
		/** Fires once when the drag/keyboard adjustment settles (pointer/key up). */
		onchange?: () => void;
	}

	let {
		value = $bindable(),
		min = 0,
		max = 1,
		step = 0.01,
		label,
		disabled = false,
		oninput,
		onchange
	}: Props = $props();

	const percent = $derived(max > min ? ((value - min) / (max - min)) * 100 : 0);

	function onInput(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		value = v;
		oninput?.(v);
	}

	function onChange() {
		onchange?.();
	}
</script>

<input
	class="slider"
	type="range"
	{min}
	{max}
	{step}
	{value}
	{disabled}
	aria-label={label}
	style="--fill: {percent}%"
	oninput={onInput}
	onchange={onChange}
/>

<style>
	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: var(--katana-space-4);
		background: transparent;
		cursor: pointer;
	}
	.slider:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* Track: accent fill up to the thumb, muted track after. */
	.slider::-webkit-slider-runnable-track {
		height: var(--katana-space-1);
		border-radius: var(--katana-radius-full);
		background: linear-gradient(
			to right,
			var(--katana-accent) var(--fill),
			var(--katana-bg-overlay) var(--fill)
		);
	}
	.slider::-moz-range-track {
		height: var(--katana-space-1);
		border-radius: var(--katana-radius-full);
		background: var(--katana-bg-overlay);
	}
	.slider::-moz-range-progress {
		height: var(--katana-space-1);
		border-radius: var(--katana-radius-full);
		background: var(--katana-accent);
	}

	/* Thumb */
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: var(--katana-space-4);
		height: var(--katana-space-4);
		margin-top: calc((var(--katana-space-1) - var(--katana-space-4)) / 2);
		border-radius: var(--katana-radius-full);
		background: var(--katana-text-primary);
		border: var(--katana-border-width-thick) solid var(--katana-accent);
		transition: transform var(--katana-duration-fast) var(--katana-ease-out);
	}
	.slider::-moz-range-thumb {
		width: var(--katana-space-4);
		height: var(--katana-space-4);
		border-radius: var(--katana-radius-full);
		background: var(--katana-text-primary);
		border: var(--katana-border-width-thick) solid var(--katana-accent);
	}
	.slider:hover::-webkit-slider-thumb {
		transform: scale(1.12);
	}
	.slider:focus-visible::-webkit-slider-thumb {
		outline: var(--katana-border-width-thick) solid var(--katana-accent);
		outline-offset: var(--katana-space-px);
	}
</style>
