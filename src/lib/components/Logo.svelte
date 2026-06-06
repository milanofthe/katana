<script lang="ts">
	// Katana brand logo. `full` = the wordmark whose K's upper diagonal is the
	// katana blade (+ ATANA); `mark` = the standalone blade (as in the favicon).
	// Multi-color geometry mapped onto theme tokens. Scales with font-size.
	interface Props {
		variant?: 'mark' | 'full';
		class?: string;
	}

	let { variant = 'full', class: klass = '' }: Props = $props();
</script>

{#if variant === 'full'}
	<svg class="logo-full {klass}" viewBox="226 686 4230 1128" fill="none" aria-label="Katana">
		<!-- K: lower diagonal + vertical bar (accent) -->
		<path class="accent" fill-rule="evenodd" d="M1035.36 1797 743 1350 743 1138 1214 1797Z" />
		<rect class="accent" x="571" y="688" width="182" height="1110" />
		<!-- Katana forming the K's upper diagonal -->
		<path
			class="accent"
			fill-rule="evenodd"
			d="M984.874 1036.63C974.946 1026.81 974.856 1010.81 984.673 1000.88L1276.19 706.076C1286.01 696.148 1302.02 696.059 1311.95 705.876L1383.85 776.977C1393.78 786.795 1393.87 802.801 1384.05 812.729L1092.53 1107.53C1082.71 1117.46 1066.7 1117.55 1056.78 1107.73Z"
		/>
		<path
			class="steel"
			fill-rule="evenodd"
			d="M975.345 1013 228.409 1769.28 226 1783.73 235.637 1800.59 242.866 1803 397.072 1800.59 428.395 1795.77 464.537 1778.91 493.451 1752.42 534.412 1709.07 1091 1131.02 975.345 1013Z"
		/>
		<path
			class="accent"
			fill-rule="evenodd"
			d="M931.813 939.106C934.853 936.246 939.635 936.391 942.496 939.431L1145.33 1154.99C1148.19 1158.03 1148.05 1162.81 1145.01 1165.67L1122.99 1186.38C1119.95 1189.24 1115.17 1189.1 1112.31 1186.06L909.474 970.504C906.614 967.465 906.759 962.682 909.799 959.822Z"
		/>
		<path
			class="bright"
			fill-rule="evenodd"
			d="M341.12 1739.31C333.625 1731.9 333.557 1719.81 340.969 1712.32L921.422 1125.33C928.834 1117.83 940.919 1117.77 948.414 1125.18L948.414 1125.18C955.91 1132.59 955.978 1144.67 948.566 1152.17L368.112 1739.16C360.7 1746.65 348.616 1746.72 341.12 1739.31Z"
		/>
		<text class="wordmark" x="1282.85" y="1803" font-size="912" font-weight="700">ATANA</text>
	</svg>
{:else}
	<svg class="logo-mark {klass}" viewBox="974 1224 1165 1104" fill="none" aria-label="Katana">
		<path class="accent" fill-rule="evenodd" d="M1732.04 1562.43C1722.11 1552.61 1722.02 1536.61 1731.84 1526.68L2023.36 1231.88C2033.18 1221.95 2049.19 1221.86 2059.11 1231.68L2131.02 1302.78C2140.94 1312.6 2141.03 1328.6 2131.22 1338.53L1839.69 1633.33C1829.88 1643.26 1813.87 1643.35 1803.94 1633.53Z" />
		<path class="steel" fill-rule="evenodd" d="M1722.48 1538 976.406 2294.28 974 2308.73 983.626 2325.59 990.847 2328 1144.87 2325.59 1176.16 2320.77 1212.26 2303.91 1241.14 2277.42 1282.06 2234.07 1838 1656.02 1722.48 1538Z" />
		<path class="accent" fill-rule="evenodd" d="M1678.98 1464.91C1682.02 1462.05 1686.8 1462.19 1689.66 1465.23L1892.5 1680.79C1895.36 1683.83 1895.21 1688.61 1892.17 1691.47L1870.16 1712.19C1867.12 1715.05 1862.34 1714.9 1859.48 1711.86L1656.64 1496.31C1653.78 1493.27 1653.93 1488.48 1656.97 1485.62Z" />
		<path class="steel" fill-rule="evenodd" d="M1088.29 2265.11C1080.79 2257.7 1080.73 2245.61 1088.14 2238.12L1668.59 1651.13C1676 1643.64 1688.09 1643.57 1695.58 1650.98L1695.58 1650.98C1703.08 1658.39 1703.15 1670.48 1695.73 1677.97L1115.28 2264.96C1107.87 2272.45 1095.78 2272.52 1088.29 2265.11Z" />
	</svg>
{/if}

<style>
	.logo-full {
		height: 1.9em;
		width: auto;
		display: block;
	}
	.logo-mark {
		height: 1.3em;
		width: auto;
		display: block;
	}
	.accent {
		fill: var(--katana-accent);
	}
	.steel {
		fill: var(--katana-text-primary);
	}
	.bright {
		fill: #ffffff;
	}
	.wordmark {
		fill: var(--katana-accent);
		font-family: var(--katana-font-sans);
		letter-spacing: -0.01em;
	}
</style>
