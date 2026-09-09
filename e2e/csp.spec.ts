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

test('production never ships the development relaxations', async ({ request }) => {
  // Development allows unsafe-eval, because React uses eval() there to rebuild
  // error stacks, and inline <style> blocks, because hot reload injects them.
  // A build leaking either into production would undo most of what the policy
  // is for, and both are one environment check away from doing so.
  const csp = (await request.get('/no')).headers()['content-security-policy']!

  expect(csp).not.toContain('unsafe-eval')
  expect(csp).toContain("style-src 'self'; style-src-attr 'unsafe-inline'")
  expect(csp, 'style-src must not allow inline blocks in production').not.toMatch(
    /style-src 'self' 'unsafe-inline'/,
  )
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

test('a 404 renders under the CSP, with no violation', async ({ page }) => {
  // Next's built-in not-found page carries an inline <style> block, which
  // style-src 'self' blocks: the page rendered unstyled and logged a
  // violation, and nothing in the suite ever visited a 404 to notice. The
  // app supplies its own not-found page instead of loosening the policy.
  // Note for anyone checking this by hand: `bun run dev` reports violations on
  // every page, because the dev server injects inline styles for hot reload.
  // This suite runs a production build, which is the one that matters.
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
  })

  const response = await page.goto('/no/this-page-does-not-exist')
  expect(response?.status()).toBe(404)

  await expect(page.getByRole('heading', { name: 'Fant ikke siden' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Til forsiden' })).toBeVisible()
  expect(violations, `CSP violations on the 404:\n${violations.join('\n')}`).toEqual([])
})

test('the 404 keeps the site chrome, so it is not a dead end', async ({ page }) => {
  await page.goto('/no/this-page-does-not-exist')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})
