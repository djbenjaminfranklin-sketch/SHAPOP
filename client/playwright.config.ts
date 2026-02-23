import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const authFile = path.join(__dirname, 'e2e/.auth/user.json')

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'unauthenticated',
      testDir: './e2e',
      testIgnore: ['**/auth/**'],
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        storageState: {
          cookies: [],
          origins: [{
            origin: 'http://localhost:5173',
            localStorage: [{ name: 'shapop_splash_seen', value: '1' }],
          }],
        },
      },
    },
    {
      name: 'setup',
      testDir: './e2e/auth',
      testMatch: 'setup.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        storageState: {
          cookies: [],
          origins: [{
            origin: 'http://localhost:5173',
            localStorage: [{ name: 'shapop_splash_seen', value: '1' }],
          }],
        },
      },
    },
    {
      name: 'authenticated',
      testDir: './e2e/auth',
      testIgnore: ['setup.spec.ts'],
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        storageState: authFile,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
