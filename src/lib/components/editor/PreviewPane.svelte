<script lang="ts">
	import { Icon } from '$lib';
	import { editor, clipDuration } from '$lib/editor/store.svelte';
	import { PLAYER } from '$lib/constants';

	let video = $state<HTMLVideoElement>();
	const clip = $derived(editor.selectedClip);

	const formatRatio = $derived(
		editor.aspectRatio === '16:9'
			? 16 / 9
			: editor.aspectRatio === '9:16'
				? 9 / 16
				: editor.aspectRatio === '1:1'
					? 1
					: null
	);

	// Play/pause follows the store.
	$effect(() => {
		const v = video;
		if (!v) return;
		if (editor.playing) v.play().catch(() => {});
		else v.pause();
	});

	// Playback rate follows clip speed.
	$effect(() => {
		const v = video;
		const c = clip;
		if (v && c) v.playbackRate = c.speed;
	});

	// Audio: volume (with fade in/out) and mute.
	$effect(() => {
		const v = video;
		const c = clip;
		if (!v || !c) return;
		v.muted = c.muted;
		const dur = clipDuration(c);
		const t = editor.playhead;
		let fade = 1;
		if (c.fadeInSec > 0 && t < c.fadeInSec) fade = t / c.fadeInSec;
		if (c.fadeOutSec > 0 && t > dur - c.fadeOutSec) fade = Math.min(fade, (dur - t) / c.fadeOutSec);
		v.volume = Math.max(0, Math.min(1, c.volume * fade));
	});

	// Keep video time synced to the playhead (skip/scrub), throttled to one seek
	// per frame. Playhead is timeline time; the source time scales by speed.
	let seekRaf = 0;
	$effect(() => {
		const v = video;
		const c = clip;
		if (!v || !c) return;
		const target = c.inPoint + editor.playhead * c.speed;
		if (Math.abs(v.currentTime - target) <= PLAYER.seekThresholdSec) return;
		cancelAnimationFrame(seekRaf);
		seekRaf = requestAnimationFrame(() => {
			v.currentTime = target;
		});
	});

	function onLoadedMeta() {
		if (video && clip) video.currentTime = clip.inPoint + editor.playhead * clip.speed;
	}

	function onTimeUpdate() {
		if (!video || !clip) return;
		editor.playhead = (video.currentTime - clip.inPoint) / clip.speed;
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
			<div class="frame" class:formatted={formatRatio !== null} style={formatRatio !== null ? `aspect-ratio: ${formatRatio}` : ''}>
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
			</div>
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
		background: var(--katana-bg-base);
		padding: var(--katana-space-4);
	}

	.stage {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: center;
		justify-content: center;
	}

	.frame {
		display: flex;
		max-width: 100%;
		max-height: 100%;
	}
	/* A chosen output format gets a letterboxed frame at that aspect ratio. */
	.frame.formatted {
		background: #000000;
		border-radius: var(--katana-radius-md);
		overflow: hidden;
	}

	.video {
		display: block;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		border-radius: var(--katana-radius-sm);
	}
	.frame.formatted .video {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--katana-space-4);
		color: var(--katana-text-muted);
	}

	.empty-text {
		font-family: var(--katana-font-sans);
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-regular);
		color: var(--katana-text-muted);
		margin: 0;
	}
</style>
