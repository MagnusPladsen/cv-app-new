import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * Visual and print regression for the CV templates.
 *
 * Vitest covers logic; this covers what logic cannot see — layout, fonts, page
 * breaks and the actual PDF. Nine templates across four shells is more CSS than
 * anyone can review by eye on every change.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    // A fixed viewport, or every snapshot is a diff.
    viewport: { width: 1440, height: 1000 },
  },

  expect: {
    toHaveScreenshot: {
      // An absolute budget, not a ratio. A ratio scales with the image, so on a
      // full A4 page 2% is ~24,000 pixels - enough to hide an entire deleted
      // border. This is sized to absorb font anti-aliasing and nothing more.
      maxDiffPixels: 120,
    },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // Production build: dev-mode HMR overlays and timing make snapshots flaky.
    command: `bun run build && bun run start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
