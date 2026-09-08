import { expect, test } from '@playwright/test'

/**
 * Print regression.
 *
 * The exported PDF is the product. These tests build the same document the
 * print pipeline builds — the cloned `.cv-doc` plus the shared stylesheets —
 * and render it through Chromium's real PDF engine.
 */

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

async function printHtmlFor(page: import('@playwright/test').Page, templateId: string) {
  await page.goto('/no/preview')
  await page.evaluate(() => document.fonts.ready)

  return page.evaluate((id) => {
    const node = document.querySelector(`.cv-doc--${id}`)
    if (!node) throw new Error(`no .cv-doc--${id} on the proof sheet`)

    const origin = window.location.origin
    return `<!doctype html><html lang="no"><head><meta charset="utf-8">
<title>Ola_Nordmann_CV</title>
<link rel="stylesheet" href="${origin}/cv/fonts.css">
<link rel="stylesheet" href="${origin}/cv/base.css">
<link rel="stylesheet" href="${origin}/cv/templates/${id}.css">
<style>@page { size: A4; margin: 0; } html, body { margin: 0; padding: 0; background: #fff; }</style>
</head><body>${node.outerHTML}</body></html>`
  }, templateId)
}

test('the printed document is exactly one A4 page wide', async ({ page }) => {
  await page.setContent(await printHtmlFor(page, 'oslo'), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const width = await page.evaluate(
    () => (document.querySelector('.cv-doc') as HTMLElement).offsetWidth,
  )
  expect(width).toBe(A4_WIDTH_PX)
})

test('the exported PDF embeds fonts, so its text is selectable', async ({ page }) => {
  await page.setContent(await printHtmlFor(page, 'oslo'), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  const raw = pdf.toString('latin1')

  // An embedded font object means real glyphs. A rastered CV would carry an
  // image XObject instead, and no ATS could read it.
  expect(raw).toContain('/Font')
  expect(raw).not.toContain('/Subtype /Image')
  expect(pdf.byteLength).toBeGreaterThan(10_000)
})

test('the printed document never overflows the paper width', async ({ page }) => {
  for (const id of ['kompakt', 'fjord', 'studio']) {
    await page.setContent(await printHtmlFor(page, id), { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    const { width, scrollWidth } = await page.evaluate(() => {
      const doc = document.querySelector('.cv-doc') as HTMLElement
      return { width: doc.offsetWidth, scrollWidth: doc.scrollWidth }
    })

    // Horizontal overflow is the one page-geometry failure that silently
    // truncates content in a PDF rather than reflowing it.
    expect(width, `${id} is not A4 wide`).toBe(A4_WIDTH_PX)
    expect(scrollWidth, `${id} overflows the page width`).toBeLessThanOrEqual(width + 1)
  }
})

test('entries are never split across a page break', async ({ page }) => {
  await page.setContent(await printHtmlFor(page, 'bergen'), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const split = await page.evaluate((pageHeight) => {
    const doc = document.querySelector('.cv-doc') as HTMLElement
    // Read the margin off the document: a template may tighten it.
    const marginPx = Number.parseFloat(getComputedStyle(doc).paddingTop)
    const usable = pageHeight - marginPx * 2

    return [...doc.querySelectorAll('.cv-entry')]
      .map((entry) => {
        const top = (entry as HTMLElement).offsetTop - marginPx
        const bottom = top + (entry as HTMLElement).offsetHeight
        return { top, bottom, text: entry.textContent?.slice(0, 40) ?? '' }
      })
      .filter(({ top, bottom }) => Math.floor(top / usable) !== Math.floor((bottom - 1) / usable))
      .map(({ text }) => text)
  }, A4_HEIGHT_PX)

  // break-inside: avoid in base.css is what keeps this empty.
  expect(split).toEqual([])
})
