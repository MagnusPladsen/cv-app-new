import { expect, test } from '@playwright/test'

/**
 * A link to CVApp used to preview as a bare URL: no title, no description, no
 * image, because the app declared no Open Graph tags at all. For a product
 * people are meant to find and share, that is a feature gap rather than a
 * nicety, and it is invisible from inside the app.
 */

for (const [locale, expected] of [
  ['no', 'lag en CV'],
  ['en', 'build a CV'],
] as const) {
  test(`${locale} declares Open Graph tags for sharing`, async ({ page }) => {
    await page.goto(`/${locale}`)

    const og = async (property: string) =>
      page.locator(`meta[property="og:${property}"]`).getAttribute('content')

    expect(await og('title')).toContain(expected)
    expect(await og('description')).toBeTruthy()
    expect(await og('type')).toBe('website')
    expect(await og('site_name')).toBe('CVApp')
    expect(await og('image')).toContain('opengraph-image')
  })

  test(`${locale} points crawlers at the other language`, async ({ page }) => {
    // Without hreflang the two languages read as duplicate content.
    await page.goto(`/${locale}`)
    const other = locale === 'no' ? 'en' : 'no'

    await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  })
}

test('the share image is served and is the right shape', async ({ request }) => {
  const response = await request.get('/opengraph-image.png')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')

  // 1200x630 is what the major platforms crop to. A wrong aspect ratio is
  // only visible once someone shares the link.
  const bytes = Buffer.from(await response.body())
  expect(bytes.readUInt32BE(16)).toBe(1200)
  expect(bytes.readUInt32BE(20)).toBe(630)
})

test('the sitemap lists the public pages in both languages', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()

  for (const locale of ['no', 'en']) {
    for (const path of ['', '/templates', '/personvern', '/vilkar']) {
      expect(xml, `${locale}${path} missing from the sitemap`).toContain(`/${locale}${path}<`)
    }
  }
  // Per-user and machine routes have nothing to index.
  expect(xml).not.toContain('/account')
  expect(xml).not.toContain('/preview')
})

test('robots allows the site and points at the sitemap', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()

  expect(body).toContain('Allow: /')
  expect(body).toContain('sitemap.xml')
  expect(body).toContain('/no/preview')
})
