<script lang="ts">
	import { Icon, IconButton } from '$lib';
	import {
		editor,
		clipDuration,
		clipEnd,
		clipSourceTime,
		type Clip,
		type ClipKind
	} from '$lib/editor/store.svelte';
	import { scrubAudio } from '$lib/editor/waveform';
	import { formatTimecode } from '$lib/editor/time';
	import { TIMELINE, REORDER, THUMB, WAVEFORM } from '$lib/constants';
	import { color } from '$lib/design/theme';

	// Frames for a clip's filmstrip: one per AR-correct slot across its width,
	// each showing the captured frame nearest that timeline position. Reacts to
	// trim (inPoint/duration) and zoom (width).
	function filmstripFrames(clip: Clip, widthPx: number): string[] {
		const frames = clip.thumbnails;
		if (!frames || frames.length === 0) return [];
		const ar = clip.aspectRatio || 16 / 9;
		const frameW = THUMB.stripHeightPx * ar;
		const slots = Math.max(1, Math.ceil(widthPx / frameW) + 1);
		const span = clip.outPoint - clip.inPoint; // source-time span (speed-independent)
		const out: string[] = [];
		for (let i = 0; i < slots; i++) {
			const t = clip.inPoint + ((i + 0.5) / slots) * span;
			const frac = clip.sourceDuration > 0 ? t / clip.sourceDuration : 0;
			const idx = Math.round(frac * (frames.length - 1));
			out.push(frames[Math.max(0, Math.min(frames.length - 1, idx))]);
		}
		return out;
	}

	interface WaveParams {
		peaks?: number[];
		inPoint: number;
		outPoint: number;
		sourceDuration: number;
		width: number;
	}

	// Draw the clip's waveform slice onto a canvas (one bar per output pixel).
	// Cheaper and crisper than thousands of DOM nodes; redraws on param change.
	function waveCanvas(node: HTMLCanvasElement, params: WaveParams) {
		function draw(p: WaveParams) {
			const h = node.clientHeight;
			const w = p.width;
			if (h === 0 || w === 0) {
				requestAnimationFrame(() => draw(p));
				return;
			}
			const dpr = window.devicePixelRatio || 1;
			node.width = Math.max(1, Math.floor(w * dpr));
			node.height = Math.max(1, Math.floor(h * dpr));
			const cx = node.getContext('2d');
			if (!cx) return;
			cx.clearRect(0, 0, node.width, node.height);
			if (!p.peaks || p.peaks.length === 0 || p.sourceDuration <= 0) return;
			cx.scale(dpr, dpr);
			const n = p.peaks.length;
			const i0 = Math.floor((p.inPoint / p.sourceDuration) * n);
			const i1 = Math.ceil((p.outPoint / p.sourceDuration) * n);
			const span = Math.max(1, i1 - i0);
			const mid = h / 2;
			cx.fillStyle = color.accent;
			cx.globalAlpha = WAVEFORM.alpha;
			const cols = Math.max(1, Math.floor(w));
			for (let xc = 0; xc < cols; xc++) {
				const idx = i0 + Math.floor((xc / cols) * span);
				const peak = p.peaks[Math.max(0, Math.min(n - 1, idx))] || 0;
				const barH = Math.max(1, peak * h);
				cx.fillRect(xc, mid - barH / 2, 1, barH);
			}
		}
		draw(params);
		return {
			update(p: WaveParams) {
				draw(p);
			}
		};
	}

	// Audio scrubbing: play a short grain from the topmost clip under the playhead.
	function scrubFeedback() {
		const active = editor.activeClips;
		const top = active[active.length - 1];
		if (!top) return;
		const sourceTime = clipSourceTime(top, editor.playhead - top.start);
		scrubAudio(top.path, sourceTime, performance.now());
	}

	let contentEl: HTMLDivElement | undefined = $state();
	let lanesEl: HTMLDivElement | undefined = $state();

	// Free-drag state (position in time + track). The live drag is rendered with
	// a GPU transform (no per-frame store writes / layout); the store is updated
	// once on release, which also yields a single undo entry.
	let dragId = $state<string | null>(null);
	let dragActive = $state(false);
	/** Which section the active drag belongs to (video or audio). */
	let dragKind = $state<ClipKind>('video');
	/** Snapped horizontal offset (px) of the dragged clip during the gesture. */
	let dragDx = $state(0);
	/** Target track lane of the dragged clip during the gesture. */
	let dragTrack = $state(0);
	/** Lane count frozen for the duration of a clip drag (occupied + 1 spare). */
	let dragLaneCount = $state(0);
	let justDragged = false; // suppress the click that follows a drag

	const contentWidth = $derived(editor.totalDuration * editor.pxPerSec + TIMELINE.gutterPx * 2);

	// Lane indices per section, top-to-bottom. A spare drop lane is exposed only
	// while a clip of that kind is being dragged. The video section always shows
	// at least one lane; the audio section appears only once audio exists.
	function buildLanes(kind: ClipKind): number[] {
		const occupied = kind === 'video' ? editor.videoTrackCount : editor.audioTrackCount;
		const dragging = dragActive && dragKind === kind;
		let total = dragging ? dragLaneCount : occupied;
		if (kind === 'video') total = Math.max(1, total);
		return Array.from({ length: Math.max(0, total) }, (_, i) => total - 1 - i);
	}
	const videoLanes = $derived(buildLanes('video'));
	const audioLanes = $derived(buildLanes('audio'));

	type LaneRow = { kind: ClipKind; track: number } | { divider: true };
	// Video lanes, then (if any audio) a divider and the audio lanes.
	const lanes = $derived.by<LaneRow[]>(() => {
		const out: LaneRow[] = videoLanes.map((track) => ({ kind: 'video' as const, track }));
		if (audioLanes.length) {
			out.push({ divider: true });
			for (const track of audioLanes) out.push({ kind: 'audio' as const, track });
		}
		return out;
	});

	// Each clip placed by absolute start (x) and track (lane).
	const placed = $derived.by(() =>
		editor.clips.map((c) => {
			const dur = clipDuration(c);
			return {
				clip: c,
				dur,
				left: c.start * editor.pxPerSec + TIMELINE.gutterPx,
				width: Math.max(TIMELINE.minClipWidthPx, dur * editor.pxPerSec - TIMELINE.gutterPx)
			};
		})
	);

	function clipsForLane(kind: ClipKind, track: number) {
		return placed.filter((p) => {
			if (p.clip.kind !== kind) return false;
			// While dragging, the clip renders in its live target lane.
			if (dragActive && p.clip.id === dragId) return track === dragTrack;
			return p.clip.track === track;
		});
	}

	const playheadX = $derived(editor.playhead * editor.pxPerSec + TIMELINE.gutterPx);

	function niceInterval(targetSeconds: number): number {
		if (targetSeconds <= 0) return 1;
		const magnitude = Math.pow(10, Math.floor(Math.log10(targetSeconds)));
		const norm = targetSeconds / magnitude;
		let nice: number;
		if (norm < 1.5) nice = 1;
		else if (norm < 3.5) nice = 2;
		else if (norm < 7.5) nice = 5;
		else nice = 10;
		return nice * magnitude;
	}

	const ticks = $derived.by(() => {
		const total = editor.totalDuration;
		if (total <= 0) return [];
		const interval = niceInterval(TIMELINE.rulerTickTargetPx / editor.pxPerSec);
		const out: Array<{ label: string; x: number }> = [];
		for (let t = 0; t <= total + 0.001; t += interval) {
			out.push({ label: formatTimecode(t), x: t * editor.pxPerSec + TIMELINE.gutterPx });
		}
		return out;
	});

	function pointerToContentX(clientX: number): number {
		if (!contentEl) return 0;
		return clientX - contentEl.getBoundingClientRect().left;
	}

	function pointerToSeconds(clientX: number): number {
		return (pointerToContentX(clientX) - TIMELINE.gutterPx) / editor.pxPerSec;
	}

	// Snap a timeline position to 0, the playhead, or any other clip edge.
	function snapSeconds(sec: number, excludeId: string | null): number {
		if (!editor.snapping) return Math.max(0, sec);
		const threshold = TIMELINE.snapThresholdPx / editor.pxPerSec;
		const candidates = [0, editor.playhead];
		for (const c of editor.clips) {
			if (c.id === excludeId) continue;
			candidates.push(c.start, clipEnd(c));
		}
		let best = sec;
		let bestDist = threshold;
		for (const cand of candidates) {
			const d = Math.abs(sec - cand);
			if (d <= bestDist) {
				bestDist = d;
				best = cand;
			}
		}
		return Math.max(0, best);
	}

	// Scrub the playhead by clicking/dragging the ruler. Pauses first so the
	// master clock doesn't fight the drag.
	function startScrub(e: PointerEvent) {
		e.preventDefault();
		editor.pause();
		editor.scrubbing = true;
		editor.seek(snapSeconds(pointerToSeconds(e.clientX), null));
		scrubFeedback();
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const x = ev.clientX;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				editor.seek(snapSeconds(pointerToSeconds(x), null));
				scrubFeedback();
			});
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			editor.scrubbing = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Drag a clip body to move it in time (horizontal) and across tracks
	// (vertical). A small threshold separates a click (select) from a drag.
	function startClipDrag(e: PointerEvent, id: string) {
		const startX = e.clientX;
		const startY = e.clientY;
		const clip = editor.clips.find((c) => c.id === id);
		if (!clip) return;
		const origStart = clip.start;
		const origLeftPx = origStart * editor.pxPerSec;
		const startTrack = clip.track;
		const kind = clip.kind;
		const trackCount0 = kind === 'video' ? editor.videoTrackCount : editor.audioTrackCount;
		// One lane's height (constant); used for stable vertical lane mapping.
		const laneH = lanesEl?.querySelector('.lane')?.clientHeight || 64;
		dragId = id;
		dragActive = false;
		dragKind = kind;
		dragDx = 0;
		dragTrack = startTrack;
		let committedStart = origStart;
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;
			if (!dragActive && Math.hypot(dx, dy) > REORDER.dragThresholdPx) {
				dragActive = true;
				dragLaneCount = trackCount0 + 1; // expose exactly one spare drop lane
			}
			if (!dragActive) return;
			const cx = ev.clientX;
			const cy = ev.clientY;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const newStart = snapSeconds((origLeftPx + (cx - startX)) / editor.pxPerSec, id);
				committedStart = newStart;
				// Live offset rendered via GPU transform; store stays untouched.
				dragDx = newStart * editor.pxPerSec - origLeftPx;
				// Move up by whole lanes; promote by at most one new track per drag.
				const laneDelta = Math.round((startY - cy) / laneH);
				dragTrack = Math.max(0, Math.min(trackCount0, startTrack + laneDelta));
			});
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (dragActive) {
				editor.moveClipTo(id, committedStart, dragTrack); // one store write, one undo step
				justDragged = true;
			}
			dragId = null;
			dragActive = false;
			dragDx = 0;
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	function onClipClick(id: string) {
		if (justDragged) {
			justDragged = false;
			return;
		}
		editor.select(id);
	}

	// Trim a clip edge by dragging its handle.
	function startTrim(
		e: PointerEvent,
		clipId: string,
		edge: 'start' | 'end',
		startIn: number,
		startOut: number,
		speed: number
	) {
		e.preventDefault();
		e.stopPropagation();
		const startX = e.clientX;
		editor.beginTransaction();
		// Throttle to one update per frame: each setIn/OutPoint rebuilds filmstrips.
		let raf = 0;
		const onMove = (ev: PointerEvent) => {
			const x = ev.clientX;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				// Pixel delta -> timeline seconds -> source seconds (scaled by speed).
				const delta = ((x - startX) / editor.pxPerSec) * speed;
				if (edge === 'start') editor.setInPoint(clipId, startIn + delta);
				else editor.setOutPoint(clipId, startOut + delta);
			});
		};
		const onUp = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			editor.endTransaction();
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Plain wheel scrolls horizontally; Ctrl/Cmd+wheel zooms. Non-passive so
	// preventDefault works.
	function wheelZoomScroll(node: HTMLElement) {
		function onWheel(e: WheelEvent) {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				editor.zoomBy(e.deltaY < 0 ? TIMELINE.zoomStep : 1 / TIMELINE.zoomStep);
			} else {
				e.preventDefault();
				node.scrollLeft += e.deltaY + e.deltaX;
			}
		}
		node.addEventListener('wheel', onWheel, { passive: false });
		return {
			destroy() {
				node.removeEventListener('wheel', onWheel);
			}
		};
	}
</script>

<div class="timeline">
	<div class="tl-scroll" use:wheelZoomScroll>
		<div class="tl-content" bind:this={contentEl} style="width: {contentWidth}px">
			<!-- Ruler doubles as the scrub bar -->
			<!-- svelte-ignore a11y_no_static_element_interactions -- pointer scrubbing; keyboard via arrow-key shortcuts -->
			<div class="ruler" onpointerdown={startScrub}>
				{#each ticks as tick (tick.x)}
					<div class="tick" style="left: {tick.x}px">
						<div class="tick-mark"></div>
						<span class="tick-label katana-mono">{tick.label}</span>
					</div>
				{/each}
			</div>

			<!-- Stacked track lanes: video section, divider, audio section -->
			<div class="lanes" bind:this={lanesEl}>
				{#each lanes as lane (('divider' in lane ? 'div' : lane.kind + lane.track))}
					{#if 'divider' in lane}
						<div class="section-divider"></div>
					{:else}
						<div
							class="lane"
							class:audio-lane={lane.kind === 'audio'}
							class:spare={dragActive && dragKind === lane.kind && lane.track === dragLaneCount - 1}
						>
							{#each clipsForLane(lane.kind, lane.track) as p (p.clip.id)}
							<div
								class="clip"
								class:selected={p.clip.id === editor.selectedId}
								class:dragging={p.clip.id === dragId && dragActive}
								style="left: {p.left}px; width: {p.width}px;{p.clip.id === dragId && dragActive
									? ` transform: translateX(${dragDx}px);`
									: ''}"
							>
								{#if p.width >= TIMELINE.minTrimWidthPx}
									<!-- svelte-ignore a11y_no_static_element_interactions -- pointer trim handle -->
									<div
										class="trim-handle trim-start"
										onpointerdown={(e) => startTrim(e, p.clip.id, 'start', p.clip.inPoint, p.clip.outPoint, p.clip.speed)}
									></div>
								{/if}
								<button
									class="clip-surface"
									onpointerdown={(e) => startClipDrag(e, p.clip.id)}
									onclick={() => onClipClick(p.clip.id)}
									aria-label="Select {p.clip.name}"
								>
									<div
										class="clip-thumb"
										class:empty={p.clip.kind === 'audio'
											? !editor.waveforms[p.clip.path]
											: p.clip.thumbnails.length === 0}
										style="--ar: {p.clip.aspectRatio}"
									>
										{#if p.clip.kind === 'audio'}
											{#if editor.waveforms[p.clip.path]}
												<canvas
													class="wave wave-full"
													use:waveCanvas={{
														peaks: editor.waveforms[p.clip.path],
														inPoint: p.clip.inPoint,
														outPoint: p.clip.outPoint,
														sourceDuration: p.clip.sourceDuration,
														width: p.width
													}}
												></canvas>
											{:else}
												<Icon name="volume" class="thumb-glyph" />
											{/if}
										{:else}
											{#if p.clip.thumbnails.length > 0}
												{#each filmstripFrames(p.clip, p.width) as frame, i (i)}
													<div class="frame" style="background-image: url({frame})"></div>
												{/each}
											{:else}
												<Icon name="film" class="thumb-glyph" />
											{/if}
											{#if editor.waveforms[p.clip.path]}
												<canvas
													class="wave"
													use:waveCanvas={{
														peaks: editor.waveforms[p.clip.path],
														inPoint: p.clip.inPoint,
														outPoint: p.clip.outPoint,
														sourceDuration: p.clip.sourceDuration,
														width: p.width
													}}
												></canvas>
											{/if}
										{/if}
									</div>
									<div class="clip-meta">
										<span class="clip-name">{p.clip.name}</span>
										<span class="clip-dur katana-mono">{formatTimecode(p.dur)}</span>
									</div>
								</button>
								{#if p.width >= TIMELINE.minTrimWidthPx}
									<!-- svelte-ignore a11y_no_static_element_interactions -- pointer trim handle -->
									<div
										class="trim-handle trim-end"
										onpointerdown={(e) => startTrim(e, p.clip.id, 'end', p.clip.inPoint, p.clip.outPoint, p.clip.speed)}
									></div>
								{/if}
								<div class="clip-actions">
									<IconButton icon="trash" label="Remove clip" size="sm" onclick={() => editor.removeClip(p.clip.id)} />
								</div>
							</div>
						{/each}
						</div>
					{/if}
				{/each}
			</div>

			<!-- Playhead spanning ruler + lanes (GPU transform for a smooth 60fps sweep) -->
			{#if editor.clips.length > 0}
				<div class="playhead" style="transform: translateX({playheadX}px)">
					<div class="playhead-head"></div>
				</div>
			{/if}
		</div>

		{#if editor.clips.length === 0}
			<div class="tl-empty">
				{editor.importing > 0 ? 'Importing…' : 'Import or drop a video to start editing'}
			</div>
		{/if}
	</div>
</div>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: var(--katana-bg-base);
		border-top: var(--katana-border-width) solid var(--katana-border);
		user-select: none;
	}

	.tl-scroll {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow-x: auto;
		overflow-y: auto;
		/* Scrollbar styling is global (see app.css). */
	}

	.tl-content {
		position: relative;
		min-width: 100%;
	}

	/* Ruler (also the scrub bar) */
	.ruler {
		position: relative;
		height: var(--katana-timeline-ruler-height);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
		cursor: pointer;
	}
	.tick {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: flex-end;
		gap: var(--katana-space-1);
		padding-bottom: var(--katana-space-1);
		pointer-events: none;
	}
	.tick-mark {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--katana-border-width);
		height: var(--katana-space-2);
		background: var(--katana-border-strong);
	}
	.tick-label {
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-muted);
		white-space: nowrap;
		padding-left: var(--katana-space-1);
		line-height: var(--katana-leading-none);
	}

	/* Track lanes */
	.lane {
		position: relative;
		height: var(--katana-timeline-track-height);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
	}
	/* Audio lanes are tinted to read as a separate section. */
	.audio-lane {
		background: var(--katana-bg-surface);
	}
	/* Divider between the video and audio sections. */
	.section-divider {
		height: var(--katana-border-width-thick);
		background: var(--katana-border-strong);
	}
	/* The spare lane on top reads as a lighter drop zone for new layers. */
	.lane.spare {
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent var(--katana-space-2),
			var(--katana-bg-surface) var(--katana-space-2),
			var(--katana-bg-surface) calc(var(--katana-space-2) * 2)
		);
		opacity: 0.5;
	}

	/* Clip snippet */
	.clip {
		position: absolute;
		top: var(--katana-timeline-gutter);
		bottom: var(--katana-timeline-gutter);
		display: flex;
		border-radius: var(--katana-radius-md);
		overflow: hidden;
		border: var(--katana-border-width) solid var(--katana-border);
		background: var(--katana-bg-elevated);
		transition: border-color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.clip:hover {
		border-color: var(--katana-border-strong);
	}
	.clip.selected {
		border: var(--katana-border-width-thick) solid var(--katana-accent);
	}
	.clip.dragging {
		z-index: 5;
		opacity: 0.85;
		box-shadow: var(--katana-shadow-pop);
		will-change: transform;
	}

	.clip-surface {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		text-align: left;
		background: transparent;
		cursor: grab;
	}
	.clip.dragging .clip-surface {
		cursor: grabbing;
	}

	/* Filmstrip preview area */
	.clip-thumb {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: stretch;
		justify-content: flex-start;
		overflow: hidden;
		background-color: var(--katana-bg-base);
		font-size: var(--katana-text-xl);
		color: var(--katana-text-muted);
	}

	/* Waveform overlay along the bottom of the filmstrip. */
	.wave {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 45%;
		pointer-events: none;
	}
	/* Audio clips: waveform fills the whole body. */
	.wave-full {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.clip-thumb.empty {
		align-items: center;
		justify-content: center;
	}
	.frame {
		height: 100%;
		flex: none;
		aspect-ratio: var(--ar);
		background-size: cover;
		background-position: center;
	}
	.frame + .frame {
		border-left: var(--katana-border-width) solid var(--katana-bg-base);
	}
	.clip-thumb :global(.thumb-glyph) {
		opacity: 0.5;
	}

	.clip-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--katana-space-2);
		padding: var(--katana-space-1) var(--katana-space-2);
		background: var(--katana-bg-elevated);
		border-top: var(--katana-border-width) solid var(--katana-border);
	}
	.clip-name {
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		color: var(--katana-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clip-dur {
		flex-shrink: 0;
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-muted);
	}

	/* Trim handles at each clip edge */
	.trim-handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--katana-space-3);
		z-index: 2;
		cursor: ew-resize;
		background: transparent;
		transition: background var(--katana-duration-fast) var(--katana-ease-out);
	}
	.trim-start {
		left: 0;
	}
	.trim-end {
		right: 0;
	}
	.trim-handle::after {
		content: '';
		position: absolute;
		top: 25%;
		bottom: 25%;
		left: 50%;
		transform: translateX(-50%);
		width: var(--katana-border-width-thick);
		border-radius: var(--katana-radius-full);
		background: var(--katana-accent);
		opacity: 0;
		transition: opacity var(--katana-duration-fast) var(--katana-ease-out);
	}
	.clip:hover .trim-handle {
		background: var(--katana-accent-muted);
	}
	.clip:hover .trim-handle::after {
		opacity: 0.6;
	}
	.trim-handle:hover {
		background: var(--katana-accent);
	}

	/* Per-clip action buttons, revealed on hover */
	.clip-actions {
		position: absolute;
		top: var(--katana-space-1);
		right: var(--katana-space-1);
		display: flex;
		gap: var(--katana-space-1);
		opacity: 0;
		z-index: 3;
		transition: opacity var(--katana-duration-fast) var(--katana-ease-out);
	}
	.clip:hover .clip-actions,
	.clip:focus-within .clip-actions {
		opacity: 1;
	}
	.clip-actions :global(.icon-btn) {
		background: var(--katana-bg-base);
	}

	/* Playhead. Positioned via transform (compositor-only) for a smooth sweep;
	   centered on its x by a half-width negative margin instead of translateX. */
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		margin-left: calc(var(--katana-border-width-thick) / -2);
		width: var(--katana-border-width-thick);
		background: var(--katana-accent);
		pointer-events: none;
		will-change: transform;
		z-index: var(--katana-z-timeline);
	}
	.playhead-head {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: var(--katana-space-1) solid transparent;
		border-right: var(--katana-space-1) solid transparent;
		border-top: var(--katana-space-2) solid var(--katana-accent);
	}

	/* Empty state */
	.tl-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
		pointer-events: none;
	}
</style>
