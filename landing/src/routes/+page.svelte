<script lang="ts">
	import { Logo, Button, Icon } from '$ui';

	const REPO = 'https://github.com/milanofthe/katana';
	const RELEASES = `${REPO}/releases`;

	const features = [
		{
			title: 'Multitrack compositing',
			text: 'Layer clips on a real viewport canvas: place, scale and snap. Picture in picture, split screen, overlays.'
		},
		{
			title: 'Lossless export',
			text: 'Copies the stream when nothing needs encoding again: trim and export in seconds with zero quality loss.'
		},
		{
			title: 'Snappy playback',
			text: 'GPU accelerated dragging, a frame accurate clock and instant scrubbing. The UI keeps up with you.'
		},
		{
			title: 'Audio you control',
			text: 'Detach audio to its own track, import music, mix and fade. Waveforms and audio scrubbing built in.'
		},
		{
			title: 'Tiny & native',
			text: 'Built on Tauri: a small, fast desktop app with bundled FFmpeg. No bloated runtime.'
		},
		{
			title: 'Open source',
			text: 'MIT licensed and hackable. A clean SvelteKit + Rust codebase you can read and extend.'
		}
	];
</script>

<div class="grid-bg" aria-hidden="true"></div>

<div class="page">
	<section class="hero">
		<h1 class="sr-only">Katana, a fast and minimalist video editor</h1>
		<div class="hero-logo"><Logo variant="full" /></div>
		<p class="lead">
			Fast, minimalist, multitrack. Compositing, lossless export and a snappy UI, in a tiny native
			app.
		</p>
		<div class="cta">
			<Button variant="primary" size="lg" href={RELEASES} target="_blank">Download</Button>
			<Button variant="ghost" size="lg" href={REPO} target="_blank">
				<Icon name="github" /> GitHub
			</Button>
		</div>
	</section>

	<section class="features">
		{#each features as f (f.title)}
			<div class="feat">
				<span class="dot"></span>
				<div>
					<h3 class="feat-title">{f.title}</h3>
					<p class="feat-text">{f.text}</p>
				</div>
			</div>
		{/each}
	</section>

	<section class="origin">
		<h2 class="origin-head">Why Katana?</h2>
		<p class="origin-text">
			Honestly? I was sick of Clipchamp. Slow, clunky, fighting me at every cut, with a UI that
			lagged behind my own clicks. So I built the editor I actually wanted: fast, minimal, and out of
			the way. Trim, compose, export, done.
		</p>
	</section>

	<footer class="foot">
		<nav class="foot-links">
			<a href={RELEASES} target="_blank" rel="noreferrer">Download</a>
			<a href={REPO} target="_blank" rel="noreferrer">Source</a>
			<a href={`${REPO}/issues`} target="_blank" rel="noreferrer">Issues</a>
			<a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>
			<a href="https://milanrother.com" target="_blank" rel="noreferrer">milanrother.com</a>
		</nav>
		<span class="foot-by">© 2026 Katana · built by Milan Rother</span>
	</footer>
</div>

<style>
	/* Grid background: diagonal hairlines at the blade angle. A fixed,
	   full-viewport layer so it always fills the window and never scrolls. */
	.grid-bg {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		background-image: repeating-linear-gradient(
			-45deg,
			rgba(255, 255, 255, 0.05) 0 2px,
			transparent 2px 34px
		);
	}

	.page {
		position: relative;
		z-index: 1;
		max-width: 60rem;
		margin: 0 auto;
		padding: 0 var(--katana-space-6);
	}

	/* ── Hero ────────────────────────────────────────────────────── */
	.hero {
		/* Logo font-size drives both the logo and the tagline width below. */
		--logo-size: clamp(3rem, 9vw, 6.5rem);
		padding: var(--katana-space-16) 0 var(--katana-space-12);
	}
	.hero-logo {
		font-size: var(--logo-size);
		margin-bottom: var(--katana-space-6);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.lead {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
		/* Match the rendered logo width: height(1.9em) × aspect(4230/1128). */
		max-width: calc(var(--logo-size) * 7.125);
		margin: 0 0 var(--katana-space-6);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--katana-space-3);
	}

	/* ── Features ────────────────────────────────────────────────── */
	.features {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--katana-space-8) var(--katana-space-10);
		padding: var(--katana-space-10) 0;
	}
	.feat {
		display: flex;
		gap: var(--katana-space-3);
	}
	.dot {
		flex: none;
		width: var(--katana-space-2);
		height: var(--katana-space-2);
		margin-top: 0.45rem;
		border-radius: var(--katana-radius-full);
		background: var(--katana-accent);
	}
	.feat-title {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-semibold);
		margin: 0 0 var(--katana-space-1);
	}
	.feat-text {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-secondary);
		margin: 0;
	}

	/* ── Origin story ────────────────────────────────────────────── */
	.origin {
		max-width: 40rem;
		padding: var(--katana-space-10) 0;
	}
	.origin-head {
		font-size: var(--katana-text-lg);
		font-weight: var(--katana-weight-semibold);
		letter-spacing: var(--katana-tracking-tight);
		margin: 0 0 var(--katana-space-3);
	}
	.origin-text {
		font-size: var(--katana-text-md);
		color: var(--katana-text-secondary);
		margin: 0;
	}

	/* ── Footer (compact) ────────────────────────────────────────── */
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--katana-space-4);
		padding: var(--katana-space-8) 0 var(--katana-space-12);
	}
	.foot-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--katana-space-5);
	}
	.foot-links a {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-secondary);
		text-decoration: none;
		transition: color var(--katana-duration-fast) var(--katana-ease-out);
	}
	.foot-links a:hover {
		color: var(--katana-text-primary);
	}
	.foot-by {
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
	}

	@media (max-width: 40rem) {
		.features {
			grid-template-columns: 1fr;
		}
	}
</style>
