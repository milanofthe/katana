<script lang="ts">
	import { Slider, IconButton, Icon } from '$lib';
	import { editor, clipDuration } from '$lib/editor/store.svelte';
	import { CLIP, VIEWPORT } from '$lib/constants';
	import { formatTimecode } from '$lib/editor/time';

	const clip = $derived(editor.selectedClip);
	const duration = $derived(clip ? clipDuration(clip) : 0);
</script>

{#if editor.propsCollapsed}
	<button class="props-rail" aria-label="Show properties" onclick={() => editor.togglePropsCollapsed()}>
		<Icon name="chevronLeft" size={14} />
	</button>
{:else}
	<aside class="props" style="width: {editor.propsWidth}px">
		<header class="panel-head">
			<h2 class="panel-title">Properties</h2>
			<IconButton
				icon="chevronRight"
				label="Hide properties"
				size="sm"
				onclick={() => editor.togglePropsCollapsed()}
			/>
		</header>
		{#if clip}
		<section class="group">
			<h3 class="title">Speed</h3>
			<div class="row">
				<Slider
					value={clip.speed}
					min={CLIP.minSpeed}
					max={CLIP.maxSpeed}
					step={0.05}
					label="Playback speed"
					oninput={(v) => {
						editor.beginTransaction();
						editor.setSpeed(v);
					}}
					onchange={() => editor.endTransaction()}
				/>
				<span class="value snip-mono">{clip.speed.toFixed(2)}×</span>
			</div>
		</section>

		{#if clip.kind === 'video'}
			<section class="group">
				<div class="head">
					<h3 class="title">Placement</h3>
					<IconButton
						icon="reset"
						label="Reset placement"
						size="sm"
						onclick={() => editor.resetTransform(clip.id)}
					/>
				</div>
				<div class="row">
					<span class="sub">Scale</span>
					<Slider
						value={clip.transform.scale}
						min={VIEWPORT.minScale}
						max={VIEWPORT.maxScale}
						step={0.01}
						label="Scale"
						oninput={(v) => {
							editor.beginTransaction();
							editor.setTransform(clip.id, { scale: v });
						}}
						onchange={() => editor.endTransaction()}
					/>
					<span class="value snip-mono">{Math.round(clip.transform.scale * 100)}%</span>
				</div>
			</section>
		{/if}

		<section class="group">
			<div class="head">
				<h3 class="title">Audio</h3>
				<div class="head-actions">
					{#if clip.kind === 'video' && !clip.muted}
						<IconButton
							icon="scissors"
							label="Detach audio to its own track"
							size="sm"
							onclick={() => editor.detachAudio(clip.id)}
						/>
					{/if}
					<IconButton
						icon={clip.muted ? 'volumeX' : 'volume'}
						label={clip.muted ? 'Unmute' : 'Mute'}
						size="sm"
						active={clip.muted}
						onclick={() => editor.toggleClipMute()}
					/>
				</div>
			</div>
			<div class="row">
				<Slider
					value={clip.volume}
					min={0}
					max={1}
					step={0.01}
					label="Volume"
					disabled={clip.muted}
					oninput={(v) => {
						editor.beginTransaction();
						editor.setVolume(v);
					}}
					onchange={() => editor.endTransaction()}
				/>
				<span class="value snip-mono">{Math.round(clip.volume * 100)}%</span>
			</div>
			<div class="row">
				<span class="sub">Fade in</span>
				<Slider
					value={clip.fadeInSec}
					min={0}
					max={duration}
					step={0.1}
					label="Fade in"
					oninput={(v) => {
						editor.beginTransaction();
						editor.setFadeIn(v);
					}}
					onchange={() => editor.endTransaction()}
				/>
				<span class="value snip-mono">{clip.fadeInSec.toFixed(1)}s</span>
			</div>
			<div class="row">
				<span class="sub">Fade out</span>
				<Slider
					value={clip.fadeOutSec}
					min={0}
					max={duration}
					step={0.1}
					label="Fade out"
					oninput={(v) => {
						editor.beginTransaction();
						editor.setFadeOut(v);
					}}
					onchange={() => editor.endTransaction()}
				/>
				<span class="value snip-mono">{clip.fadeOutSec.toFixed(1)}s</span>
			</div>
		</section>

		<section class="group">
			<h3 class="title">Clip</h3>
			<dl class="info">
				<dt>Name</dt>
				<dd title={clip.name}>{clip.name}</dd>
				<dt>Duration</dt>
				<dd class="snip-mono">{formatTimecode(duration)}</dd>
			</dl>
		</section>
		{:else}
			<p class="empty">Select a clip to edit its properties.</p>
		{/if}
	</aside>
{/if}

<style>
	.props {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-5);
		padding: var(--katana-space-4);
		background: var(--katana-bg-surface);
		border-left: var(--katana-border-width) solid var(--katana-border);
		overflow-y: auto;
	}

	/* Collapsed: a thin clickable rail that re-expands the panel. */
	.props-rail {
		flex: none;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		width: var(--katana-control-md);
		padding-top: var(--katana-space-3);
		background: var(--katana-bg-surface);
		border-left: var(--katana-border-width) solid var(--katana-border);
		color: var(--katana-text-muted);
		cursor: pointer;
		transition: color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.props-rail:hover {
		color: var(--katana-text-primary);
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: calc(var(--katana-space-1) * -1);
	}
	.panel-title {
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-3);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.head-actions {
		display: flex;
		align-items: center;
		gap: var(--katana-space-1);
	}
	.title {
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--katana-tracking-wide);
		color: var(--katana-text-muted);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--katana-space-2);
	}
	.sub {
		flex: none;
		width: 3.5rem;
		font-size: var(--katana-text-xs);
		color: var(--katana-text-secondary);
	}
	.value {
		flex: none;
		min-width: 2.75rem;
		text-align: right;
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-secondary);
	}

	.info {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--katana-space-1) var(--katana-space-3);
		margin: 0;
	}
	.info dt {
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}
	.info dd {
		margin: 0;
		font-size: var(--katana-text-xs);
		color: var(--katana-text-secondary);
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.empty {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
	}
</style>
