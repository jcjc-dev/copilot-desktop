import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	build: {
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/marked') ||
						id.includes('node_modules/dompurify') ||
						id.includes('node_modules/highlight.js')) {
						return 'vendor-markdown';
					}
				}
			}
		}
	}
});
