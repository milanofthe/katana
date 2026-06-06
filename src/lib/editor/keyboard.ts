// Global editor keyboard shortcuts. Wired via <svelte:window onkeydown> on the
// editor page. Modifier combinations (Ctrl/Cmd/Alt) are left to the OS/browser.
import { editor } from './store.svelte';
import { SEEK } from '$lib/constants';

function isTypingTarget(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	if (!el) return false;
	return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function handleEditorKeydown(e: KeyboardEvent): void {
	if (isTypingTarget(e.target)) return;
	if (e.ctrlKey || e.metaKey || e.altKey) return;

	switch (e.key) {
		case ' ':
			e.preventDefault();
			editor.togglePlay();
			break;
		case 'ArrowLeft':
			e.preventDefault();
			editor.stepBy(e.shiftKey ? -SEEK.bigStepSec : -SEEK.stepSec);
			break;
		case 'ArrowRight':
			e.preventDefault();
			editor.stepBy(e.shiftKey ? SEEK.bigStepSec : SEEK.stepSec);
			break;
		case 'ArrowUp':
			e.preventDefault();
			editor.selectPrev();
			break;
		case 'ArrowDown':
			e.preventDefault();
			editor.selectNext();
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
		case 'Delete':
		case 'Backspace':
			e.preventDefault();
			editor.removeSelected();
			break;
	}
}
