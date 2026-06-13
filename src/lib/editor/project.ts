// Project save / load. The timeline serializes to a small versioned JSON file
// (.katana) holding only durable fields (paths, trims, placement). Asset URLs,
// thumbnails and waveforms are regenerated from each clip's path on load, so
// project files stay tiny and portable.
import { save, open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import {
	editor,
	defaultTextStyle,
	type Clip,
	type ClipKind,
	type TextStyle,
	type AspectRatio
} from './store.svelte';
import { ensureWaveform } from './waveform';
import { extractThumbs } from './import';

const PROJECT_VERSION = 1;

interface SavedClip {
	kind: ClipKind;
	path: string;
	name: string;
	sourceDuration: number;
	inPoint: number;
	outPoint: number;
	start: number;
	track: number;
	aspectRatio: number;
	volume: number;
	muted: boolean;
	fadeInSec: number;
	fadeOutSec: number;
	speed: number;
	transform: { x: number; y: number; scale: number };
	text?: TextStyle;
}

interface ProjectFile {
	katana: true;
	version: number;
	aspectRatio: AspectRatio;
	clips: SavedClip[];
}

function toSaved(c: Clip): SavedClip {
	return {
		kind: c.kind,
		path: c.path,
		name: c.name,
		sourceDuration: c.sourceDuration,
		inPoint: c.inPoint,
		outPoint: c.outPoint,
		start: c.start,
		track: c.track,
		aspectRatio: c.aspectRatio,
		volume: c.volume,
		muted: c.muted,
		fadeInSec: c.fadeInSec,
		fadeOutSec: c.fadeOutSec,
		speed: c.speed,
		transform: { x: c.transform.x, y: c.transform.y, scale: c.transform.scale },
		...(c.text ? { text: { ...c.text } } : {})
	};
}

const KNOWN_KINDS: ClipKind[] = ['video', 'audio', 'text'];

/** Rehydrate a saved clip: recompute the asset URL, leave media to regenerate. */
function fromSaved(s: SavedClip): Clip {
	const kind: ClipKind = KNOWN_KINDS.includes(s.kind) ? s.kind : 'video';
	const isText = kind === 'text';
	return {
		id: crypto.randomUUID(),
		kind,
		// Text overlays have no source media; everything else resolves an asset URL.
		src: isText ? '' : convertFileSrc(s.path),
		path: s.path,
		name: s.name ?? '',
		sourceDuration: s.sourceDuration ?? 0,
		inPoint: s.inPoint ?? 0,
		outPoint: s.outPoint ?? s.sourceDuration ?? 0,
		start: s.start ?? 0,
		track: s.track ?? 0,
		aspectRatio: s.aspectRatio || 16 / 9,
		thumbnails: [],
		volume: s.volume ?? 1,
		muted: !!s.muted,
		fadeInSec: s.fadeInSec ?? 0,
		fadeOutSec: s.fadeOutSec ?? 0,
		speed: s.speed ?? 1,
		transform: {
			x: s.transform?.x ?? 0,
			y: s.transform?.y ?? 0,
			scale: s.transform?.scale ?? 1
		},
		...(isText ? { text: s.text ?? defaultTextStyle() } : {})
	};
}

export async function saveProject(): Promise<void> {
	if (editor.clips.length === 0) return;
	const out = await save({
		defaultPath: 'project.katana',
		filters: [{ name: 'Katana Project', extensions: ['katana'] }]
	});
	if (!out) return;

	const data: ProjectFile = {
		katana: true,
		version: PROJECT_VERSION,
		aspectRatio: editor.aspectRatio,
		clips: editor.clips.map(toSaved)
	};
	try {
		await invoke('save_project', { path: out, contents: JSON.stringify(data, null, 2) });
		editor.notify('Project saved', 'ok');
	} catch (e) {
		editor.notify(String(e), 'error');
	}
}

export async function openProject(): Promise<void> {
	const selected = await open({
		multiple: false,
		filters: [{ name: 'Katana Project', extensions: ['katana'] }]
	});
	if (!selected || Array.isArray(selected)) return;

	let raw: string;
	try {
		raw = await invoke<string>('load_project', { path: selected });
	} catch (e) {
		editor.notify(String(e), 'error');
		return;
	}

	let data: ProjectFile;
	try {
		data = JSON.parse(raw);
	} catch {
		editor.notify('Invalid project file', 'error');
		return;
	}
	if (!data || data.katana !== true || !Array.isArray(data.clips)) {
		editor.notify('Not a Katana project', 'error');
		return;
	}

	const clips = data.clips.map(fromSaved);
	editor.loadProject(clips, data.aspectRatio ?? 'original');

	// Regenerate derived media from disk (off the UI thread / in the background).
	// Text overlays have no source media, so nothing to regenerate.
	for (const c of clips) {
		if (c.kind === 'text') continue;
		void ensureWaveform(c.src, c.path);
		if (c.kind === 'video') void extractThumbs(c.id, c.path, c.sourceDuration);
	}
	editor.notify('Project loaded', 'ok');
}
