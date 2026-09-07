import { expect, test } from '@playwright/test'

/**
 * One visual snapshot per template, taken from the proof sheet so every
 * template renders the same CV.
 *
 * A template that passes its unit tests can still have a broken sidebar, a
 * wrapped heading or an orphaned page. Only a picture catches that.
 */

const TEMPLATE_IDS = [
  'oslo',
  'bergen',
  'kompakt',
  'fjord',
  'nord',
  'trondheim',
  'aurora',
  'akademisk',
  'studio',
] as const

test.beforeEach(async ({ page }) => {
  await page.goto('/no/preview')
  // Web fonts change metrics, so wait for them before measuring or shooting.
  await page.evaluate(() => document.fonts.ready)
})

test('the proof sheet renders every registered template', async ({ page }) => {
  await expect(page.locator('.cv-doc')).toHaveCount(TEMPLATE_IDS.length)
})

/**
 * Pixel snapshots are baselined per platform (…-chromium-darwin.png), so a CI
 * runner on Linux has no baseline to compare against. CI sets SKIP_VISUAL and
 * relies on template-signatures.spec.ts, which asserts the same regressions
 * structurally and runs anywhere.
 */
const skipVisual = Boolean(process.env.SKIP_VISUAL)

for (const id of TEMPLATE_IDS) {
  test(`${id} renders the demo CV as expected`, async ({ page }) => {
    test.skip(skipVisual, 'pixel baselines are platform-specific')
    const doc = page.locator(`.cv-doc--${id}`)
    await expect(doc).toBeVisible()
    await expect(doc).toHaveScreenshot(`template-${id}.png`)
  })
}

test('every template is exactly A4 wide', async ({ page }) => {
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll('.cv-doc')].map((node) => (node as HTMLElement).offsetWidth),
  )

  // 210mm at the 96dpi CSS reference resolution.
  for (const width of widths) expect(width).toBe(794)
})

test('no template leaves content overflowing the page width', async ({ page }) => {
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll('.cv-doc')]
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => node.className),
  )

  expect(overflowing).toEqual([])
})
