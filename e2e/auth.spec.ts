import { expect, test } from '@playwright/test'

/**
 * The suite runs with auth switched on but signed out, pointed at an
 * unroutable host (see playwright.config.ts). That is the state worth
 * guarding: accounts must never become a prerequisite for using CVApp, and
 * the header is at its widest with the account link showing.
 *
 * The signed-in half cannot run here - real OAuth needs a Google account and
 * a headful browser - and is covered by the manual checklist in
 * docs/superpowers/plans/2026-09-08-cvapp-accounts-verification.md. Do not
 * read a green run here as "sync works".
 */

test('the dashboard says where the CVs are stored', async ({ page }) => {
  await page.goto('/no/cv')
  await expect(page.getByText('Lagret bare på denne enheten')).toBeVisible()
})

test('signing in is offered, but never required to build a CV', async ({ page }) => {
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await page.getByLabel(/Fornavn/).first().fill('Testperson')
  await expect(page.locator('[data-cv-preview] .cv-doc')).toContainText('Testperson')
})

test('the sign-in page offers exactly the configured providers', async ({ page }) => {
  // The e2e environment declares google,apple, so both buttons must be here
  // and nothing else: a button for a provider that is not switched on in the
  // Supabase dashboard fails after the user has committed to signing in.
  await page.goto('/no/login')
  await expect(page.getByRole('heading', { name: 'Logg inn på CVApp' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Apple/ })).toBeVisible()
  await expect(page.locator('main button')).toHaveCount(2)
})

test('the account page offers sign-in when nobody is signed in', async ({ page }) => {
  await page.goto('/no/account')
  await expect(page.getByRole('heading', { name: 'Kontoen din' })).toBeVisible()
})

test('the auth endpoints are not locale-prefixed', async ({ page }) => {
  // /auth/callback is registered with Google and Apple as one URL. If the
  // proxy matcher ever stops excluding it, it is rewritten to
  // /no/auth/callback and every sign-in breaks.
  const response = await page.goto('/auth/callback')
  expect(page.url()).not.toContain('/no/auth/callback')
  expect(response?.status()).toBeLessThan(500)
})

test('signing out is not reachable by GET', async ({ request }) => {
  // A GET sign-out can be fired by any image tag on any page.
  const response = await request.get('/auth/sign-out', { maxRedirects: 0 })
  expect(response.status()).toBe(405)
})

test('an OAuth redirect cannot be pointed at another site', async ({ request }) => {
  const response = await request.get('/auth/callback?next=https://evil.example', {
    maxRedirects: 0,
  })
  expect(response.headers()['location'] ?? '').not.toContain('evil.example')
})
