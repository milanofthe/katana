<script lang="ts">
	import { Icon } from '$lib';
	import { editor } from '$lib/editor/store.svelte';
	import { PLAYER } from '$lib/constants';

	let video = $state<HTMLVideoElement>();
	const clip = $derived(editor.selectedClip);

	// Play/pause follows the store.
	$effect(() => {
		const v = video;
		if (!v) return;
		if (editor.playing) {
			v.play().catch(() => {});
		} else {
			v.pause();
		}
	});

	// Keep the video time in sync with the playhead (skip buttons / scrubbing),
	// throttled to one seek per frame so fast scrubbing stays smooth. The
	// threshold stops timeupdate from fighting external seeks.
	let seekRaf = 0;
	$effect(() => {
		const v = video;
		const c = clip;
		if (!v || !c) return;
		const target = c.inPoint + editor.playhead;
		if (Math.abs(v.currentTime - target) <= PLAYER.seekThresholdSec) return;
		cancelAnimationFrame(seekRaf);
		seekRaf = requestAnimationFrame(() => {
			v.currentTime = target;
		});
	});

	function onLoadedMeta() {
		if (video && clip) video.currentTime = clip.inPoint + editor.playhead;
	}

	function onTimeUpdate() {
		if (!video || !clip) return;
		editor.playhead = video.currentTime - clip.inPoint;
		// Stop at the trim out-point.
		if (video.currentTime >= clip.outPoint) {
			video.pause();
			editor.playing = false;
		}
	}

	function onEnded() {
		editor.playing = false;
	}
</script>

<div class="preview-pane">
	<div class="stage">
		{#if clip}
			<!-- svelte-ignore a11y_media_has_caption -- editing preview, not a captioned content player -->
			<video
				bind:this={video}
				src={clip.src}
				class="video"
				preload="metadata"
				onloadedmetadata={onLoadedMeta}
				ontimeupdate={onTimeUpdate}
				onended={onEnded}
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
