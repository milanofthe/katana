<script lang="ts">
	import { Icon, Button, Logo, Tooltip } from '$lib';
	import { importMedia } from '$lib/editor/import';
</script>

<header class="top-bar">
	<div class="brand">
		<Logo variant="full" />
	</div>

	<div class="actions">
		<Button variant="secondary" onclick={importMedia}>
			<Icon name="import" />Import
		</Button>
		<Tooltip text="Export — coming soon" placement="bottom">
			<Button variant="primary" disabled>
				<Icon name="export" />Export
			</Button>
		</Tooltip>
	</div>
</header>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: calc(var(--katana-control-lg) + var(--katana-space-3) * 2);
		padding: var(--katana-space-3) var(--katana-space-6);
		background: var(--katana-bg-surface);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
		flex-shrink: 0;
	}

	.brand {
		display: flex;
		align-items: center;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--katana-space-2);
	}
</style>
