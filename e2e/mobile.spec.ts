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

/**
 * Picks a template card by the template it renders, not by its display name.
 * Names are branding and change; the `cv-doc--<id>` class is the identity.
 */
function templateCard(page: import('@playwright/test').Page, id: string) {
  return page.locator(`button:has(.cv-doc--${id})`)
}

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
  await templateCard(page, 'bergen').click()
  await page.waitForURL(/\/no\/cv\/.+/)
  await page.evaluate(() => document.fonts.ready)

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

  // The strip is the point: switching template must not be hidden on a phone.
  // Which templates it shows depends on gallery order and on keeping the
  // active one visible, so this asserts the affordance rather than any
  // particular template: alternatives on screen, and a way to the rest.
  const strip = page.locator('button:has(.cv-doc)')
  expect(await strip.count()).toBeGreaterThan(1)
  await expect(page.getByRole('button', { name: /maler til$/ })).toBeVisible()
})

test('the editor shows a preview button rather than a side-by-side preview', async ({ page }) => {
  await page.goto('/no/templates')
  await templateCard(page, 'oslo').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await expect(page.getByRole('button', { name: 'Forhåndsvis' })).toBeVisible()

  // Only the strip's thumbnails; the full preview lives in the sheet.
  const inPreview = await page.locator('[data-cv-preview] .cv-doc').count()
  expect(inPreview).toBe(0)
})

test('opening the preview sheet mounts exactly one CV to export', async ({ page }) => {
  await page.goto('/no/templates')
  await templateCard(page, 'oslo').click()
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

test('the editor offers exactly one download button', async ({ page }) => {
  // The toolbar button used to render at every width, so on a phone it sat
  // above a second, identical one in the fixed bottom bar: two controls with
  // the same accessible name, and two places to look for the same thing.
  await page.goto('/no/templates')
  await templateCard(page, 'oslo').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await expect(page.getByRole('button', { name: 'Last ned PDF' })).toHaveCount(1)
})

test('a dialog opened from the bottom bar is laid out against the viewport', async ({ page }) => {
  // The bar uses backdrop-blur, which makes it the containing block for any
  // `position: fixed` descendant. A dialog rendered inside it was laid out
  // against a 64px-tall bar, putting its buttons below the bottom of the
  // screen. Every dialog is portalled to <body> for exactly this reason.
  //
  // Deliberately a tablet width. The bottom bar exists below lg (1024px), but
  // below sm (640px) the overlay uses items-end, which pins the dialog to the
  // bottom of that 64px box and lands it on screen by luck. Only between the
  // two does items-center centre it inside the bar and push it off. Testing
  // this at phone width passes with the bug present.
  await page.setViewportSize({ width: 900, height: 800 })
  await page.goto('/no/templates')
  await templateCard(page, 'oslo').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await page.getByRole('button', { name: 'Last ned PDF' }).click()
  const dialog = page.getByRole('dialog').first()
  await expect(dialog).toBeVisible()

  const box = (await dialog.boundingBox())!
  const height = page.viewportSize()!.height
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(height)
})

test('no header link wraps onto a second line', async ({ page }) => {
  // Overflow was already asserted, and wrapping produces none - so the header
  // passed every check while "Mine CV-er" sat on two lines on a phone.
  await page.goto('/no/cv')
  await page.evaluate(() => document.fonts.ready)

  const wrapped = await page.evaluate(() => {
    const nav = document.querySelector('header nav')!
    return [...nav.querySelectorAll('a')]
      .filter((link) => link.offsetParent !== null)
      .filter((link) => {
        const lineHeight = parseFloat(getComputedStyle(link).lineHeight)
        const padding =
          parseFloat(getComputedStyle(link).paddingTop) +
          parseFloat(getComputedStyle(link).paddingBottom)
        return link.offsetHeight > lineHeight + padding + 2
      })
      .map((link) => link.textContent?.trim())
  })

  expect(wrapped, `header links wrapping: ${wrapped.join(', ')}`).toEqual([])
})
