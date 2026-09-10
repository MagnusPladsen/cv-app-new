import { expect, test } from '@playwright/test'

/**
 * Runs in Firefox and WebKit as well as Chromium.
 *
 * Every bug this file guards was invisible to a Chromium-only suite, and each
 * one broke something a user sees immediately:
 *
 * - `upgrade-insecure-requests` in the CSP made WebKit request every
 *   stylesheet over https on localhost, where nothing serves TLS. Safari
 *   rendered the whole site unstyled.
 * - `calc(100cqw / 794px)` is CSS Values 4. Firefox drops the declaration, so
 *   no scale applied and every template thumbnail rendered at full size inside
 *   a thumbnail-sized box.
 *
 * Deliberately free of screenshots: the visual suite stays Chromium-only, so
 * this adds coverage without three sets of snapshots to maintain.
 */

test('the stylesheet loads', async ({ page }) => {
  await page.goto('/no')
  await page.evaluate(() => document.fonts.ready)

  // The sand background is the cheapest proof that Tailwind arrived at all.
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(background, 'the page rendered with no CSS').toBe('rgb(250, 247, 242)')
})

test('no stylesheet request fails', async ({ page }) => {
  const failed: string[] = []
  page.on('requestfailed', (request) => {
    if (/\.css(\?|$)/.test(request.url())) failed.push(request.url())
  })

  await page.goto('/no', { waitUntil: 'networkidle' })
  expect(failed, `stylesheets failed to load:\n${failed.join('\n')}`).toEqual([])
})

test('template thumbnails scale to their cards', async ({ page }) => {
  await page.goto('/no/templates')
  await page.evaluate(() => document.fonts.ready)

  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll('li button .cv-doc')]
      .map((doc) => {
        const scaled = doc.parentElement as HTMLElement
        const card = scaled.parentElement as HTMLElement
        const matrix = new DOMMatrix(getComputedStyle(scaled).transform)
        return {
          content: Math.round(scaled.offsetWidth * matrix.a),
          card: card.clientWidth,
        }
      })
      .filter((entry) => entry.content > entry.card + 1).length,
  )

  expect(overflowing, 'thumbnails rendering wider than their cards').toBe(0)
})

test('the hero sheets scale to their cards', async ({ page }) => {
  await page.goto('/no')
  await page.evaluate(() => document.fonts.ready)

  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll('main section:first-of-type .cv-doc')]
      .map((doc) => {
        const scaled = doc.parentElement as HTMLElement
        const card = scaled.parentElement as HTMLElement
        const matrix = new DOMMatrix(getComputedStyle(scaled).transform)
        return { content: Math.round(scaled.offsetWidth * matrix.a), card: card.clientWidth }
      })
      .filter((entry) => entry.content > entry.card + 1).length,
  )

  expect(overflowing, 'hero sheets rendering wider than their cards').toBe(0)
})

test('no translation key renders raw', async ({ page }) => {
  // A missing key renders as `namespace.key`, which reads as a bug to a user
  // and is easy to introduce by naming the wrong namespace.
  for (const path of ['/no', '/no/templates', '/no/personvern', '/no/vilkar']) {
    await page.goto(path)
    const raw = await page.evaluate(
      () => document.body.innerText.match(/\b[a-z]+\.[a-zA-Z]+\b(?![\w./-])/g) ?? [],
    )
    const suspects = raw.filter((match) =>
      /^(gallery|editor|landing|auth|beta|nav|footer|legal|dashboard|meta|notFound)\./.test(match),
    )
    expect(suspects, `${path} renders raw keys: ${suspects.join(', ')}`).toEqual([])
  }
})

test('the measured scale takes over from the CSS one', async ({ page }) => {
  // The CSS fallback uses tan(atan2(...)), which not every engine supports -
  // a Firefox-based browser rendered full-size A4 pages inside thumbnails
  // even after that was added. ScaledDocument measures instead and overrides
  // it, and measuring cannot be unsupported. If this ever reads as a CSS
  // function rather than a number, the measurement stopped running and the
  // app is back to depending on engine support.
  await page.goto('/no/templates')
  await page.evaluate(() => document.fonts.ready)

  const transform = await page.locator('li button span[aria-hidden]').first().evaluate(
    (node) => node.getAttribute('style')?.match(/transform:[^;]*/)?.[0] ?? '',
  )

  expect(transform).toMatch(/scale\(\d*\.?\d+\)/)
})

test('an indexable page has exactly one h1', async ({ page }) => {
  // Every rendered CV names the person in an <h1>, which is right when the CV
  // is the document. In a thumbnail it is not: aria-hidden keeps it from
  // screen readers, but search engines ignore aria-hidden, so the templates
  // page offered a crawler fourteen <h1>Ingrid Bjørnstad Halvorsen</h1> and
  // an invitation to decide the page is about her.
  for (const path of ['/no', '/no/templates', '/no/personvern', '/no/vilkar']) {
    await page.goto(path)
    const headings = await page.locator('h1').allTextContents()
    expect(headings, `${path} has ${headings.length} h1 elements`).toHaveLength(1)
  }
})

test('the editor preview keeps the name as a real heading', async ({ page }) => {
  // The other half of the same rule: in the document being edited, the name
  // is the title of the page and must stay an h1.
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await page.waitForURL(/\/no\/cv\/.+/)
  await page.getByLabel(/Fornavn/).first().fill('Ola')

  await expect(page.locator('[data-cv-preview] h1.cv-header__name')).toHaveCount(1)
})

test('the background layers line up', async ({ page }) => {
  // background-image, -size, -repeat and -attachment are positional lists.
  // A layer added to one and not the others silently shifts every value after
  // it, and --page-glow expands to two layers, so this can only be counted
  // once the browser has resolved it.
  await page.goto('/no')

  const layers = await page.evaluate(() => {
    const style = getComputedStyle(document.body)
    // Depth-aware: rgba() and gradient stops are full of commas, so a plain
    // split counts nine layers where there are three.
    const count = (value: string) => {
      let depth = 0
      let layers = 1
      for (const character of value) {
        if (character === '(') depth += 1
        else if (character === ')') depth -= 1
        else if (character === ',' && depth === 0) layers += 1
      }
      return layers
    }
    return {
      image: count(style.backgroundImage),
      size: count(style.backgroundSize),
      repeat: count(style.backgroundRepeat),
      attachment: count(style.backgroundAttachment),
    }
  })

  const counts = Object.values(layers)
  expect(new Set(counts).size, `layer counts differ: ${JSON.stringify(layers)}`).toBe(1)
  expect(layers.image, 'expected a texture plus two wash layers').toBe(3)
})
