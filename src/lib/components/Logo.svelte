<script lang="ts">
	// Snip brand mark — a stylized katana. This is the one place the brand SVG
	// lives (multi-color, so it doesn't belong in the monochrome icon set).
	// Geometry is the supplied artwork; fills are mapped onto theme tokens so
	// the mark tracks the palette. Size scales with font-size (1em-based).
	interface Props {
		variant?: 'mark' | 'full';
		class?: string;
	}

	let { variant = 'full', class: klass = '' }: Props = $props();
</script>

<span class="logo {klass}">
	<svg class="mark" viewBox="974 1224 1165 1104" fill="none" aria-hidden="true">
		<path
			class="blade"
			fill-rule="evenodd"
			d="M1732.04 1562.43C1722.11 1552.61 1722.02 1536.61 1731.84 1526.68L2023.36 1231.88C2033.18 1221.95 2049.19 1221.86 2059.11 1231.68L2131.02 1302.78C2140.94 1312.6 2141.03 1328.6 2131.22 1338.53L1839.69 1633.33C1829.88 1643.26 1813.87 1643.35 1803.94 1633.53Z"
		/>
		<path
			class="steel"
			fill-rule="evenodd"
			d="M1722.48 1538 976.406 2294.28 974 2308.73 983.626 2325.59 990.847 2328 1144.87 2325.59 1176.16 2320.77 1212.26 2303.91 1241.14 2277.42 1282.06 2234.07 1838 1656.02 1722.48 1538Z"
		/>
		<path
			class="blade"
			fill-rule="evenodd"
			d="M1678.98 1464.91C1682.02 1462.05 1686.8 1462.19 1689.66 1465.23L1892.5 1680.79C1895.36 1683.83 1895.21 1688.61 1892.17 1691.47L1870.16 1712.19C1867.12 1715.05 1862.34 1714.9 1859.48 1711.86L1656.64 1496.31C1653.78 1493.27 1653.93 1488.48 1656.97 1485.62Z"
		/>
		<path
			class="steel"
			fill-rule="evenodd"
			d="M1088.29 2265.11C1080.79 2257.7 1080.73 2245.61 1088.14 2238.12L1668.59 1651.13C1676 1643.64 1688.09 1643.57 1695.58 1650.98L1695.58 1650.98C1703.08 1658.39 1703.15 1670.48 1695.73 1677.97L1115.28 2264.96C1107.87 2272.45 1095.78 2272.52 1088.29 2265.11Z"
		/>
	</svg>
	{#if variant === 'full'}
		<span class="wordmark">Snip</span>
	{/if}
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: var(--snip-space-3);
		font-size: var(--snip-text-xl);
		line-height: var(--snip-leading-none);
	}
	.mark {
		height: 1.25em;
		width: auto;
		flex: none;
	}
	.blade {
		fill: var(--snip-accent);
	}
	.steel {
		fill: var(--snip-text-primary);
	}
	.wordmark {
		font-family: var(--snip-font-sans);
		font-weight: var(--snip-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--snip-tracking-wide);
		color: var(--snip-text-primary);
	}
</style>
