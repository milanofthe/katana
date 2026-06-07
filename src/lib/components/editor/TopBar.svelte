<script lang="ts">
	import { Icon, Button, IconButton, Tooltip, Logo } from '$lib';
	import { importMedia } from '$lib/editor/import';
	import { saveProject, openProject } from '$lib/editor/project';
	import { editor } from '$lib/editor/store.svelte';
</script>

<header class="top-bar">
	<div class="brand">
		<Logo variant="full" />
	</div>

	<div class="actions">
		<Tooltip text="Open project (Ctrl+O)" placement="bottom">
			<IconButton icon="folder" label="Open project" size="md" onclick={openProject} />
		</Tooltip>
		<Tooltip text="Save project (Ctrl+S)" placement="bottom">
			<IconButton
				icon="save"
				label="Save project"
				size="md"
				disabled={editor.clips.length === 0}
				onclick={saveProject}
			/>
		</Tooltip>
		<span class="sep" aria-hidden="true"></span>
		<Button variant="secondary" onclick={importMedia} disabled={editor.importing > 0}>
			<Icon name="import" />{editor.importing > 0 ? 'Importing…' : 'Import'}
		</Button>
		<Button
			variant="primary"
			disabled={editor.clips.length === 0 || editor.importing > 0 || editor.exporting}
			onclick={() => (editor.exportDialogOpen = true)}
		>
			<Icon name="export" />{editor.exporting ? 'Exporting…' : 'Export'}
		</Button>
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
	.sep {
		width: var(--katana-border-width);
		height: var(--katana-control-sm);
		background: var(--katana-border);
		margin-inline: var(--katana-space-1);
	}
</style>
