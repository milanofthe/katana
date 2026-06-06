<script lang="ts">
	import { ICONS, type IconName } from './paths';

	interface Props {
		name: IconName;
		/** Pixel size. If omitted, the icon scales to 1em (parent font-size). */
		size?: number;
		strokeWidth?: number;
		class?: string;
	}

	let { name, size, strokeWidth = 2, class: klass = '' }: Props = $props();

	let dim = $derived(size === undefined ? '1em' : `${size}px`);
</script>

<svg
	class={klass}
	width={dim}
	height={dim}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>{@html ICONS[name]}</svg>
