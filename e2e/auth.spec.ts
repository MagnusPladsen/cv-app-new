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

test('a failed sign-in says why, instead of a blank apology', async ({ page }) => {
  // The two likeliest causes - a callback URL missing from Supabase's
  // redirect allowlist, and a misconfigured provider - are otherwise
  // indistinguishable from the user changing their mind.
  await page.goto('/auth/callback?error=access_denied&error_description=The+user+denied+access')
  await expect(page).toHaveURL(/auth-code-error/)
  await expect(page.getByText('The user denied access')).toBeVisible()
})

test('the failure reason cannot lay out lines of its own on the page', async ({ page }) => {
  // It arrives on a provider-controlled redirect, so it is untrusted text.
  const hostile = 'a'.repeat(400)
  await page.goto(`/auth/auth-code-error?reason=${hostile}`)
  const shown = await page.locator('main p').last().innerText()
  expect(shown.length).toBeLessThan(200)
})

test('a signed-out download offers sign-in, and guest mode always gets the file', async ({
  page,
}) => {
  // The export suite builds the print HTML directly and never touches the
  // button, so without this the gate between a user and their download has no
  // end-to-end coverage at all.
  await page.addInitScript(() => {
    // Headless Chromium blocks on a real print dialog. The gate is what is
    // under test here; the print pipeline has its own suite.
    window.print = () => {}
  })

  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  const download = page.getByRole('button', { name: 'Last ned PDF' })
  // Named, because the beta notice that follows a download is a dialog too.
  const prompt = page.getByRole('dialog', { name: 'Logg inn for å lagre CV-en' })

  await download.click()
  await expect(prompt).toBeVisible()
  await expect(prompt.getByText(/lagres bare i denne nettleseren/)).toBeVisible()

  await prompt.getByRole('button', { name: 'Fortsett som gjest' }).click()
  await expect(prompt).toBeHidden()

  // The beta notice appears after the file, and its backdrop covers the page.
  await page.getByRole('button', { name: 'Lukk' }).click()

  // Asked once, then remembered: nagging on every download would be worse
  // than never asking.
  await download.click()
  await expect(prompt).toBeHidden()
})

test('the account endpoints refuse a flood', async ({ request }) => {
  // Per-instance and therefore a speed bump rather than a guarantee, but it
  // stops the realistic case: a loop against account deletion from one
  // client. Sign-out is used here because it is the harmless one to hammer.
  const codes: number[] = []
  for (let i = 0; i < 14; i += 1) {
    const response = await request.post('/auth/sign-out', {
      form: { next: '/no' },
      maxRedirects: 0,
    })
    codes.push(response.status())
  }

  expect(codes.filter((code) => code === 429).length).toBeGreaterThan(0)
  expect(codes[0], 'the first request must still work').toBe(303)
})
