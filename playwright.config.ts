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

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Firefox and WebKit run the cross-browser smoke spec only. The visual
    // suite stays Chromium-only, so this buys engine coverage without three
    // sets of snapshots to keep in step. Both engines have already caught a
    // bug Chromium could not see - see e2e/cross-browser.spec.ts.
    {
      name: 'firefox',
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    // Production build: dev-mode HMR overlays and timing make snapshots flaky.
    // Not `bun run start`, whose script already pins a port; the flag would
    // then be passed twice.
    command: `bun run build && bunx next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Auth is switched *on* but signed *out*, which is the state the header
      // is widest in and the one the suite could otherwise never see: with no
      // credentials the account link does not render at all, so a header that
      // overflows a phone once it appears would go unnoticed.
      //
      // The host is deliberately unroutable. Nothing here signs in, and a
      // signed-out session is read from storage without a network call, so no
      // request is ever made to it.
      NEXT_PUBLIC_SUPABASE_URL: 'https://e2e-unroutable.invalid',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e',
      NEXT_PUBLIC_AUTH_PROVIDERS: 'google,apple',
    },
  },
})
