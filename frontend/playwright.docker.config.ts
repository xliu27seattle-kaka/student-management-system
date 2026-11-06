import { defineConfig } from '@playwright/test';
import localConfig from './playwright.config';

// Run the same workflows against a separately started, fresh verification stack.
// The suite creates and deletes test records; do not use an existing data volume.
export default defineConfig({
  ...localConfig,
  use: { ...localConfig.use, baseURL: 'http://127.0.0.1:4200' },
  webServer: undefined,
  outputDir: 'test-results/docker',
});
