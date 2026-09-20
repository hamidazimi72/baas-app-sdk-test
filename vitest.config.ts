import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const alias = {
	'@': fileURLToPath(new URL('./src', import.meta.url)),
	'@root': fileURLToPath(new URL('.', import.meta.url)),
};

// Stage 1 — UNIT tests only: pure logic (services, adapters, stores, lib, helpers) in a `node` env.
// Component tests (Stage 2) will add a second jsdom `project` once the DOM testing deps are installed
// — see `progress/test-structure.md`. Tests live under `src/tests/` (mirror of `src/`).
export default defineConfig({
	resolve: { alias },
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/tests/setup/global.ts'],
		include: ['src/tests/unit/**/*.{test,spec}.{ts,tsx}'],
	},
});
