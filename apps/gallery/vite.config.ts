import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import kit from './kit.config.js';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(kit)],
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		environment: 'node',
		globals: true,
	},
});
