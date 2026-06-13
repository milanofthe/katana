// Global editor keyboard shortcuts. Wired via <svelte:window onkeydown> on the
// editor page. Modifier combinations (Ctrl/Cmd/Alt) are left to the OS/browser.
import { editor } from './store.svelte';
import { saveProject, openProject } from './project';
import { SEEK } from '$lib/constants';

function isTypingTarget(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	if (!el) return false;
	return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function handleEditorKeydown(e: KeyboardEvent): void {
	if (isTypingTarget(e.target)) return;

	// Undo / redo: handled before the plain-key guard below.
	if ((e.ctrlKey || e.metaKey) && !e.altKey) {
		const k = e.key.toLowerCase();
		if (k === 'z') {
			e.preventDefault();
			if (e.shiftKey) editor.redo();
			else editor.undo();
			return;
		}
		if (k === 'y') {
			e.preventDefault();
			editor.redo();
			return;
		}
		if (k === 's') {
			e.preventDefault();
			void saveProject();
			return;
		}
		if (k === 'o') {
			e.preventDefault();
			void openProject();
			return;
		}
	}

	if (e.ctrlKey || e.metaKey || e.altKey) return;

	switch (e.key) {
		case ' ':
			e.preventDefault();
			editor.togglePlay();
			break;
		case 'ArrowLeft':
			e.preventDefault();
			// One frame; Shift = one second.
			if (e.shiftKey) editor.stepBy(-SEEK.stepSec);
			else editor.stepByFrames(-1);
			break;
		case 'ArrowRight':
			e.preventDefault();
			if (e.shiftKey) editor.stepBy(SEEK.stepSec);
			else editor.stepByFrames(1);
			break;
		case 'ArrowUp':
			e.preventDefault();
			editor.selectPrev();
			break;
		case 'ArrowDown':
			e.preventDefault();
			editor.selectNext();
			break;
		case ',':
		case '<':
			e.preventDefault();
			editor.stepByFrames(-1);
			break;
		case '.':
		case '>':
			e.preventDefault();
			editor.stepByFrames(1);
			break;
		case 'Home':
			e.preventDefault();
			editor.seek(0);
			break;
		case 'End':
			e.preventDefault();
			editor.seek(editor.totalDuration);
			break;
		case 's':
		case 'S':
			e.preventDefault();
			editor.splitAtPlayhead();
			break;
		case 't':
		case 'T':
			e.preventDefault();
			editor.addText();
			break;
		case 'Delete':
		case 'Backspace':
			e.preventDefault();
			editor.removeSelected();
			break;
	}
}
