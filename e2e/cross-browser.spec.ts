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
