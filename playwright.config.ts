import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1, // sequential — prevents Supabase race conditions
  fullyParallel: false,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/results', open: 'never' }],
  ],

  use: {
    baseURL:    'http://localhost:3000',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'off',
  },

  projects: [
    // ── Auth setup (runs once, saves cookie state) ──────────────────────────
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
    },

    // ── Desktop tests ────────────────────────────────────────────────────────
    {
      name:         'desktop',
      use:          { ...devices['Desktop Chrome'], storageState: 'tests/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore:   ['**/mobile.spec.ts'],
    },

    // ── Mobile tests ─────────────────────────────────────────────────────────
    {
      name:         'mobile',
      use:          { ...devices['iPhone 12'], storageState: 'tests/.auth/user.json' },
      dependencies: ['setup'],
      testMatch:    ['**/mobile.spec.ts'],
    },
  ],

  webServer: {
    command:             'npm run dev',
    url:                 'http://localhost:3000',
    reuseExistingServer: true,
    timeout:             60_000,
  },
})
