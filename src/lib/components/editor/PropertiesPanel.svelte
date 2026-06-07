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
		<header class="props-header">
			{#if clip}
				<span class="kind-badge" class:audio={clip.kind === 'audio'}>
					{clip.kind === 'audio' ? 'Audio' : 'Video'}
				</span>
				<span class="clip-name" title={clip.name}>{clip.name}</span>
				<span class="clip-dur snip-mono">{formatTimecode(duration)}</span>
			{:else}
				<span class="props-title">Properties</span>
			{/if}
		</header>

		{#if clip}
			<div class="sections">
				<section class="card">
					<div class="card-head">
						<span class="card-title">Speed</span>
					</div>
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
					<section class="card">
						<div class="card-head">
							<span class="card-title">Placement</span>
							<IconButton
								icon="reset"
								label="Reset placement"
								size="sm"
								onclick={() => editor.resetTransform(clip.id)}
							/>
						</div>
						<div class="row">
							<span class="row-label">Scale</span>
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

				<section class="card">
					<div class="card-head">
						<span class="card-title">Audio</span>
						<div class="card-actions">
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
						<span class="row-label">Volume</span>
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
						<span class="row-label">Fade in</span>
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
						<span class="row-label">Fade out</span>
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
			</div>
		{:else}
			<div class="empty">
				<Icon name="settings" size={22} />
				<span>Select a clip to edit its properties</span>
			</div>
		{/if}
	</aside>
{/if}

<style>
	.props {
		flex: none;
		display: flex;
		flex-direction: column;
		background: var(--katana-bg-surface);
		border-left: var(--katana-border-width) solid var(--katana-border);
		overflow: hidden;
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

	/* Header: clip identity (badge + name + duration). */
	.props-header {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--katana-space-2);
		height: calc(var(--katana-control-lg) + var(--katana-space-2));
		padding-inline: var(--katana-space-4);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
	}
	.props-title {
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
	}
	.kind-badge {
		flex: none;
		padding: var(--katana-space-px) var(--katana-space-2);
		border-radius: var(--katana-radius-sm);
		background: var(--katana-bg-overlay);
		color: var(--katana-text-secondary);
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-medium);
		text-transform: uppercase;
		letter-spacing: var(--katana-tracking-wide);
	}
	.kind-badge.audio {
		background: var(--katana-accent-muted);
		color: var(--katana-accent);
	}
	.clip-name {
		flex: 1;
		min-width: 0;
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
		color: var(--katana-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clip-dur {
		flex: none;
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-muted);
	}

	/* Scrollable stack of section cards. */
	.sections {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
		padding: var(--katana-space-3);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
		padding: var(--katana-space-3);
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border);
		border-radius: var(--katana-radius-md);
	}
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: var(--katana-control-sm);
	}
	.card-title {
		font-size: var(--katana-text-xs);
		font-weight: var(--katana-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--katana-tracking-wide);
		color: var(--katana-text-secondary);
	}
	.card-actions {
		display: flex;
		align-items: center;
		gap: var(--katana-space-1);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--katana-space-2);
	}
	.row-label {
		flex: none;
		width: 3.25rem;
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}
	.value {
		flex: none;
		min-width: 2.75rem;
		text-align: right;
		font-size: var(--katana-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--katana-text-secondary);
	}

	/* Empty state (no selection). */
	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--katana-space-3);
		padding: var(--katana-space-6);
		text-align: center;
		font-size: var(--katana-text-sm);
		color: var(--katana-text-muted);
	}
</style>
