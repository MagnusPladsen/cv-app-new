import { expect, test } from '@playwright/test'

/**
 * One visual snapshot per template, taken from the proof sheet so every
 * template renders the same CV.
 *
 * A template that passes its unit tests can still have a broken sidebar, a
 * wrapped heading or an orphaned page. Only a picture catches that.
 *
 * These snapshots are position-sensitive. The proof sheet wraps, so adding or
 * reordering a template moves its neighbours to different rows, and a scaled
 * thumbnail at a fractional offset rounds its bottom edge by a pixel. That
 * shows up as "expected 239x437, received 239x438" for templates you did not
 * touch. Before updating those, prove it is positional rather than a real
 * regression: confirm the moved templates' own files are unchanged
 * (`git status`), and that every selector in any new stylesheet is scoped to
 * its own `.cv-doc--<id>` and so cannot reach them.
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
  'kontrast',
  'tidslinje',
  'portrett',
  'minimal',
  'ramme',
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

test('the preview reserves room for the whole sheet, not just its content box', async ({
  page,
}) => {
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--fjord)').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  // A CV long enough to run past one page.
  await page
    .getByLabel('Om meg', { exact: true })
    .fill(
      'Erfaren frontendutvikler som bygger tilgjengelige grensesnitt i TypeScript og React. '.repeat(
        30,
      ),
    )
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)

  const { docBottom, frameBottom } = await page.evaluate(() => {
    const doc = document.querySelector('[data-cv-preview] .cv-doc') as HTMLElement
    const wrapper = document.querySelector('[data-cv-preview]')!.parentElement as HTMLElement
    return {
      docBottom: doc.getBoundingClientRect().bottom,
      frameBottom: wrapper.getBoundingClientRect().bottom,
    }
  })

  // The wrapper is sized from the scaled sheet. Sizing it from the content box
  // instead leaves it short by both page margins and clips the page.
  expect(docBottom).toBeLessThanOrEqual(frameBottom + 2)
})
