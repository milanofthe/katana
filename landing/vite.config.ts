import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Allow importing the shared UI library from the parent (../src/lib).
	server: { fs: { allow: ['..'] } }
});
