import { defineConfig } from '@playwright/test';

// BASE_URL wijst naar de preview van de PR (pipeline); zonder BASE_URL bouwt en start Playwright de app lokaal.
const preview = process.env['BASE_URL'];

export default defineConfig({
	testDir: 'tests/factory/e2e',
	use: { baseURL: preview ?? 'http://localhost:3100' },
	webServer: preview
		? undefined
		: {
				command: 'npm run build && PORT=3100 DB_PATH=:memory: node server/main.ts',
				url: 'http://localhost:3100',
				reuseExistingServer: true,
				timeout: 120_000,
			},
});
