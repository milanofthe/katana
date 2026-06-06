<script lang="ts">
	import { TopBar, PreviewPane, TransportBar, Timeline } from '$lib/components/editor';

	// Placeholder editor state — wired to a real EDL + engine in later work.
	let playing = $state(false);
	let snapping = $state(true);
	let selectedClipId = $state('c2');

	function togglePlay() {
		playing = !playing;
	}
	function toggleSnap() {
		snapping = !snapping;
	}
	function selectClip(id: string) {
		selectedClipId = id;
	}
</script>

<div class="editor">
	<TopBar />
	<PreviewPane />
	<TransportBar
		{playing}
		{snapping}
		currentTime="00:00:00"
		duration="00:55:00"
		onPlayToggle={togglePlay}
		onSnapToggle={toggleSnap}
	/>
	<Timeline selectedId={selectedClipId} onSelect={selectClip} />
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--snip-bg-base);
		overflow: hidden;
	}
</style>
