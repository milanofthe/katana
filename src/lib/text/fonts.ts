// Font manifest — the single source of truth for text-overlay fonts.
//
// Each entry maps a stable `id` (stored on the clip) to a CSS family for the
// WebView preview and a bundled TTF `file` the Rust exporter hands to FFmpeg's
// drawtext, so preview and export render the same typeface. The TTFs ship as
// Tauri resources under src-tauri/fonts/ (see scripts/fetch-fonts + @font-face
// in design/fonts.css). Keep this list small and curated (UI minimalism).

export interface FontDef {
	id: string;
	label: string;
	/** CSS font-family for the preview (must have a matching @font-face). */
	cssFamily: string;
	/** Bundled TTF filename, resolved to a path by the exporter for drawtext. */
	file: string;
}

export const FONTS: FontDef[] = [
	{
		id: 'jakarta',
		label: 'Plus Jakarta Sans',
		cssFamily: "'Plus Jakarta Sans Variable', sans-serif",
		file: 'PlusJakartaSans.ttf'
	},
	{
		id: 'inter',
		label: 'Inter',
		cssFamily: "'Inter Variable', sans-serif",
		file: 'Inter.ttf'
	},
	{
		id: 'archivo',
		label: 'Archivo Black',
		cssFamily: "'Archivo Black', sans-serif",
		file: 'ArchivoBlack.ttf'
	},
	{
		id: 'playfair',
		label: 'Playfair Display',
		cssFamily: "'Playfair Display Variable', serif",
		file: 'PlayfairDisplay.ttf'
	},
	{
		id: 'mono',
		label: 'JetBrains Mono',
		cssFamily: "'JetBrains Mono Variable', monospace",
		file: 'JetBrainsMono.ttf'
	}
];

export function fontById(id: string): FontDef {
	return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

export function fontFamily(id: string): string {
	return fontById(id).cssFamily;
}
