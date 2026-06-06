// Katana UI library — public surface. Import design pieces from '$lib'.

// Design tokens for JS/Canvas consumers (CSS uses tokens.css via app.css).
export { color, timeline, font, duration } from './design/theme';
export type { ColorToken, TimelineToken } from './design/theme';

// Icons
export { default as Icon } from './icons/Icon.svelte';
export { ICONS, type IconName } from './icons/paths';

// Components
export { default as Logo } from './components/Logo.svelte';
export { default as Button } from './components/Button.svelte';
export { default as IconButton } from './components/IconButton.svelte';
export { default as Tooltip } from './components/Tooltip.svelte';
export { default as Slider } from './components/Slider.svelte';
