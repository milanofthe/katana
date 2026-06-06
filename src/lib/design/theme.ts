/**
 * Katana design tokens for JS/Canvas consumers.
 *
 * tokens.css is the source of truth for everything rendered via CSS. The
 * timeline draws on a <canvas>, which can't read CSS custom properties, so the
 * values it needs are mirrored here as plain literals. Keep this file in sync
 * with tokens.css — only the subset JS actually reads lives here.
 */

export const color = {
	bgBase: '#0e0e10',
	bgSurface: '#18181b',
	bgElevated: '#212126',
	bgOverlay: '#2a2a30',

	border: '#2e2e34',
	borderStrong: '#3a3a42',

	textPrimary: '#ececee',
	textSecondary: '#a8a8b0',
	textMuted: '#6e6e78',

	accent: '#ff5c4d',
	accentHover: '#ff7468',
	accentContrast: '#2a0e0a',

	success: '#3dd68c',
	danger: '#e5484d'
} as const;

/** Values the canvas timeline renderer reads directly (derived from color). */
export const timeline = {
	ruler: '#0e0e10',
	track: '#131316',
	clip: '#212126',
	clipBorder: '#3a3a42',
	clipSelected: '#ff5c4d',
	playhead: '#ff5c4d',
	cursor: '#a8a8b0'
} as const;

export const font = {
	sans: "'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif",
	mono: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', monospace"
} as const;

/** Motion durations in milliseconds, for JS-driven animation/transitions. */
export const duration = {
	fast: 140,
	base: 220
} as const;

export type ColorToken = keyof typeof color;
export type TimelineToken = keyof typeof timeline;
