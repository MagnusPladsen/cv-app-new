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

test('Bergen sets its section headings in a left gutter beside the content', async ({ page }) => {
  const columns = await styleOf(page, '.cv-doc--bergen .cv-section', 'grid-template-columns')
  // Two tracks: the heading gutter and the body.
  expect(columns.split(' ').length).toBe(2)
})

test('Oslo bands its section headings rather than ruling them', async ({ page }) => {
  const background = await styleOf(page, '.cv-doc--oslo .cv-section__title', 'background-color')
  const align = await styleOf(page, '.cv-doc--oslo .cv-section__title', 'text-align')
  expect(background).not.toBe('rgba(0, 0, 0, 0)')
  expect(align).toBe('center')
})

test('Kompakt puts dates in their own left gutter', async ({ page }) => {
  const columns = await styleOf(page, '.cv-doc--kompakt .cv-entry__head', 'grid-template-columns')
  expect(columns.split(' ').length).toBe(2)

  const order = await styleOf(page, '.cv-doc--kompakt .cv-entry__dates', 'order')
  expect(order).toBe('-1')
})

test('Fjord runs a full-height colour column to the paper edge', async ({ page }) => {
  const reaches = await page.evaluate(() => {
    const doc = document.querySelector('.cv-doc--fjord') as HTMLElement
    const aside = doc.querySelector('.cv-shell__aside') as HTMLElement
    const docBox = doc.getBoundingClientRect()
    const asideBox = aside.getBoundingClientRect()
    return {
      left: Math.round(asideBox.left - docBox.left),
      coversHeight: asideBox.height >= docBox.height - 2,
    }
  })

  // Flush to the left edge and the full height: a tinted card that stops with
  // its content is the thing this template exists to avoid.
  expect(reaches.left).toBeLessThanOrEqual(1)
  expect(reaches.coversHeight).toBe(true)
})

test('Kompakt is materially denser than the roomiest template', async ({ page }) => {
  const { kompakt, akademisk } = await page.evaluate(() => ({
    kompakt: (document.querySelector('.cv-doc--kompakt') as HTMLElement).offsetHeight,
    akademisk: (document.querySelector('.cv-doc--akademisk') as HTMLElement).offsetHeight,
  }))

  // Density is a relative claim, not an absolute one: the demo CV deliberately
  // enables every section, which no real dense CV would.
  expect(kompakt).toBeLessThan(akademisk * 0.75)
})

test('Kompakt stays above a readable type size while being dense', async ({ page }) => {
  const size = await styleOf(page, '.cv-doc--kompakt', 'font-size')
  // Density must not be bought below roughly 9pt, where print stops being kind.
  expect(Number.parseFloat(size)).toBeGreaterThanOrEqual(12)
})

test('Studio tints its sidebar', async ({ page }) => {
  const background = await styleOf(page, '.cv-doc--studio .cv-shell__aside', 'background-color')
  expect(background).not.toBe('rgba(0, 0, 0, 0)')
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
  expect(font).toContain('EB Garamond')

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

test('every template renders in the CV font it was designed around', async ({ page }) => {
  const expected: Record<string, string> = {
    oslo: 'Gelasio',
    bergen: 'Lato',
    kompakt: 'Open Sans',
    fjord: 'EB Garamond',
    nord: 'Gelasio',
    trondheim: 'Lato',
    aurora: 'Inter Tight',
    akademisk: 'EB Garamond',
    studio: 'Inter Tight',
  }

  for (const [id, family] of Object.entries(expected)) {
    const font = await styleOf(page, `.cv-doc--${id} .cv-header__name`, 'font-family')
    // A missing @font-face degrades silently to a system font, and only in the
    // PDF, so assert the family actually resolved.
    expect(font, `${id} is not rendering in ${family}`).toContain(family)
  }
})

test('Kontrast fills its sidebar with the accent and runs it the full column height', async ({
  page,
}) => {
  const background = await styleOf(page, '.cv-doc--kontrast .cv-shell__aside', 'background-color')
  expect(background).not.toBe('rgba(0, 0, 0, 0)')

  // Left at the base flex-start the panel stops where its content ends,
  // leaving a block of white below it that reads as a mistake.
  const heights = await page.evaluate(() => {
    const aside = document.querySelector('.cv-doc--kontrast .cv-shell__aside') as HTMLElement
    const main = document.querySelector('.cv-doc--kontrast .cv-shell__main') as HTMLElement
    return { aside: aside.offsetHeight, main: main.offsetHeight }
  })
  expect(heights.aside).toBeGreaterThanOrEqual(heights.main - 1)
})

test('Kontrast keeps the reading column black on white, whatever the accent', async ({ page }) => {
  const colour = await styleOf(page, '.cv-doc--kontrast .cv-shell__main', 'color')
  expect(colour).toBe('rgb(17, 17, 17)')
})

test('Tidslinje rails its entries, with the rail stopping at the last dot', async ({ page }) => {
  const rail = await styleOf(page, '.cv-doc--tidslinje .cv-entry', 'border-left-width')
  expect(parseFloat(rail)).toBeGreaterThan(0)

  const dot = await page.evaluate(() => {
    const entry = document.querySelector('.cv-doc--tidslinje .cv-entry')!
    const before = getComputedStyle(entry, '::before')
    const after = getComputedStyle(
      document.querySelector('.cv-doc--tidslinje .cv-entry:last-child')!,
      '::after',
    )
    return {
      radius: before.borderTopLeftRadius,
      dotColour: before.backgroundColor,
      // The mask that ends the rail must be the paper colour, not the rule
      // colour: painting a grey stub over the dot is what made it look broken.
      maskColour: after.backgroundColor,
    }
  })
  expect(dot.radius).toBe('50%')
  expect(dot.dotColour).not.toBe('rgba(0, 0, 0, 0)')
  expect(dot.maskColour).toBe('rgb(255, 255, 255)')
})

test('Portrett leads with an oversized portrait, ringed in the accent', async ({ page }) => {
  const photo = await page.evaluate(() => {
    const own = document.querySelector<HTMLElement>('.cv-doc--portrett .cv-header__photo')!
    // Oslo carries the default header photo, so it is the baseline "ordinary"
    // size a photo-led template has to beat.
    const baseline = document.querySelector<HTMLElement>('.cv-doc--oslo .cv-header__photo')!
    const style = getComputedStyle(own)
    return {
      radius: style.borderRadius,
      ring: parseFloat(style.borderTopWidth),
      width: own.offsetWidth,
      baseline: baseline.offsetWidth,
    }
  })
  expect(photo.radius).toBe('50%')
  expect(photo.ring).toBeGreaterThan(0)
  expect(photo.width).toBeGreaterThan(photo.baseline)
})

test('Minimal uses no rules and no bars, which is what makes it parser-safe', async ({ page }) => {
  const rule = await styleOf(page, '.cv-doc--minimal .cv-section__title', 'border-bottom-width')
  expect(parseFloat(rule)).toBe(0)
  expect(await page.locator('.cv-doc--minimal .cv-bar').count()).toBe(0)
})

test('Ramme boxes its header and marks each heading with a square', async ({ page }) => {
  const border = await styleOf(page, '.cv-doc--ramme .cv-header', 'border-top-width')
  expect(parseFloat(border)).toBeGreaterThan(0)

  const marker = await page.evaluate(() => {
    const title = document.querySelector('.cv-doc--ramme .cv-section__title')!
    const before = getComputedStyle(title, '::before')
    return { width: parseFloat(before.width), radius: before.borderTopLeftRadius }
  })
  expect(marker.width).toBeGreaterThan(0)
  // A square, not a dot: that is the difference from Tidslinje.
  expect(marker.radius).toBe('0px')
})
