import { expect, test } from '@playwright/test'

/**
 * Mobile-first checks on a real phone viewport.
 *
 * The editor is the page most at risk: it carries a template strip, a section
 * list, forms and a preview, and any of them can overflow a 390px screen.
 */
const PHONE_WIDTH = 390

// The iPhone 13 viewport, without the device preset: that preset also selects
// WebKit, and this suite runs on the Chromium project.
test.use({
  viewport: { width: PHONE_WIDTH, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})

async function horizontalOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test('the landing page fits the screen', async ({ page }) => {
  await page.goto('/no')
  await page.evaluate(() => document.fonts.ready)
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
})

test('the gallery fits, and shows more than one template per row', async ({ page }) => {
  await page.goto('/no/templates')
  await page.evaluate(() => document.fonts.ready)

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

  const cardWidth = await page.evaluate(
    () => document.querySelector('li button[aria-label]')!.getBoundingClientRect().width,
  )
  // Two columns on a phone: one huge card per row makes browsing nine templates
  // an endless scroll.
  expect(cardWidth).toBeLessThan(PHONE_WIDTH / 2)
})

test('the filter chips scroll rather than wrapping into a wall', async ({ page }) => {
  await page.goto('/no/templates')

  const { scrollWidth, clientWidth, rows } = await page.evaluate(() => {
    const strip = document.querySelector('button[aria-pressed]')!.parentElement!
    const tops = new Set(
      [...strip.children].map((child) => Math.round(child.getBoundingClientRect().top)),
    )
    return {
      scrollWidth: strip.scrollWidth,
      clientWidth: strip.parentElement!.clientWidth,
      rows: tops.size,
    }
  })

  expect(rows).toBe(1)
  expect(scrollWidth).toBeGreaterThan(clientWidth)
})

test('the editor fits, with the template strip reachable', async ({ page }) => {
  await page.goto('/no/templates')
  await page.getByRole('button', { name: 'Bergen' }).click()
  await page.waitForURL(/\/no\/cv\/.+/)
  await page.evaluate(() => document.fonts.ready)

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

  // The strip is the point: switching template must not be hidden on a phone.
  await expect(page.getByRole('button', { name: 'Fjord' })).toBeVisible()
})

test('the editor shows a preview button rather than a side-by-side preview', async ({ page }) => {
  await page.goto('/no/templates')
  await page.getByRole('button', { name: 'Oslo' }).click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await expect(page.getByRole('button', { name: 'Forhåndsvis' })).toBeVisible()

  // Only the strip's thumbnails; the full preview lives in the sheet.
  const inPreview = await page.locator('[data-cv-preview] .cv-doc').count()
  expect(inPreview).toBe(0)
})

test('opening the preview sheet mounts exactly one CV to export', async ({ page }) => {
  await page.goto('/no/templates')
  await page.getByRole('button', { name: 'Oslo' }).click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await page.getByRole('button', { name: 'Forhåndsvis' }).click()
  await expect(page.locator('[data-cv-preview] .cv-doc')).toHaveCount(1)
})

test('the header fits a phone with the account link showing', async ({ page }) => {
  // The widest the header ever gets: logo, beta badge, nav, account link and
  // the locale switcher. It overflowed by 66px on a 375px screen the day the
  // account link was added, and nothing caught it, because the suite used to
  // run with auth switched off.
  await page.goto('/no/cv')
  await page.evaluate(() => document.fonts.ready)

  await expect(page.getByRole('link', { name: 'Logg inn' })).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
})
