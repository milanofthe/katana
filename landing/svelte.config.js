import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Fully prerendered static site (no SPA fallback needed for one page).
		adapter: adapter(),
		// Reuse the editor's UI library + design tokens.
		alias: {
			$ui: '../src/lib'
		}
	}
};

export default config;
