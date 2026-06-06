// Native file drag-and-drop -> import. Tauri delivers real file paths (unlike
// HTML5 DnD), which we feed straight into the same import path used by the
// dialog. Drives editor.dropActive for the drop overlay.
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { editor } from './store.svelte';
import { importPaths } from './import';

/** Listen for file drops on the window. Returns an unlisten function. */
export async function setupDragDrop(): Promise<() => void> {
	const webview = getCurrentWebview();
	return webview.onDragDropEvent((event) => {
		const payload = event.payload;
		if (payload.type === 'enter' || payload.type === 'over') {
			editor.dropActive = true;
		} else if (payload.type === 'leave') {
			editor.dropActive = false;
		} else if (payload.type === 'drop') {
			editor.dropActive = false;
			void importPaths(payload.paths);
		}
	});
}
