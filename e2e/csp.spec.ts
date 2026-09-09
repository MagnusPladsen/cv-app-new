import { expect, test } from '@playwright/test'

/**
 * A strict CSP breaks this app in two ways that produce no error, only a
 * wrong-looking page:
 *
 * 1. The CV's theme tokens are inline style *attributes* (CvDocument renders
 *    `style={style}` carrying every --cv-* property). `style-src` governs
 *    attributes as well as blocks, and no nonce can whitelist an attribute.
 *    Without `style-src-attr 'unsafe-inline'`, every CV loses its colour,
 *    fonts and page geometry - on screen and in the exported PDF.
 *
 * 2. The export is a `srcdoc` iframe, which inherits the embedding page's
 *    policy. Whatever blocks the app blocks the PDF.
 *
 * These tests exist to make both failures loud.
 */

test('the CSP is set', async ({ request }) => {
  const csp = (await request.get('/no')).headers()['content-security-policy']
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("frame-ancestors 'none'")
})

test('the CSP does not strip the CV of its styling', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
  })

  await page.goto('/no/preview')
  await page.evaluate(() => document.fonts.ready)

  const style = await page.evaluate(() => {
    const doc = document.querySelector('.cv-doc') as HTMLElement
    const computed = getComputedStyle(doc)
    return {
      accent: computed.getPropertyValue('--cv-accent').trim(),
      pageWidth: computed.getPropertyValue('--cv-page-width').trim(),
      fontBody: computed.getPropertyValue('--cv-font-body').trim(),
    }
  })

  expect(style.accent, 'the accent token was stripped').not.toBe('')
  expect(style.pageWidth, 'the page geometry token was stripped').not.toBe('')
  expect(style.fontBody, 'the font token was stripped').not.toBe('')
  expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([])
})

test('photos survive the CSP, since they are data: URIs', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
  })

  await page.goto('/no/preview')
  await page.evaluate(() => document.fonts.ready)

  const photo = page.locator('.cv-doc .cv-header__photo').first()
  await expect(photo).toBeVisible()
  expect(violations.filter((line) => /img-src/i.test(line))).toEqual([])
})

test('the page hydrates under the CSP', async ({ page }) => {
  // A blocked framework bootstrap renders a page that looks right and does
  // nothing. Clicking is the only way to tell the difference.
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await expect(page).toHaveURL(/\/no\/cv\/.+/)
})

test('the editor still works under the CSP', async ({ page }) => {
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await page.getByLabel(/Fornavn/).first().fill('Testperson')
  await expect(page.locator('[data-cv-preview] .cv-doc')).toContainText('Testperson')
})
