<script lang="ts">
	import { editor, clipDuration, type Clip } from '$lib/editor/store.svelte';
	import { PLAYER } from '$lib/constants';

	interface Props {
		clip: Clip;
	}
	let { clip }: Props = $props();

	let audio = $state<HTMLAudioElement>();

	// Play/pause follows the master clock.
	$effect(() => {
		const a = audio;
		if (!a) return;
		if (editor.playing) a.play().catch(() => {});
		else a.pause();
	});

	$effect(() => {
		const a = audio;
		if (a) a.playbackRate = clip.speed;
	});

	// Mute + base volume (no per-tick work when no fade is configured).
	$effect(() => {
		const a = audio;
		if (!a) return;
		a.muted = clip.muted;
		if (clip.fadeInSec === 0 && clip.fadeOutSec === 0) a.volume = clip.volume;
	});

	// Fade ramp.
	$effect(() => {
		const a = audio;
		if (!a) return;
		if (clip.fadeInSec === 0 && clip.fadeOutSec === 0) return;
		const dur = clipDuration(clip);
		const t = editor.localTime(clip);
		let fade = 1;
		if (clip.fadeInSec > 0 && t < clip.fadeInSec) fade = t / clip.fadeInSec;
		if (clip.fadeOutSec > 0 && t > dur - clip.fadeOutSec)
			fade = Math.min(fade, (dur - t) / clip.fadeOutSec);
		a.volume = Math.max(0, Math.min(1, clip.volume * fade));
	});

	// Keep the source time synced to the master playhead (throttled).
	let seekRaf = 0;
	$effect(() => {
		const a = audio;
		if (!a) return;
		const target = clip.inPoint + editor.localTime(clip) * clip.speed;
		const threshold = editor.playing ? PLAYER.seekThresholdSec : 0.001;
		if (Math.abs(a.currentTime - target) <= threshold) return;
		cancelAnimationFrame(seekRaf);
		seekRaf = requestAnimationFrame(() => {
			a.currentTime = target;
		});
	});

	function onLoadedMeta() {
		if (audio) audio.currentTime = clip.inPoint + editor.localTime(clip) * clip.speed;
	}
</script>

<audio bind:this={audio} src={clip.src} preload="metadata" onloadedmetadata={onLoadedMeta}></audio>
