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

test('every template still loads, and fills its card', async ({ page }) => {
  // The cards are captured stills now, so the failure mode moved: a missing
  // or misnamed file is a blank white card rather than an overflowing CV, and
  // a broken <img> reports no error anywhere else.
  await page.goto('/no/templates')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLImageElement>('li button img')].every(
        (image) => image.complete,
      ),
    undefined,
    // Eighteen stills, optimised on first request. One width each now that
    // `sizes` is fixed rather than a list of viewport fractions - which was
    // the difference between this finishing in seconds and timing out.
    { timeout: 20_000 },
  )

  const cards = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('li button img')].map((image) => ({
      src: image.getAttribute('src') ?? '',
      painted: image.naturalWidth > 0,
      // object-cover cannot overflow, but a card that lost its aspect ratio
      // would still crop the sheet; compare the boxes rather than trusting it.
      width: image.offsetWidth,
      card: (image.closest('button') as HTMLElement).clientWidth,
    })),
  )

  expect(cards.length).toBeGreaterThanOrEqual(12)
  expect(
    cards.filter((card) => !card.painted).map((card) => card.src),
    'stills that did not load',
  ).toEqual([])
  expect(
    cards.filter((card) => Math.abs(card.width - card.card) > 1).map((card) => card.src),
    'stills not filling their card',
  ).toEqual([])
})

test('the hero sheets load', async ({ page }) => {
  await page.goto('/no')
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('main section:first-of-type img')].every(
      (image) => image.complete,
    ),
  )

  const broken = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('main section:first-of-type img')]
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.getAttribute('src') ?? ''),
  )

  expect(broken, 'hero sheets that did not load').toEqual([])
})

test('no translation key renders raw', async ({ page }) => {
  // A missing key renders as `namespace.key`, which reads as a bug to a user
  // and is easy to introduce by naming the wrong namespace.
  for (const path of ['/no', '/no/templates', '/no/personvern', '/no/vilkar']) {
    // Text, not pictures: waiting for eighteen optimised stills to finish
    // downloading has nothing to do with whether a translation key resolved.
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const raw = await page.evaluate(
      () => document.body.innerText.match(/\b[a-z]+\.[a-zA-Z]+\b(?![\w./-])/g) ?? [],
    )
    const suspects = raw.filter((match) =>
      /^(gallery|editor|landing|auth|beta|nav|footer|legal|dashboard|meta|notFound)\./.test(match),
    )
    expect(suspects, `${path} renders raw keys: ${suspects.join(', ')}`).toEqual([])
  }
})

test('an indexable page has exactly one h1', async ({ page }) => {
  // Every rendered CV names the person in an <h1>, which is right when the CV
  // is the document. In a thumbnail it is not: aria-hidden keeps it from
  // screen readers, but search engines ignore aria-hidden, so the templates
  // page offered a crawler fourteen <h1>Ingrid Bjørnstad Halvorsen</h1> and
  // an invitation to decide the page is about her.
  for (const path of ['/no', '/no/templates', '/no/personvern', '/no/vilkar']) {
    // Text, not pictures: waiting for eighteen optimised stills to finish
    // downloading has nothing to do with whether a translation key resolved.
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const headings = await page.locator('h1').allTextContents()
    expect(headings, `${path} has ${headings.length} h1 elements`).toHaveLength(1)
  }
})

test('the editor preview keeps the name as a real heading', async ({ page }) => {
  // The other half of the same rule: in the document being edited, the name
  // is the title of the page and must stay an h1.
  await page.goto('/no/templates')
  await page.locator('button[data-template="oslo"]').click()
  await page.waitForURL(/\/no\/cv\/.+/)
  await page.getByLabel(/Fornavn/).first().fill('Ola')

  await expect(page.locator('[data-cv-preview] h1.cv-header__name')).toHaveCount(1)
})

test('the background is the wash and nothing else', async ({ page }) => {
  // --page-glow expands to two gradients, so the layer count can only be
  // taken once the browser has resolved the custom property. A texture layer
  // used to ride on top of it; if one comes back, the single-valued repeat
  // and attachment below stop covering every layer.
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
    // Same depth-aware walk, but returning the entries: a single declared
    // value covers every layer, and engines disagree about whether the
    // computed list repeats it or keeps it short. What matters is that the
    // values are uniform, not how many times the browser wrote them down.
    const entries = (value: string) => {
      const parts: string[] = []
      let depth = 0
      let current = ''
      for (const character of value) {
        if (character === '(') depth += 1
        else if (character === ')') depth -= 1
        if (character === ',' && depth === 0) {
          parts.push(current.trim())
          current = ''
        } else current += character
      }
      parts.push(current.trim())
      return parts
    }
    return {
      image: count(style.backgroundImage),
      repeat: entries(style.backgroundRepeat),
      attachment: entries(style.backgroundAttachment),
    }
  })

  expect(layers.image, `expected the two wash layers only: ${layers.image}`).toBe(2)
  expect(new Set(layers.repeat), 'every layer must be no-repeat').toEqual(new Set(['no-repeat']))
  expect(new Set(layers.attachment), 'every layer must be fixed').toEqual(new Set(['fixed']))
})

test('the export puts the CV, and only the CV, on the paper', async ({ page }) => {
  // The export used to print a hidden iframe, which Firefox refused to do:
  // print() threw and the preview came up empty. It now prints this document
  // with everything but the CV hidden, and this runs in all three engines
  // because that refusal was invisible in Chromium.
  await page.goto('/no/templates')
  await page.locator('button[data-template="fjord"]').click()
  await page.waitForURL(/\/no\/cv\/.+/)
  await page.getByLabel(/Fornavn/).first().fill('Testperson')
  await page.getByRole('button', { name: /Legg til stilling/ }).first().click()
  await page.getByLabel(/Stilling|Rolle/).first().fill('Utvikler')

  // Hold the dialog open, so the page can be inspected mid-print.
  await page.evaluate(() => {
    ;(window as unknown as { __printed: boolean }).__printed = false
    window.print = () => {
      ;(window as unknown as { __printed: boolean }).__printed = true
    }
  })

  await page.getByRole('button', { name: /Last ned/i }).first().click()
  const guest = page.getByRole('button', { name: 'Fortsett som gjest' })
  if (await guest.count()) await guest.click()

  await page.waitForFunction(() => (window as unknown as { __printed: boolean }).__printed, undefined, {
    timeout: 10_000,
  })

  await page.emulateMedia({ media: 'print' })

  const sheet = await page.evaluate(() => {
    const root = document.querySelector('[data-print-root]')
    const cv = root?.querySelector('.cv-doc') as HTMLElement | null
    const rect = cv?.getBoundingClientRect()
    return {
      width: rect ? Math.round(rect.width) : 0,
      display: cv ? getComputedStyle(cv).display : 'missing',
      text: (cv?.textContent ?? '').trim(),
      title: document.title,
      pageLink: document.querySelector('link[href^="/cv/print-"]')?.getAttribute('href') ?? '',
      // Anything else still displayed would be printed alongside the CV.
      othersVisible: [...document.body.children]
        .filter((element) => !element.hasAttribute('data-print-root'))
        .filter((element) => getComputedStyle(element).display !== 'none').length,
    }
  })

  expect(sheet.display, 'the CV is not on the page at print time').not.toBe('missing')
  expect(sheet.display).not.toBe('none')
  // A4 at the app's 96dpi geometry.
  expect(sheet.width).toBe(794)
  expect(sheet.text).toContain('Utvikler')
  expect(sheet.pageLink).toBe('/cv/print-a4.css')
  // The document title is the filename the dialog offers.
  expect(sheet.title).toContain('Testperson')
  expect(sheet.othersVisible, 'the app would print alongside the CV').toBe(0)

  await page.emulateMedia({ media: 'screen' })
})
