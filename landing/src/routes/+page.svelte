<script lang="ts">
	import { Logo, Button, Icon } from '$ui';

	const REPO = 'https://github.com/milanofthe/katana';
	const RELEASES = `${REPO}/releases`;

	const features = [
		{
			icon: 'film',
			title: 'Multi-track compositing',
			text: 'Layer clips on a real viewport canvas: place, scale and snap. Picture-in-picture, split-screen, overlays.'
		},
		{
			icon: 'export',
			title: 'Lossless export',
			text: 'Stream-copy when nothing needs re-encoding: trim and export in seconds with zero quality loss.'
		},
		{
			icon: 'play',
			title: 'Snappy playback',
			text: 'GPU-accelerated dragging, frame-accurate clock, instant scrubbing. The UI keeps up with you.'
		},
		{
			icon: 'scissors',
			title: 'Audio you control',
			text: 'Detach audio to its own track, import music, mix and fade. Waveforms and audio scrubbing built in.'
		},
		{
			icon: 'katana',
			title: 'Tiny & native',
			text: 'Built on Tauri: a small, fast desktop app with bundled FFmpeg. No bloated runtime.'
		},
		{
			icon: 'github',
			title: 'Open source',
			text: 'MIT licensed and hackable. A clean SvelteKit + Rust codebase you can read and extend.'
		}
	] as const;
</script>

<div class="page">
	<header class="nav">
		<div class="nav-brand"><Logo variant="full" /></div>
		<a class="nav-link" href={REPO} target="_blank" rel="noreferrer">
			<Icon name="github" size={18} /> GitHub
		</a>
	</header>

	<section class="hero">
		<div class="hero-copy">
			<div class="hero-logo"><Logo variant="full" /></div>
			<h1 class="headline">The video editor that keeps up.</h1>
			<p class="sub">
				Fast, minimalist, multi-track. Compositing, lossless export and a snappy UI, in a tiny native
				app. Free and open source.
			</p>
			<div class="cta">
				<Button variant="primary" size="lg" href={RELEASES} target="_blank">
					<Icon name="export" /> Download for Windows
				</Button>
				<Button variant="ghost" size="lg" href={REPO} target="_blank">
					<Icon name="github" /> View on GitHub
				</Button>
			</div>
			<p class="note">Windows desktop · MIT licensed · macOS &amp; Linux soon</p>
		</div>

		<!-- Stylized editor mock (pure CSS, no screenshot). -->
		<div class="mock" aria-hidden="true">
			<div class="mock-bar">
				<span class="dot"></span><span class="dot"></span><span class="dot"></span>
			</div>
			<div class="mock-stage">
				<div class="mock-frame">
					<div class="mock-pip"></div>
				</div>
				<div class="mock-props">
					<span class="mock-line"></span><span class="mock-line short"></span>
					<span class="mock-line"></span><span class="mock-line short"></span>
				</div>
			</div>
			<div class="mock-timeline">
				<div class="mock-track">
					<span class="clip a" style="left:2%;width:34%"></span>
					<span class="clip a" style="left:38%;width:26%"></span>
					<span class="clip a" style="left:66%;width:30%"></span>
				</div>
				<div class="mock-track audio">
					<span class="clip wave" style="left:6%;width:54%"></span>
					<span class="clip wave" style="left:62%;width:30%"></span>
				</div>
				<div class="mock-playhead"></div>
			</div>
		</div>
	</section>

	<section class="features">
		{#each features as f (f.title)}
			<div class="card">
				<div class="card-icon"><Icon name={f.icon} size={20} /></div>
				<h3 class="card-title">{f.title}</h3>
				<p class="card-text">{f.text}</p>
			</div>
		{/each}
	</section>

	<section class="closer">
		<h2 class="closer-head">Cut. Compose. Export. Done.</h2>
		<div class="cta">
			<Button variant="primary" size="lg" href={RELEASES} target="_blank">
				<Icon name="export" /> Get Katana
			</Button>
		</div>
	</section>

	<footer class="foot">
		<Logo variant="mark" />
		<span class="foot-text">Katana · MIT · built by Milan Rother</span>
		<a class="nav-link" href={REPO} target="_blank" rel="noreferrer">
			<Icon name="github" size={16} /> Source
		</a>
	</footer>
</div>

<style>
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 var(--katana-space-6);
	}

	/* Nav */
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--katana-space-5) 0;
	}
	.nav-brand {
		font-size: var(--katana-text-xs);
	}
	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: var(--katana-space-2);
		color: var(--katana-text-secondary);
		text-decoration: none;
		font-size: var(--katana-text-sm);
		font-weight: var(--katana-weight-medium);
		transition: color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.nav-link:hover {
		color: var(--katana-text-primary);
	}

	/* Hero */
	.hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--katana-space-12);
		align-items: center;
		padding: var(--katana-space-12) 0;
	}
	.hero-logo {
		font-size: var(--katana-text-md);
		margin-bottom: var(--katana-space-6);
	}
	.headline {
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: var(--katana-weight-semibold);
		line-height: var(--katana-leading-tight);
		letter-spacing: var(--katana-tracking-tight);
		margin: 0 0 var(--katana-space-4);
	}
	.sub {
		font-size: var(--katana-text-md);
		color: var(--katana-text-secondary);
		max-width: 34rem;
		margin: 0 0 var(--katana-space-6);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--katana-space-3);
	}
	.note {
		margin-top: var(--katana-space-4);
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}

	/* Editor mock */
	.mock {
		border: var(--katana-border-width) solid var(--katana-border);
		border-radius: var(--katana-radius-lg);
		background: var(--katana-bg-surface);
		box-shadow: var(--katana-shadow-pop);
		overflow: hidden;
	}
	.mock-bar {
		display: flex;
		gap: var(--katana-space-2);
		padding: var(--katana-space-3);
		border-bottom: var(--katana-border-width) solid var(--katana-border);
	}
	.dot {
		width: var(--katana-space-2);
		height: var(--katana-space-2);
		border-radius: var(--katana-radius-full);
		background: var(--katana-border-strong);
	}
	.mock-stage {
		display: flex;
		gap: var(--katana-space-2);
		padding: var(--katana-space-3);
	}
	.mock-frame {
		position: relative;
		flex: 1;
		aspect-ratio: 16 / 9;
		border-radius: var(--katana-radius-sm);
		background: linear-gradient(135deg, #1b1b20, #0c0c0e);
		border: var(--katana-border-width) solid var(--katana-border);
	}
	.mock-pip {
		position: absolute;
		right: 8%;
		bottom: 10%;
		width: 28%;
		aspect-ratio: 16 / 9;
		border-radius: var(--katana-radius-sm);
		background: var(--katana-accent-muted);
		border: var(--katana-border-width) solid var(--katana-accent);
	}
	.mock-props {
		flex: none;
		width: 22%;
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
		padding-top: var(--katana-space-1);
	}
	.mock-line {
		height: var(--katana-space-2);
		border-radius: var(--katana-radius-full);
		background: var(--katana-bg-overlay);
	}
	.mock-line.short {
		width: 60%;
	}
	.mock-timeline {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--katana-space-2);
		padding: var(--katana-space-3);
		border-top: var(--katana-border-width) solid var(--katana-border);
		background: var(--katana-bg-base);
	}
	.mock-track {
		position: relative;
		height: 2.25rem;
	}
	.clip {
		position: absolute;
		top: 0;
		bottom: 0;
		border-radius: var(--katana-radius-sm);
	}
	.clip.a {
		background: var(--katana-bg-elevated);
		border: var(--katana-border-width) solid var(--katana-border-strong);
	}
	.clip.wave {
		background: var(--katana-accent-muted);
		border: var(--katana-border-width) solid var(--katana-accent);
	}
	.mock-track.audio {
		height: 1.75rem;
	}
	.mock-playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 44%;
		width: var(--katana-border-width-thick);
		background: var(--katana-accent);
	}

	/* Features */
	.features {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--katana-space-4);
		padding: var(--katana-space-8) 0;
	}
	.card {
		padding: var(--katana-space-5);
		background: var(--katana-bg-surface);
		border: var(--katana-border-width) solid var(--katana-border);
		border-radius: var(--katana-radius-lg);
	}
	.card-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--katana-control-lg);
		height: var(--katana-control-lg);
		border-radius: var(--katana-radius-md);
		background: var(--katana-accent-muted);
		color: var(--katana-accent);
		margin-bottom: var(--katana-space-3);
	}
	.card-title {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-semibold);
		margin: 0 0 var(--katana-space-2);
	}
	.card-text {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-secondary);
		margin: 0;
	}

	/* Closer */
	.closer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--katana-space-5);
		text-align: center;
		padding: var(--katana-space-12) 0;
	}
	.closer-head {
		font-size: clamp(1.5rem, 3vw, 2.25rem);
		font-weight: var(--katana-weight-semibold);
		letter-spacing: var(--katana-tracking-tight);
		margin: 0;
	}

	/* Footer */
	.foot {
		display: flex;
		align-items: center;
		gap: var(--katana-space-3);
		padding: var(--katana-space-6) 0 var(--katana-space-10);
		border-top: var(--katana-border-width) solid var(--katana-border);
		font-size: var(--katana-text-xs);
	}
	.foot-text {
		flex: 1;
		color: var(--katana-text-muted);
	}

	@media (max-width: 48rem) {
		.hero {
			grid-template-columns: 1fr;
			gap: var(--katana-space-8);
			padding: var(--katana-space-8) 0;
		}
		.features {
			grid-template-columns: 1fr;
		}
	}
</style>
