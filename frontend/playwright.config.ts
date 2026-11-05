import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4201',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command:
        'java -jar ../backend/target/student-management-1.0.0.jar --server.port=8081 --spring.datasource.url=jdbc:h2:mem:e2e',
      url: 'http://127.0.0.1:8081/api/courses',
      timeout: 120000,
    },
    {
      command: 'npx ng serve --host 127.0.0.1 --port 4201 --proxy-config proxy.e2e.json',
      url: 'http://127.0.0.1:4201',
      timeout: 120000,
    },
  ],
});
