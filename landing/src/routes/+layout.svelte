<script lang="ts">
	// Reuse the editor's design system (fonts + tokens + reset), then a
	// landing-specific base that re-enables scrolling.
	import '$ui/design/fonts.css';
	import '$ui/design/tokens.css';
	import '$ui/design/reset.css';
	import './base.css';

	let { children } = $props();
</script>

{@render children()}
