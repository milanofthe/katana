<script lang="ts">
	import { Icon, Button, Logo } from '$lib';

	interface Props {
		onImport?: () => void;
		onExport?: () => void;
	}

	let { onImport, onExport }: Props = $props();
</script>

<header class="top-bar">
	<div class="brand">
		<Logo variant="full" />
	</div>

	<div class="actions">
		<Button variant="secondary" onclick={onImport}>
			<Icon name="import" />Import
		</Button>
		<Button variant="primary" onclick={onExport}>
			<Icon name="export" />Export
		</Button>
	</div>
</header>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: calc(var(--snip-control-lg) + var(--snip-space-3) * 2);
		padding: var(--snip-space-3) var(--snip-space-6);
		background: var(--snip-bg-surface);
		border-bottom: var(--snip-border-width) solid var(--snip-border);
		flex-shrink: 0;
	}

	.brand {
		display: flex;
		align-items: center;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--snip-space-2);
	}
</style>
