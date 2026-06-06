<script lang="ts">
	import { TopBar, PreviewPane, TransportBar, Timeline } from '$lib/components/editor';
</script>

<div class="editor">
	<TopBar />
	<PreviewPane />
	<TransportBar />
	<Timeline />
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--snip-bg-base);
		overflow: hidden;
	}
</style>
