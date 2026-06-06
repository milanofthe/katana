// Timecode formatting helpers shared across the editor.

/** Format seconds as `m:ss`, or `h:mm:ss` once the hour mark is reached. */
export function formatTimecode(seconds: number): string {
	const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
	const total = Math.floor(safe);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
