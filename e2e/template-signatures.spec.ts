import { expect, test } from '@playwright/test'

/**
 * Structural assertions on each template's defining feature.
 *
 * A pixel budget is blunt: the accent bar that defines Bergen is only a few
 * hundred pixels, close to the noise floor. These assertions name what each
 * template is actually for, so deleting it fails loudly and for a readable
 * reason rather than as an unexplained image diff.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/no/preview')
  await page.evaluate(() => document.fonts.ready)
})

async function styleOf(
  page: import('@playwright/test').Page,
  selector: string,
  property: string,
) {
  return page.evaluate(
    ([sel, prop]) => {
      const node = document.querySelector(sel as string)
      if (!node) throw new Error(`no element for ${sel}`)
      return getComputedStyle(node).getPropertyValue(prop as string)
    },
    [selector, property] as const,
  )
}

test('Oslo renders skill levels as words, never as a bar', async ({ page }) => {
  const bars = await page.locator('.cv-doc--oslo .cv-bar').count()
  const words = await page.locator('.cv-doc--oslo .cv-item__level').count()

  expect(bars).toBe(0)
  expect(words).toBeGreaterThan(0)
})

test('Bergen leads its section titles with an accent bar', async ({ page }) => {
  const width = await styleOf(page, '.cv-doc--bergen .cv-section__title', 'border-left-width')
  expect(Number.parseFloat(width)).toBeGreaterThan(1)
})

test('Kompakt fits the demo CV on a single page', async ({ page }) => {
  const height = await page.evaluate(
    () => (document.querySelector('.cv-doc--kompakt') as HTMLElement).offsetHeight,
  )
  expect(height).toBeLessThanOrEqual(1125)
})

test('Fjord and Studio tint their sidebar', async ({ page }) => {
  for (const id of ['fjord', 'studio']) {
    const background = await styleOf(page, `.cv-doc--${id} .cv-shell__aside`, 'background-color')
    expect(background, `${id} sidebar is untinted`).not.toBe('rgba(0, 0, 0, 0)')
  }
})

test('Nord puts its sidebar after the main column', async ({ page }) => {
  const asideIsLast = await page.evaluate(() => {
    const shell = document.querySelector('.cv-doc--nord .cv-shell--sidebar')
    return shell?.lastElementChild?.classList.contains('cv-shell__aside') ?? false
  })
  expect(asideIsLast).toBe(true)
})

test('the band templates paint readable ink on their accent', async ({ page }) => {
  for (const id of ['trondheim', 'aurora']) {
    const band = page.locator(`.cv-doc--${id} .cv-band`)
    await expect(band, `${id} has no accent band`).toBeVisible()

    const name = await styleOf(page, `.cv-doc--${id} .cv-band .cv-header__name`, 'color')
    // pickInk chooses white on these dark accents; the point is that it is not
    // the default near-black ink, which would be unreadable on the band.
    expect(name, `${id} band ink was not derived from the accent`).toBe('rgb(255, 255, 255)')
  }
})

test('Akademisk sets its serif and puts the portrait above the name', async ({ page }) => {
  const font = await styleOf(page, '.cv-doc--akademisk .cv-header__name', 'font-family')
  expect(font).toContain('Libre Baskerville')

  const order = await styleOf(page, '.cv-doc--akademisk .cv-header__photo', 'order')
  expect(order).toBe('-1')
})

test('Studio renders its summary as a lead, with no section title', async ({ page }) => {
  await expect(page.locator('.cv-doc--studio .cv-lead')).toBeVisible()
  await expect(page.locator('.cv-doc--studio .cv-lead .cv-section__title')).toHaveCount(0)
})

test('no sidebar template puts a long-form section in the narrow column', async ({ page }) => {
  const offenders = await page.evaluate(() =>
    [...document.querySelectorAll('.cv-shell__aside')].flatMap((aside) =>
      [...aside.querySelectorAll('.cv-entry__role')].map((node) => node.textContent ?? ''),
    ),
  )

  // Entry-bearing sections carry names long enough to wrap to one word per line
  // in a ~52mm column. SIDEBAR_SAFE_SECTIONS is what keeps this empty.
  expect(offenders).toEqual([])
})
