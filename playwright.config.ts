import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    workers: 1,
    use: { baseURL: 'http://127.0.0.1:4317', serviceWorkers: 'block' },
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 4317',
        url: 'http://127.0.0.1:4317',
        env: { GEMINI_API_KEY: 'ui-test-only', VITE_BACKEND_URL: '/test-api' },
        reuseExistingServer: !process.env.CI,
    },
});

