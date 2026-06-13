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
			title: 'Text overlays',
			text: 'Add styled titles: pick a font, color, alignment and outline, then place, scale and fade them like any clip.'
		},
		{
			title: 'Lossless export',
			text: 'Copies the stream when nothing needs encoding again: trim and export in seconds with zero quality loss.'
		},
		{
			title: 'Frame accurate',
			text: 'Step frame by frame, and the timeline runs at your fastest clip frame rate, so nothing gets downsampled.'
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

	// Honest, code-backed comparison. Katana now ships cross platform (Windows and
	// Linux); macOS is not built yet, so the row reads as a partial win.
	const rivals = ['Katana', 'Clipchamp', 'OpenShot', 'Shotcut'];
	const compareRows = [
		{ label: 'Open source', cells: [true, false, true, true] },
		{ label: 'Free, no watermark', cells: [true, true, true, true] },
		{ label: 'No account or sign-in', cells: [true, false, true, true] },
		{ label: 'Tiny native app', cells: [true, false, false, false] },
		{ label: 'Multitrack compositing', cells: [true, true, true, true] },
		{ label: 'Lossless stream-copy export', cells: [true, false, false, false] },
		{ label: 'Works fully offline', cells: [true, false, true, true] },
		{ label: 'Cross platform', cells: [true, false, true, true] }
	];

	const faqs = [
		{
			q: 'Is Katana free?',
			a: 'Yes. Katana is completely free and open source under the MIT license. No paid tiers, no watermark, no sign up.'
		},
		{
			q: 'Is Katana open source?',
			a: 'Yes. The full SvelteKit and Rust codebase is MIT licensed and public on GitHub, so you can read, fork and extend it.'
		},
		{
			q: 'Which platforms does Katana run on?',
			a: 'Katana ships for Windows and Linux (64 bit): an NSIS or MSI installer on Windows, an AppImage or .deb package on Linux. It is built on Tauri, so a macOS build is possible down the line.'
		},
		{
			q: 'Is Katana a good Clipchamp alternative?',
			a: 'That is exactly why it exists. Katana is a fast, minimal, offline desktop editor with no account required, built by someone who got tired of Clipchamp.'
		},
		{
			q: 'Does Katana need an internet connection or an account?',
			a: 'No. Katana is a native desktop app that runs fully offline. No login, no cloud, no telemetry.'
		},
		{
			q: 'What formats can Katana export?',
			a: 'MP4 (H.264 and H.265), WebM (VP9), MOV and GIF. When a clip needs no re-encoding, Katana copies the stream for a lossless export in seconds.'
		},
		{
			q: 'Can Katana add text to videos?',
			a: 'Yes. Add styled text overlays with a font, color, alignment and outline, then place, scale and fade them on the timeline like any other clip. The export draws the same fonts, so titles look identical to the preview.'
		}
	];

	// FAQPage structured data, driven by the same array so the two never drift.
	const faqLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	});
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${faqLd}</scr` + `ipt>`}
</svelte:head>

<div class="grid-bg" aria-hidden="true"></div>

<div class="page">
	<section class="hero">
		<h1 class="hero-logo">
			<span class="sr-only">Katana, a free and open source video editor for Windows and Linux</span>
			<Logo variant="full" />
		</h1>
		<p class="lead">
			A free, open source video editor for Windows and Linux. Fast, minimalist and multitrack:
			compositing, text overlays, lossless export and a snappy UI, in a tiny native app.
		</p>
		<div class="cta">
			<Button variant="primary" size="lg" href={RELEASES} target="_blank">Download</Button>
			<Button variant="ghost" size="lg" href={REPO} target="_blank">
				<Icon name="github" /> GitHub
			</Button>
		</div>
	</section>

	<section class="shots" aria-label="Screenshots of Katana">
		<figure class="shot">
			<img
				src="/screenshot-editor.webp"
				width="1500"
				height="998"
				loading="lazy"
				decoding="async"
				alt="Katana video editor showing a multitrack timeline, the preview canvas and the clip properties panel"
			/>
		</figure>
		<figure class="shot">
			<img
				src="/screenshot-export.webp"
				width="1500"
				height="999"
				loading="lazy"
				decoding="async"
				alt="Katana export dialog with MP4, WebM, MOV and GIF formats plus resolution and quality settings"
			/>
		</figure>
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

	<section class="compare">
		<h2 class="sec-head">How Katana compares</h2>
		<div class="table-wrap">
			<table class="cmp">
				<thead>
					<tr>
						<th scope="col" class="row-label-head">Feature</th>
						{#each rivals as name, i (name)}
							<th scope="col" class:is-katana={i === 0}>{name}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each compareRows as row (row.label)}
						<tr>
							<th scope="row" class="row-label">{row.label}</th>
							{#each row.cells as yes, i (i)}
								<td class:is-katana={i === 0}>
									{#if yes}
										<span class="yes" aria-label="Yes">✓</span>
									{:else}
										<span class="no" aria-label="No">✕</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="cmp-note">
			Comparison reflects each editor as of 2026. Katana ships for Windows and Linux, and is proud
			of what it does well: speed, a clean UI and lossless export.
		</p>
	</section>

	<section class="origin">
		<h2 class="origin-head">Why Katana?</h2>
		<p class="origin-text">
			Honestly? I was sick of Clipchamp. Slow, clunky, fighting me at every cut, with a UI that
			lagged behind my own clicks. So I built the editor I actually wanted: a fast, minimal, open
			source Clipchamp alternative that stays out of the way. Trim, compose, export, done.
		</p>
	</section>

	<section class="faq">
		<h2 class="sec-head">Frequently asked questions</h2>
		<dl class="faq-list">
			{#each faqs as f (f.q)}
				<div class="qa">
					<dt class="q">{f.q}</dt>
					<dd class="a">{f.a}</dd>
				</div>
			{/each}
		</dl>
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
		margin: 0 0 var(--katana-space-6);
		font-weight: inherit;
		line-height: var(--katana-leading-none);
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

	/* ── Screenshots (side by side) ──────────────────────────────── */
	.shots {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--katana-space-4);
		padding: var(--katana-space-4) 0 var(--katana-space-6);
	}
	.shot {
		margin: 0;
		min-width: 0;
	}
	.shot img {
		width: 100%;
		height: auto;
		border-radius: var(--katana-radius-md);
		border: var(--katana-border-width) solid var(--katana-border);
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

	/* Shared section heading. */
	.sec-head {
		font-size: var(--katana-text-lg);
		font-weight: var(--katana-weight-semibold);
		letter-spacing: var(--katana-tracking-tight);
		margin: 0 0 var(--katana-space-6);
	}

	/* ── Comparison table ────────────────────────────────────────── */
	.compare {
		padding: var(--katana-space-10) 0;
	}
	.table-wrap {
		overflow-x: auto;
	}
	.cmp {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--katana-text-sm);
		min-width: 32rem;
	}
	.cmp th,
	.cmp td {
		padding: var(--katana-space-3) var(--katana-space-4);
		text-align: center;
		border-bottom: var(--katana-border-width) solid var(--katana-border);
	}
	.cmp thead th {
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-secondary);
	}
	.row-label-head,
	.row-label {
		text-align: left;
		font-weight: var(--katana-weight-regular);
		color: var(--katana-text-secondary);
		white-space: nowrap;
	}
	/* Katana column stands out without shouting. */
	.cmp .is-katana {
		background: var(--katana-accent-muted);
		color: var(--katana-text-primary);
	}
	.cmp thead .is-katana {
		color: var(--katana-accent);
		font-weight: var(--katana-weight-semibold);
	}
	.yes {
		color: var(--katana-accent);
		font-weight: var(--katana-weight-semibold);
	}
	.no {
		color: var(--katana-text-muted);
	}
	.cmp-note {
		font-size: var(--katana-text-xs);
		color: var(--katana-text-muted);
		margin: var(--katana-space-4) 0 0;
		max-width: 40rem;
	}

	/* ── FAQ ─────────────────────────────────────────────────────── */
	.faq {
		padding: var(--katana-space-10) 0;
	}
	.faq-list {
		display: grid;
		gap: var(--katana-space-6);
		margin: 0;
		max-width: 44rem;
	}
	.qa {
		margin: 0;
	}
	.q {
		font-size: var(--katana-text-md);
		font-weight: var(--katana-weight-semibold);
		color: var(--katana-text-primary);
		margin: 0 0 var(--katana-space-1);
	}
	.a {
		font-size: var(--katana-text-sm);
		color: var(--katana-text-secondary);
		margin: 0;
		line-height: var(--katana-leading-normal);
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
		.features,
		.shots {
			grid-template-columns: 1fr;
		}
	}
</style>
