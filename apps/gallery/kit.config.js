import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { projectRunes } from '@yesid/config/svelte/project-runes.js';

/** @type {import('@sveltejs/kit/vite').Config} */
export default {
	compilerOptions: { runes: projectRunes(import.meta.dirname) },
	preprocess: vitePreprocess(),
	adapter: adapter({ fallback: undefined }),
};
