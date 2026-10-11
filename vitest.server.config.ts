import { defineConfig } from 'vitest/config';

// Tests van de Node-server; de Angular-tests draaien via `ng test`.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['server/**/*.test.ts', 'tests/factory/server/**/*.test.ts'],
	},
});
