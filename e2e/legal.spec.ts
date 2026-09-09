import { expect, test } from '@playwright/test'

/**
 * Art. 13 requires the policy to be provided, which in practice means
 * reachable. A policy that exists but is not linked is the same defect as no
 * policy, and is one layout change away.
 */
for (const locale of ['no', 'en'] as const) {
  test(`the privacy policy is reachable from the landing page in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: /Personvern|Privacy/ })
      .click()

    await expect(page).toHaveURL(new RegExp(`/${locale}/personvern`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test(`the policy names Datatilsynet in ${locale}`, async ({ page }) => {
    // Art. 13(2)(d): the right to complain, and to whom.
    await page.goto(`/${locale}/personvern`)
    await expect(page.getByText(/Datatilsynet/).first()).toBeVisible()
  })

  test(`the policy lists the processors it actually uses in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/personvern`)
    await expect(page.getByRole('cell', { name: 'Supabase' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Vercel' })).toBeVisible()
  })

  test(`the policy does not cite the repealed ekomloven section in ${locale}`, async ({ page }) => {
    // § 2-7b was repealed on 1 January 2025, replaced by § 3-15.
    await page.goto(`/${locale}/personvern`)
    await expect(page.getByText('2-7b')).toHaveCount(0)
  })
}

test('the policy fits a phone, table and all', async ({ page }) => {
  // The processor table is the widest thing on the page and the most likely
  // to push the layout out.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/no/personvern')
  await page.evaluate(() => document.fonts.ready)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('the footer reaches the policy from the editor too', async ({ page }) => {
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Personvern' })).toBeVisible()
})
