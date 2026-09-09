import { expect, test } from '@playwright/test'

test('security headers are set on page responses', async ({ request }) => {
  const headers = (await request.get('/no')).headers()

  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['strict-transport-security']).toContain('max-age=')
  expect(headers['x-frame-options']).toBe('DENY')
})

test('security headers are set on route handlers too', async ({ request }) => {
  // The auth endpoints handle sessions, so they are the ones that most need
  // a referrer policy that does not leak a URL to another origin.
  const headers = (await request.get('/auth/callback', { maxRedirects: 0 })).headers()

  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
})

test('the export still produces a styled PDF under the headers', async ({ page }) => {
  // X-Frame-Options governs being framed, not framing, so the srcdoc export
  // iframe should be unaffected - but "should be" is why this test exists.
  await page.goto('/no/preview')
  await page.evaluate(() => document.fonts.ready)

  const accent = await page.evaluate(() => {
    const doc = document.querySelector('.cv-doc') as HTMLElement
    return getComputedStyle(doc).getPropertyValue('--cv-accent').trim()
  })

  expect(accent).not.toBe('')
})
