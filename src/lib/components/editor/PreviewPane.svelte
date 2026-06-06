<script lang="ts">
	import { Icon } from '$lib';

	interface Props {
		src?: string;
		video?: HTMLVideoElement;
	}

	let { src = undefined, video = $bindable() }: Props = $props();
</script>

<div class="preview-pane">
	<div class="stage">
		{#if src}
			<!-- svelte-ignore a11y_media_has_caption -- editing preview, not a captioned content player -->
			<video
				bind:this={video}
				{src}
				class="video"
				preload="metadata"
			></video>
		{:else}
			<div class="empty-state">
				<Icon name="film" size={48} />
				<p class="empty-text">No media. Import a video to begin.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.preview-pane {
		display: flex;
		flex: 1;
		min-height: 0;
		background: var(--snip-bg-base);
		padding: var(--snip-space-4);
	}

	.stage {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		background: var(--snip-bg-base);
		border-radius: var(--snip-radius-md);
		overflow: hidden;
	}

	.video {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		display: block;
		border-radius: var(--snip-radius-sm);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--snip-space-4);
		color: var(--snip-text-muted);
	}

	.empty-text {
		font-family: var(--snip-font-sans);
		font-size: var(--snip-text-sm);
		font-weight: var(--snip-weight-regular);
		color: var(--snip-text-muted);
		margin: 0;
	}
</style>
